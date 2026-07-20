from types import SimpleNamespace

from iv3 import definitions as d
from iv3.models import Gemeente, Inwoners, Iv3Summary, Iv3Taakveld

# The CBS verslagsoort code carries the report type in its last three digits. X001-X004
# are the quarterly reports, which the dashboard does not offer.
VERSLAGSOORT_LABELS = {
    "000": "Begroting",
    "005": "Jaarrekening",
}


def available_jaar_verslagsoort() -> dict[int, list[str]]:
    """Every verslagsoort code present per year, e.g. {2026: ["2026X000"], ...}.

    Coverage is uneven: a year only gains its Jaarrekening once the municipalities have
    filed it, so 2026 currently carries the Begroting alone.

    Read off Iv3Summary rather than asking the warehouse what it holds, which is what this
    used to do. Two reasons. It is the honest question — the sidebar is offering years the
    user can *draw*, and Iv3Summary is what the charts read, so anything else can offer a
    year that renders an empty page. And the warehouse is not reachable from production by
    design; see the module note in models.py.

    Uncached deliberately. The old version cached for 900s, but what it was buying was the
    *connection* to the warehouse (~120ms of TCP+TLS+auth), and there is no longer one to
    buy: this is an index-only scan of ~6.4k rows on a connection every request already
    holds. The cache was also a liability — LocMemCache is per-process, so N gunicorn workers
    held N independent TTLs and could disagree about the year list for 15 minutes after a
    data refresh.
    """
    per_jaar: dict[int, list[str]] = {}
    rows = Iv3Summary.objects.values_list("jaar", "verslagsoort").distinct().order_by("jaar", "verslagsoort")
    for jaar, verslagsoort in rows:
        per_jaar.setdefault(jaar, []).append(verslagsoort)
    return per_jaar


def verslagsoort_options(codes: list[str]) -> list[dict]:
    """The codes the dashboard knows how to label, in Begroting-then-Jaarrekening order."""
    options = []
    for code in sorted(codes):
        label = VERSLAGSOORT_LABELS.get(code[-3:])
        if label:
            options.append({"id": code, "label": label})
    return options


def gemeente_options(jaar: int) -> list[dict]:
    """Municipalities that existed in `jaar` — mergers mean this shrinks over time.

    `provincie`, `inwoners` and `inwonergroepen` ride along so the referentiegroep page can
    colour its map by province and narrow it by population without a second request.

    `provincie` is the bare code as a string, matching the id that provincie_options() hands
    out, so the two join directly on the client. It is nullable, as prv_code is; `inwoners`
    is nullable too, since a gemeente can be missing from the inwoners table for a given
    year. `inwonergroepen` is resolved here rather than shipping the size bounds to the
    client — see _inwonergroepen_voor.
    """
    rows = (
        Gemeente.objects.filter(jaar=jaar)
        .order_by("gm_naam")
        .values("gm_code", "gm_naam", "prv_code")
    )
    # Both sides key on the bare code, so a plain dict join lines up — same as
    # sync_iv3_summary does against the same table.
    inwoners = dict(Inwoners.objects.filter(jaar=jaar).values_list("gemeente", "aantal_inwoners"))

    options = []
    for row in rows:
        aantal = inwoners.get(row["gm_code"])
        options.append(
            {
                "id": row["gm_code"],
                "label": row["gm_naam"],
                "provincie": str(row["prv_code"]) if row["prv_code"] is not None else None,
                "inwoners": aantal,
                "inwonergroepen": _inwonergroepen_voor(row["gm_code"], aantal),
            }
        )
    return options


def alle_gemeente_codes(jaar: int) -> list[str]:
    """Every gemeente in `jaar`, by bare code — what the referentiegroep's `alle` resolves to.

    Read off Gemeente, and **not** off Iv3Summary, even though both now sit in this database
    and the summary would answer in one query: the two disagree, on purpose. A gemeente that
    filed nothing has no summary row but is still a gemeente — 2025 has 342 of them against 338
    summary rows — and this group's label counts gemeenten, "Referentiegroep (342)", which is
    what the sidebar says too.

    So the four non-filers must stay in. Dropping them would not merely relabel the group: the
    codes resolved here are measured across every year on the x-axis (see ChartView._referentie),
    so a narrower `alle` silently redraws the referentiegroep's entire history.

    The same list, from the same table, that gemeente_options(jaar) hands the sidebar as its ids.
    That is what the client used to send back verbatim, so resolving it here rather than there
    cannot move a figure.
    """
    return list(Gemeente.objects.filter(jaar=jaar).values_list("gm_code", flat=True))


def _inwonergroepen_voor(gm_code: str, inwoners: int | None) -> list[str]:
    """Every size class a gemeente falls in.

    A list rather than a single id: G4 overlaps "> 100.000" on purpose, so the four big
    cities are in two groups at once. Resolved server-side so the bounds stay here — the
    client filters by group id, exactly as inwonergroep_options() intends.
    """
    row = SimpleNamespace(gm_code=gm_code, inwoners=inwoners)
    return [groep["id"] for groep in d.INWONERGROEPEN if _in_groep(row, groep)]


def provincie_options(jaar: int) -> list[dict]:
    """The provinces that have a municipality in `jaar`, by name.

    Derived from the gemeenten table's prv_code (CBS 20–31) rather than a fixed list, so
    it only ever offers provinces the year actually carries. The id is the bare code as a
    string, e.g. "27" for Noord-Holland.
    """
    codes = (
        Gemeente.objects.filter(jaar=jaar, prv_code__isnull=False)
        .values_list("prv_code", flat=True)
        .distinct()
    )
    options = [
        {"id": str(code), "label": d.PROVINCIE_LABELS[code]}
        for code in codes
        if code in d.PROVINCIE_LABELS
    ]
    return sorted(options, key=lambda option: option["label"])


def inwonergroep_options() -> list[dict]:
    """The population size classes, which are fixed rather than derived per year.

    The bounds themselves stay in the backend: the client only ever selects a group by id,
    and the charts label the lines with what comes back here.
    """
    return [{"id": groep["id"], "label": groep["label"]} for groep in d.INWONERGROEPEN]


# ── Gemeentelijke stand ─────────────────────────────────────────────────────────────
#
# Everything below reads Iv3Summary (the app database), never the warehouse. See
# sync_iv3_summary for how that table is built.

# What each page reads off a summary row, in the parts the pages are built from.
#
# A row is wide — ten JSON columns, ~2KB of them — and no page reads more than three. A year is
# ~342 rows and a chart request walks ten years, so a SELECT * costs ~6.7MB of JSON decoded to
# emit a few hundred numbers. Every year-loop below therefore narrows with .only(), and these are
# the tuples it narrows to.
#
# The rule that makes this safe: a field written or read anywhere in a page's path must be in its
# tuple, or the attribute is deferred and touching it costs one SELECT *per row*. The parts below
# are shared so a page's fields and its _apply_reservemutaties flags cannot drift apart — the
# reserve parts name exactly the columns their fold touches. `id` is not listed: Django adds the
# pk to every .only() and dedupes the rest, so the parts may be splatted freely. `jaar` and
# `verslagsoort` are not listed either: they are filter values, never read off a row.
_VELDEN_BASIS = ("gm_code", "inwoners")
_VELDEN_RESERVE_TOTALEN = ("lasten", "baten", "reserve_lasten", "reserve_baten")
_VELDEN_RESERVE_BATEN_VERDELING = (
    "overige_baten_per_hoofdcategorie",
    "reserve_baten_per_hoofdcategorie",
)
_VELDEN_RESERVE_LASTEN_VERDELING = (
    "lasten_per_taakveld",
    "lasten_per_hoofdtaakveld_categorie",
    "reserve_lasten",
    "reserve_lasten_per_hoofdcategorie",
)

# The cohorts the charts compare. Every selected inwonergroep is a cohort of its own (keyed
# by its group id); the other three appear as below.
#
# Gemeentelijke Stand uses only the inwonergroepen and COHORT_LANDELIJK: the Power BI report
# draws that page's charts with Inwonergroep as their series and nothing else, so it has no
# line for a single gemeente or for the referentiegroep. Begroting and Benchmark do.
COHORT_GEMEENTE = "gemeente"
COHORT_REFERENTIE = "referentie"
COHORT_LANDELIJK = "landelijk"

# Metric -> how to get it out of a bundle of summary rows. Kept as one table so the line
# charts, the API response and the index charts cannot drift apart. `overschot` is not here:
# it is a percentage rather than a euro figure, and is built with _saldo_pct.
LIJN_METRICS = {
    "uitgaven": lambda r: r.lasten,
    "sociaal": lambda r: r.sociaal,
    # "Totale" personeelskosten: payroll plus the staff hired in to do the same work.
    "personeel": lambda r: r.salarissen + r.inhuur,
    "inhuur": lambda r: r.inhuur,
    "verbonden": lambda r: r.verbonden,
    "rijk": lambda r: r.rijk,
    "heffingen": lambda r: r.heffingen,
    "spuks": lambda r: r.spuks,
}

# The two verdeling charts are per_hoofdcategorie and per_hoofdtaakveld — the pair the
# reservemutaties fold deliberately leaves alone — so this page needs neither breakdown, and
# _apply_reservemutaties is called here with neither flag. basis_lasten/basis_baten are set on the
# instance rather than read off a column, so _saldo_pct needs nothing extra.
STAND_VELDEN = (
    *_VELDEN_BASIS,  # _in_groep, _per_inwoner_mean
    *_VELDEN_RESERVE_TOTALEN,  # lasten is also LIJN_METRICS["uitgaven"]; baten feeds basis_baten
    "sociaal", "salarissen", "inhuur", "verbonden", "rijk", "heffingen", "spuks",  # LIJN_METRICS
    "per_hoofdcategorie", "per_hoofdtaakveld",  # _verdeling
)


def _per_inwoner(rows, measure) -> float | None:
    """Population-weighted euro per inhabitant across a cohort.

    Weighted (total euros / total inhabitants), not the mean of each gemeente's own ratio:
    otherwise Vlieland would pull a national average around as hard as Amsterdam.
    """
    inwoners = sum(row.inwoners or 0 for row in rows)
    if not inwoners:
        return None
    bedrag = sum(measure(row) for row in rows)
    return round(bedrag * d.BEDRAG_FACTOR / inwoners, 2)


def _per_inwoner_mean(rows, measure) -> float | None:
    """The mean of each gemeente's own euro per inhabitant, weighting every gemeente
    equally regardless of size.

    This is the Benchmark page's measure ("Avg Bedrag Per Gemeente pi" in the Power BI
    report), not the population-weighted `_per_inwoner`: a referentiegroep there is the
    average of its members' per-inwoner figures, so a large gemeente does not dominate the
    group. One row is one gemeente. A single-gemeente cohort collapses to that gemeente's
    own ratio, identical to the weighted figure.
    """
    ratios = [
        measure(row) * d.BEDRAG_FACTOR / row.inwoners for row in rows if row.inwoners
    ]
    if not ratios:
        return None
    return round(sum(ratios) / len(ratios), 2)


def _bedrag_mean(rows, measure) -> float | None:
    """The mean bedrag per gemeente, in euros ("Avg Bedrag Per Gemeente" in the Power BI
    report).

    The absolute counterpart of `_per_inwoner_mean`: an average over gemeenten rather than a
    sum, so a referentiegroep reads as what a gemeente in that group spends instead of a
    total that grows with the group. One row is one gemeente, and a single-gemeente cohort
    collapses to that gemeente's own amount.
    """
    if not rows:
        return None
    bedrag = sum(measure(row) for row in rows)
    return round(bedrag * d.BEDRAG_FACTOR / len(rows), 2)


def _rebase(waarden: list[float | None]) -> list[float | None]:
    """Index a series to 100 at its first year that carries a figure."""
    basis = next((value for value in waarden if value), None)
    if not basis:
        return [None] * len(waarden)
    return [round(value / basis * 100, 1) if value is not None else None for value in waarden]


def _in_groep(row, groep: dict, exclusief: bool = False) -> bool:
    """Whether a gemeente falls in an inwonergroep — by code for G4, by population size
    for the rest. `min` is inclusive, `max` exclusive.

    `exclusief` makes the groups mutually exclusive by keeping the G4 out of "> 100.000",
    which they would otherwise also satisfy on population. The Gemeentelijke Stand charts
    need that: Power BI draws them from gemeenten[Inwonergroep], a column holding one value
    per gemeente, so a city cannot be in two classes at once. Counting Amsterdam in both
    puts the "> 100.000" line ~EUR 160/inw too high (2018: 4068.70 against the report's
    3911.17). It defaults off because the overlap is deliberate elsewhere — see
    _inwonergroepen_voor, which the referentiegroep page filters by.
    """
    if "gm_codes" in groep:
        return row.gm_code in groep["gm_codes"]
    if exclusief and row.gm_code in d.G4_GM_CODES:
        return False
    if row.inwoners is None:
        return False
    return (groep["min"] is None or row.inwoners >= groep["min"]) and (
        groep["max"] is None or row.inwoners < groep["max"]
    )


def _saldo_pct(rows) -> float | None:
    """A cohort's saldo as a share of everything that flowed through it, in percent.

    The mean of each gemeente's own (baten - lasten) / (baten + lasten), one row one
    gemeente, matching the equal weighting of `_per_inwoner_mean`.

    Reserve-free by construction: it reads the basis_* figures stashed before
    _apply_reservemutaties, because the report's chart carries a visual-level filter
    dropping taakveld 0.10 whatever the Reservemutaties toggle says.

    The report is a live-connection thin file, so the DAX behind "Gemiddeld Overschot of
    Tekort per Inwoner" was not available to copy and this was fitted to the rendered
    chart instead. It tracks the G4 line to within ~0.06pp (2018: -3.37 against -3.43;
    2022: -2.35 against -2.39) — close, but do not expect the second decimal to agree.
    """
    ratios = [
        (row.basis_baten - row.basis_lasten) / (row.basis_baten + row.basis_lasten) * 100
        for row in rows
        if (row.basis_baten + row.basis_lasten)
    ]
    if not ratios:
        return None
    return round(sum(ratios) / len(ratios), 2)


def _apply_reservemutaties(rows, baten_verdeling: bool = False, lasten_verdeling: bool = False):
    """Fold the 0.10 Mutaties reserves taakveld back into the totals.

    The sync keeps it in its own columns precisely so this is a choice made per request.

    The breakdowns move with the totals they describe. `baten` growing by reserve_baten grows
    the Baten pages' residual bron by the same amount — the residual is what is left of baten
    once the heffingen and the rijk are taken out, and neither of those is booked on 0.10 — so
    the Overige inkomsten donut would otherwise draw slices that no longer sum to the figure in
    its centre. The Lasten breakdowns are folded for the same reason, 0.10 being a taakveld of
    hoofdtaakveld 0 like any other.

    per_hoofdtaakveld and per_hoofdcategorie are deliberately left alone: Gemeentelijke Stand
    and Begroting have always drawn them reserve-free, and those pages are not in the business
    of this toggle. The Lasten pages read lasten_per_taakveld instead — which is also why the
    two agree exactly when this is not applied.

    The totals always move; the two breakdowns move only for the pages that draw them, which is
    what the flags are. Gemeentelijke Stand reads neither (its verdeling charts are the two this
    leaves alone), Begroting and the Baten residual read the baten side, and only the Lasten pages
    read the lasten side. Folding a breakdown a page never reads is not merely wasted work — the
    two lasten columns are 70% of every row this table has, and a page that does not fold them
    does not have to load them either. Each flag's columns are named beside it in the _VELDEN
    parts below, and that pairing is what keeps a narrowed queryset from meeting a deferred
    attribute here.
    """
    for row in rows:
        row.lasten += row.reserve_lasten
        row.baten += row.reserve_baten

    if baten_verdeling:
        for row in rows:
            for hoofdcategorie, bedrag in row.reserve_baten_per_hoofdcategorie.items():
                row.overige_baten_per_hoofdcategorie[hoofdcategorie] = (
                    row.overige_baten_per_hoofdcategorie.get(hoofdcategorie, 0.0) + bedrag
                )

    if lasten_verdeling:
        hoofdtaakveld = d.TAAKVELD_RESERVEMUTATIES.split(".")[0]
        for row in rows:
            if row.reserve_lasten:
                row.lasten_per_taakveld[d.TAAKVELD_RESERVEMUTATIES] = (
                    row.lasten_per_taakveld.get(d.TAAKVELD_RESERVEMUTATIES, 0.0)
                    + row.reserve_lasten
                )
            per_categorie = row.lasten_per_hoofdtaakveld_categorie.setdefault(hoofdtaakveld, {})
            for hoofdcategorie, bedrag in row.reserve_lasten_per_hoofdcategorie.items():
                per_categorie[hoofdcategorie] = per_categorie.get(hoofdcategorie, 0.0) + bedrag
    return rows


def gemeentelijke_stand(
    jaar: int,
    verslagsoort: str,
    inwoner: list[str] | None = None,
    gemeenten: list[str] | None = None,
    reserve: bool = False,
) -> dict:
    """Every figure the Gemeentelijke Stand page draws, in one payload.

    The page has fourteen charts; served one endpoint at a time it would fire fourteen
    requests on every flick of a sidebar dropdown.

    `jaar` is the *end* of the range — the lines run from the earliest year that carries
    the same kind of report up to it, and the bar charts show `jaar` itself.

    `inwoner` is a list of inwonergroep ids: each one becomes a line of its own, so the
    charts compare the size classes against each other. With none selected the charts fall
    back to a single line for the country as a whole.

    The charts' series are the size classes and nothing else — the report draws this page
    from Inwonergroep alone, so there is no line for a single gemeente or a referentiegroep.
    `gemeenten` is therefore not a cohort but a narrowing of the population every class is
    measured over, the report's Gemeente slicer: `None` means the country, a list means only
    those municipalities count towards their class's average. Every figure is an equal-weight
    mean across the gemeenten in a class (_per_inwoner_mean, the report's "Avg Bedrag Per
    Gemeente pi"), never a population-weighted pooled ratio.
    """
    suffix = verslagsoort[-3:]
    # In definition order, not selection order — so the legend runs small to large however
    # the user ticked the boxes.
    groepen = [groep for groep in d.INWONERGROEPEN if groep["id"] in (inwoner or [])]

    # A year is only comparable to the others through the same kind of report, so the
    # verslagsoort code is rebuilt per year from the suffix rather than reused verbatim.
    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    per_jaar: dict[int, dict[str, list]] = {}
    for chart_jaar in jaren:
        selectie = Iv3Summary.objects.filter(
            jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}"
        )
        # Narrowed in SQL rather than in Python: a small selection then also loads a few
        # rows instead of the year's ~342, and a row here is ~2KB of JSON.
        if gemeenten:
            selectie = selectie.filter(gm_code__in=gemeenten)
        rows = list(selectie.only(*STAND_VELDEN))
        # Kept aside before the toggle folds 0.10 in, so _saldo_pct can stay reserve-free.
        for row in rows:
            row.basis_lasten = row.lasten
            row.basis_baten = row.baten
        if reserve:
            # Neither breakdown: this page's verdeling charts are per_hoofdcategorie and
            # per_hoofdtaakveld, the two the fold leaves alone.
            _apply_reservemutaties(rows)

        cohorts = {}
        if groepen:
            for groep in groepen:
                cohorts[groep["id"]] = [
                    row for row in rows if _in_groep(row, groep, exclusief=True)
                ]
        else:
            cohorts[COHORT_LANDELIJK] = rows

        per_jaar[chart_jaar] = cohorts

    cohorten = _cohort_labels(jaar, None, [], groepen)
    keys = [cohort["key"] for cohort in cohorten]

    lijnen = {
        metric: [
            {
                "name": str(chart_jaar),
                **{
                    key: _per_inwoner_mean(per_jaar[chart_jaar][key], measure)
                    for key in keys
                },
            }
            for chart_jaar in jaren
        ]
        for metric, measure in LIJN_METRICS.items()
    }

    lijnen["overschot"] = [
        {
            "name": str(chart_jaar),
            **{key: _saldo_pct(per_jaar[chart_jaar][key]) for key in keys},
        }
        for chart_jaar in jaren
    ]

    lijnen["indexUitgaven"] = _index_chart(lijnen["uitgaven"], keys, jaren, d.CPI_PER_JAAR)
    lijnen["indexPersoneel"] = _index_chart(lijnen["personeel"], keys, jaren, d.CAO_LONEN_PER_JAAR)

    snapshot = per_jaar.get(jaar, {})
    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        "cohorten": cohorten,
        "lijnen": lijnen,
        "verdeling": {
            "hoofdcategorie": _verdeling(
                snapshot, cohorten, "per_hoofdcategorie", d.HOOFDCATEGORIE_LABELS,
                meting=_per_inwoner_mean,
            ),
            "hoofdtaakveld": _verdeling(
                snapshot, cohorten, "per_hoofdtaakveld", d.HOOFDTAAKVELD_LABELS,
                meting=_per_inwoner_mean,
            ),
        },
        # The SPUKS bar chart is the snapshot year of the spuks line, one bar per cohort.
        "spuks": [
            {
                "name": cohort["label"],
                "bedrag": _per_inwoner_mean(
                    snapshot.get(cohort["key"], []), LIJN_METRICS["spuks"]
                ),
            }
            for cohort in cohorten
        ],
    }


def _cohort_labels(jaar, gemeente, referentie, groepen, landelijk=True) -> list[dict]:
    """The cohorts that actually have something in them, in drawing order.

    Gemeentelijke Stand passes no gemeente and an empty referentie, leaving only the size
    classes — the shape the Power BI report draws that page in.

    `landelijk=False` leaves the country off: the Begroting pages compare your gemeente with
    its referentiegroep and nothing else, as the report draws them. Callers that keep it rely
    on it being last — see the donut fallbacks in benchmark, baten and lasten.
    """
    cohorten = []

    if gemeente:
        naam = (
            Gemeente.objects.filter(gm_code=gemeente, jaar=jaar)
            .values_list("gm_naam", flat=True)
            .first()
        )
        cohorten.append({"key": COHORT_GEMEENTE, "label": naam or gemeente})

    if referentie:
        cohorten.append(
            {"key": COHORT_REFERENTIE, "label": f"Referentiegroep ({len(referentie)})"}
        )

    if groepen:
        cohorten.extend({"key": groep["id"], "label": groep["label"]} for groep in groepen)
    elif landelijk:
        # With no size class picked the charts still need something to draw: the country.
        cohorten.append({"key": COHORT_LANDELIJK, "label": "Landelijk gemiddelde"})

    return cohorten


def _index_chart(lijn: list[dict], keys: list[str], jaren: list[int], reeks: dict[int, float]):
    """Rebase a euro line to 100 at its first year and lay the CBS index over it."""
    rows = [{"name": str(chart_jaar)} for chart_jaar in jaren]

    for key in keys:
        for row, value in zip(rows, _rebase([punt[key] for punt in lijn])):
            row[key] = value

    for row, value in zip(rows, _rebase([reeks.get(chart_jaar) for chart_jaar in jaren])):
        row["inflatie"] = value

    return rows


def _verdeling(snapshot, cohorten, veld: str, labels: dict[str, str], meting) -> dict:
    """A bedrag broken down into a stacked bar per reeks.

    Euros rather than percentages, whichever way the chart ends up reading: the Begroting
    bars print a euro figure per segment and a total at the end, and Gemeentelijke Stand's
    two draw the same payload as shares of 100% — normalising a stack is the chart's job
    (see ChartContent's `normalize`), and dividing here would only throw the amounts away.

    `meting` picks the measure and is never defaulted, because it is the whole difference
    between a Begroting page drawn per inhabitant and the same page drawn in absolute
    amounts. `cohorten` is whatever sits on the category axis — the cohorts on most pages,
    the two verslagsoorten on a Begroting-versus-Jaarrekening one.
    """
    rijen = []
    for cohort in cohorten:
        rows = snapshot.get(cohort["key"], [])
        rij = {"name": cohort["label"]}
        for code in labels:
            rij[code] = meting(rows, lambda row, code=code: getattr(row, veld).get(code, 0.0))
        rijen.append(rij)

    return {
        "series": [{"key": code, "name": label} for code, label in labels.items()],
        "data": rijen,
    }


# ── Begroting ───────────────────────────────────────────────────────────────────────
#
# The page reads one year from both sides: what comes in, split by where it comes from, and
# what goes out, split by taakveld and by kostensoort. It is drawn three ways, and the report
# draws all three from the same six charts — only the category axis and the measure move:
#
#   overzicht          your gemeente against its referentiegroep, per inhabitant
#   per-inwoner        Begroting against Jaarrekening, per inhabitant
#   absolute-bedragen  Begroting against Jaarrekening, in euros
#
# "Reeks" throughout is whatever sits on that axis: a cohort on the overzicht, a verslagsoort
# on the other two. Everything below the bucketing is written against reeksen and does not
# care which it is drawing.

# Where the money comes from. "overig" is the residual: the summary table stores the three
# sources that can be pinned to a categorie, and everything else is what is left of baten.
# `heffingen` here is the narrow one (no leges) — the Lokale heffingen bar below splits the
# wider `baten_heffingen_per_categorie`, and the two genuinely disagree. See definitions.py.
INKOMSTEN_BRONNEN = {
    "rijk": ("Algemene uitkering", lambda r: r.rijk),
    "spuks": ("Specifieke uitkeringen", lambda r: r.spuks),
    "heffingen": ("Lokale heffingen", lambda r: r.heffingen),
    "overig": ("Overige inkomsten", lambda r: r.baten - r.rijk - r.spuks - r.heffingen),
}

RESULTAAT_POSTEN = {
    "inkomsten": lambda r: r.baten,
    "uitgaven": lambda r: r.lasten,
    "resultaat": lambda r: r.baten - r.lasten,
}

# The two report types as reeksen, in drawing order: what was planned, then what happened.
VERSLAGSOORT_REEKSEN = {
    d.VERSLAGSOORT_BEGROTING: "begroting",
    d.VERSLAGSOORT_JAARREKENING: "jaarrekening",
}

BEGROTING_WEERGAVEN = {
    "overzicht": {"as": "cohort", "meting": _per_inwoner_mean},
    "per-inwoner": {"as": "verslagsoort", "meting": _per_inwoner_mean},
    "absolute-bedragen": {"as": "verslagsoort", "meting": _bedrag_mean},
}

# Not a per-weergave entry in the table above: all three read the same fields, and only `meting`
# tells them apart. The baten side of the reservemutaties fold is here because the overigeInkomsten
# verdeling draws overige_baten_per_hoofdcategorie; no lasten breakdown is read on this page.
BEGROTING_VELDEN = (
    *_VELDEN_BASIS,
    *_VELDEN_RESERVE_TOTALEN,  # RESULTAAT_POSTEN, LIJN_METRICS["uitgaven"]
    *_VELDEN_RESERVE_BATEN_VERDELING,
    "rijk", "spuks", "heffingen",  # INKOMSTEN_BRONNEN — "overig" is baten minus these three
    "per_hoofdtaakveld", "per_hoofdcategorie", "baten_heffingen_per_categorie",  # _verdeling
)


def _selectie_codes(gemeente, referentie) -> list[str] | None:
    """The gm_codes a Begroting-versus-Jaarrekening page measures, or None for every one.

    That page spends its axis on the two report types, so the gemeenten have to come from
    somewhere else: your gemeente if you picked one, otherwise the referentiegroep, otherwise
    every gemeente in the year.

    Note the "otherwise": a gemeente picked alongside a referentiegroep leaves the group out
    entirely. That is what makes this a different question from _cohort_selectie below, which
    needs both at once — here one selection wins outright, so a union would quietly widen the
    page's measure to gemeenten it never drew.

    None means "no narrowing". The fallback really is every gemeente there is, and an IN listing
    all of them would only be a slower way of saying so.
    """
    if gemeente:
        return [gemeente]
    if referentie:
        return list(referentie)
    return None


def _cohort_selectie(gemeente, referentie) -> list[str]:
    """The gemeenten a two-cohort page can possibly draw: yours, and the referentiegroep's.

    Both pages that bucket this way — Begroting's overzicht and the Managementoverzicht — pass
    landelijk=False and draw those two and nothing else, so every other gemeente in the year is a
    row fetched, decoded and dropped. Handed to the SQL for that reason.

    A union rather than a choice: the two are separate buckets, and your gemeente need not be in
    the group you read it against.

    An empty list is a real answer and not "no filter": with nothing picked at all both buckets
    come out empty whatever the year holds, and `gm_code__in=[]` is how a queryset says that
    without asking the database.
    """
    return list(dict.fromkeys([*([gemeente] if gemeente else []), *referentie]))


def _begroting_rows(chart_jaar: int, suffix: str, reserve: bool, codes=None) -> list:
    """One year of one report type. A year is only comparable to the others through the same
    kind of report, so the verslagsoort code is rebuilt per year rather than reused verbatim.

    `codes` narrows to the gemeenten the caller will actually bucket; None keeps the year whole.
    """
    rows = Iv3Summary.objects.filter(jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}")
    if codes is not None:
        rows = rows.filter(gm_code__in=codes)
    rows = list(rows.only(*BEGROTING_VELDEN))
    if reserve:
        # The baten side only: this page draws overige_baten_per_hoofdcategorie, and none of the
        # lasten breakdowns.
        _apply_reservemutaties(rows, baten_verdeling=True)
    return rows


def _begroting_per_cohort(jaar, suffix, gemeente, referentie, reserve):
    """The overzicht: one report type, bucketed into your gemeente and its referentiegroep.

    No landelijk bucket — the report compares those two and nothing else, and with the
    referentiegroep defaulting to every gemeente it would only draw the same line twice.
    """
    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    codes = _cohort_selectie(gemeente, referentie)
    per_jaar = {}
    for chart_jaar in jaren:
        rows = _begroting_rows(chart_jaar, suffix, reserve, codes)
        per_jaar[chart_jaar] = {
            COHORT_GEMEENTE: [row for row in rows if row.gm_code == gemeente],
            COHORT_REFERENTIE: [row for row in rows if row.gm_code in referentie],
        }

    reeksen = _cohort_labels(jaar, gemeente, referentie, groepen=[], landelijk=False)
    return jaren, per_jaar, reeksen, reeksen


def _begroting_per_verslagsoort(jaar, gemeente, referentie, reserve):
    """A comparison page: the same selection of gemeenten, read from both report types.

    The two are kept in separate buckets and never summed — they are the same money counted
    twice over (see Iv3Summary).

    Returns two reeks lists, because the newest years carry a Begroting but no Jaarrekening
    yet: the line keeps both series so its history survives, while the snapshot charts show
    only what the selected year actually has.
    """
    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar).values_list("jaar", flat=True).distinct()
    )

    # The rows *are* the selection: what this page measures is decided in the WHERE rather than
    # by fetching a year and dropping most of it. At jaar=2026 that is ~6,700 rows read to keep
    # twenty of them.
    codes = _selectie_codes(gemeente, referentie)
    per_jaar = {}
    for chart_jaar in jaren:
        per_jaar[chart_jaar] = {
            key: _begroting_rows(chart_jaar, suffix, reserve, codes)
            for suffix, key in VERSLAGSOORT_REEKSEN.items()
        }

    def _reeksen(over: list[int]) -> list[dict]:
        return [
            {"key": key, "label": VERSLAGSOORT_LABELS[suffix]}
            for suffix, key in VERSLAGSOORT_REEKSEN.items()
            if any(per_jaar[chart_jaar][key] for chart_jaar in over)
        ]

    return jaren, per_jaar, _reeksen(jaren), _reeksen([jaar] if jaar in per_jaar else [])


def begroting(
    jaar: int,
    verslagsoort: str,
    gemeente: str | None = None,
    referentie: list[str] | None = None,
    reserve: bool = False,
    weergave: str = "overzicht",
) -> dict:
    """The Begroting page, in one payload.

    `jaar` is the *end* of the range: the uitgaven line runs from the earliest year up to it,
    and everything else shows `jaar` itself. `weergave` picks both the category axis and the
    measure — see BEGROTING_WEERGAVEN.
    """
    pagina = BEGROTING_WEERGAVEN[weergave]
    meting = pagina["meting"]
    referentie = referentie or []

    if pagina["as"] == "verslagsoort":
        jaren, per_jaar, lijn_reeksen, reeksen = _begroting_per_verslagsoort(
            jaar, gemeente, referentie, reserve
        )
    else:
        jaren, per_jaar, lijn_reeksen, reeksen = _begroting_per_cohort(
            jaar, verslagsoort[-3:], gemeente, referentie, reserve
        )

    snapshot = per_jaar.get(jaar, {})

    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        # The series on the uitgaven line. On a comparison page these are the report types
        # rather than cohorts, and they outlive the snapshot: 2025 has a Begroting only, but
        # the line still draws the Jaarrekening it has for the years before it.
        "cohorten": lijn_reeksen,
        # Inkomsten, uitgaven and the saldo between them, one row per reeks.
        "resultaat": [
            {
                "key": reeks["key"],
                "label": reeks["label"],
                **{
                    post: meting(snapshot.get(reeks["key"], []), measure)
                    for post, measure in RESULTAAT_POSTEN.items()
                },
            }
            for reeks in reeksen
        ],
        "uitgavenPerJaar": [
            {
                "name": str(chart_jaar),
                **{
                    reeks["key"]: meting(
                        per_jaar[chart_jaar][reeks["key"]], LIJN_METRICS["uitgaven"]
                    )
                    for reeks in lijn_reeksen
                },
            }
            for chart_jaar in jaren
        ],
        "inkomsten": {
            "series": [{"key": key, "name": label} for key, (label, _) in INKOMSTEN_BRONNEN.items()],
            "data": [
                {
                    "name": reeks["label"],
                    **{
                        key: meting(snapshot.get(reeks["key"], []), measure)
                        for key, (_, measure) in INKOMSTEN_BRONNEN.items()
                    },
                }
                for reeks in reeksen
            ],
        },
        "verdeling": {
            "hoofdtaakveld": _verdeling(
                snapshot, reeksen, "per_hoofdtaakveld", d.HOOFDTAAKVELD_LABELS, meting
            ),
            "hoofdcategorie": _verdeling(
                snapshot, reeksen, "per_hoofdcategorie", d.HOOFDCATEGORIE_LABELS, meting
            ),
            # The report splits these two by a grouping column the warehouse does not carry
            # (OZB against riolering, huren against grond); these are the coarser cut the
            # Baten pages settled on for the same reason — right, but named differently.
            "heffingen": _verdeling(
                snapshot, reeksen, "baten_heffingen_per_categorie", d.BATEN_HEFFINGEN_LABELS, meting
            ),
            "overigeInkomsten": _verdeling(
                snapshot,
                reeksen,
                "overige_baten_per_hoofdcategorie",
                d.BATEN_OVERIG_HOOFDCATEGORIE_LABELS,
                meting,
            ),
        },
    }


# ── Benchmark ───────────────────────────────────────────────────────────────────────
#
# The whole page is one figure — personele lasten per inwoner — cut four ways: over time,
# per gemeente in the referentiegroep, split into its two categorieën, and spread over the
# taakvelden. "Personeel" is payroll plus the staff hired in to do the same work.

PERSONEEL_CATEGORIEEN = {
    "salarissen": lambda row: row.salarissen,
    "inhuur": lambda row: row.inhuur,
}

# The narrowest of the six: one JSON column. No reserve part, because benchmark() takes no
# `reserve` — the page is about personele lasten, which are never booked on 0.10.
BENCHMARK_VELDEN = (
    *_VELDEN_BASIS,
    "salarissen", "inhuur",  # _personeel, PERSONEEL_CATEGORIEEN
    "personeel_per_hoofdtaakveld",  # _taakveld_donut
)


def _personeel(row) -> float:
    return row.salarissen + row.inhuur


def benchmark(
    jaar: int,
    verslagsoort: str,
    gemeente: str | None = None,
    referentie: list[str] | None = None,
) -> dict:
    """The Benchmark page: your gemeente's personele lasten against its referentiegroep.

    Landelijk is always drawn as a third cohort, so the page still says something before
    anything has been picked in the sidebar — and so a referentiegroep can be read against
    the country as well as against your own gemeente.
    """
    suffix = verslagsoort[-3:]
    referentie = referentie or []

    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    per_jaar: dict[int, dict[str, list]] = {}
    for chart_jaar in jaren:
        # A gemeente with no personele lasten at all is blank in the report's measure, not a
        # zero: Power BI's average is over VALUES(Gemeente), which such a gemeente never
        # enters, so it must not count towards the mean either. A gemeente that merely has no
        # lasten on one taakveld does stay in the cohort (it is a 0 there, kept in the
        # denominator), which is why the donut segments still sum to the centre figure.
        rows = [
            row
            for row in Iv3Summary.objects.filter(
                jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}"
            ).only(*BENCHMARK_VELDEN)
            if _personeel(row) > 0
        ]
        per_jaar[chart_jaar] = {
            COHORT_GEMEENTE: [row for row in rows if row.gm_code == gemeente],
            COHORT_REFERENTIE: [row for row in rows if row.gm_code in referentie],
            COHORT_LANDELIJK: rows,
        }

    cohorten = _cohort_labels(jaar, gemeente, referentie, groepen=[])
    snapshot = per_jaar.get(jaar, {})

    # The donut pair compares your gemeente against its referentiegroep; whichever of the
    # two has not been picked falls back to the country, so there is always something to
    # compare against.
    links = next((c for c in cohorten if c["key"] == COHORT_GEMEENTE), None)
    rechts = next((c for c in cohorten if c["key"] == COHORT_REFERENTIE), None)
    landelijk = cohorten[-1]

    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        "cohorten": cohorten,
        # Personele lasten per inwoner per jaar, a line per cohort.
        "trend": [
            {
                "name": str(chart_jaar),
                **{
                    cohort["key"]: _per_inwoner_mean(per_jaar[chart_jaar][cohort["key"]], _personeel)
                    for cohort in cohorten
                },
            }
            for chart_jaar in jaren
        ],
        # The same figure in the snapshot year, split into the two categorieën it is made
        # of — one stacked bar per cohort.
        "categorie": [_categorie_bar(cohort["label"], snapshot.get(cohort["key"], [])) for cohort in cohorten],
        # And once more per gemeente in the referentiegroep, so an outlier inside the group
        # is visible rather than averaged away. Heaviest first.
        "referentiegroep": _referentiegroep_bars(jaar, snapshot.get(COHORT_REFERENTIE, [])),
        "taakvelden": {
            "series": [{"key": code, "name": label} for code, label in d.HOOFDTAAKVELD_LABELS.items()],
            "links": _taakveld_donut(links or landelijk, snapshot),
            "rechts": _taakveld_donut(rechts or landelijk, snapshot),
        },
    }


def _categorie_bar(label: str, rows) -> dict:
    return {
        "name": label,
        **{key: _per_inwoner_mean(rows, measure) for key, measure in PERSONEEL_CATEGORIEEN.items()},
    }


def _referentiegroep_bars(jaar: int, rows) -> list[dict]:
    """One stacked bar per gemeente in the referentiegroep, heaviest first."""
    namen = dict(
        Gemeente.objects.filter(jaar=jaar, gm_code__in=[row.gm_code for row in rows]).values_list(
            "gm_code", "gm_naam"
        )
    )
    bars = [_categorie_bar(namen.get(row.gm_code, row.gm_code), [row]) for row in rows]
    return sorted(bars, key=lambda bar: -sum(bar[key] or 0 for key in PERSONEEL_CATEGORIEEN))


def _taakveld_donut(cohort: dict, snapshot: dict) -> dict:
    """One side of the donut pair: personele lasten per inwoner, split over the taakvelden."""
    rows = snapshot.get(cohort["key"], [])
    waarden = {
        code: _per_inwoner_mean(
            rows, lambda row, code=code: row.personeel_per_hoofdtaakveld.get(code, 0.0)
        )
        for code in d.HOOFDTAAKVELD_LABELS
    }
    return {
        "label": cohort["label"],
        "totaal": _per_inwoner_mean(rows, _personeel),
        "waarden": waarden,
    }


# ── Baten ───────────────────────────────────────────────────────────────────────────
#
# Four pages off one shape: baten per inwoner, your gemeente against its referentiegroep,
# drawn as a trend line, a bar per gemeente in the group, and a donut pair splitting the
# figure into where the money came from. They differ only in which slice of the baten they
# are about and what they split it by — that is BATEN_PAGINAS, and `bron` picks the page.
#
# The report filters all four to categorie "Baat" and drops the balanspost taakvelden. The
# sync has already done both (BALANSPOST_PREFIXES, and the B/L prefix on the categorie), so
# nothing here repeats it.


def _baten_heffingen(row) -> float:
    """Lokale heffingen as the Baten pages count them: B2.2.1 + B2.2.2 + B3.7.

    Deliberately not row.heffingen, which leaves the leges out — see
    CATEGORIEEN_BATEN_LOKALE_HEFFINGEN for why the two disagree.
    """
    return sum(row.baten_heffingen_per_categorie.values())


def _overige_baten(row) -> float:
    """What is left of baten once the two named bronnen are taken out.

    A residual rather than a column of its own, exactly as INKOMSTEN_BRONNEN does it: the
    sync guarantees the three parts partition baten, so this cannot drift from the total the
    donut prints in its centre.
    """
    return row.baten - row.rijk - row.spuks - _baten_heffingen(row)


def _bron_waarden(row) -> dict[str, float]:
    """The main page's four slices, keyed as BATEN_BRON_LABELS.

    The report draws these from `Inkomsten per bron` crossed with the taakveld, which is what
    splits the rijk into the algemene uitkering (0.7) and the SPUKs. Both already have a
    column, so the cross is just the two of them side by side.
    """
    return {
        "rijk": row.rijk,
        "spuks": row.spuks,
        "heffingen": _baten_heffingen(row),
        "overig": _overige_baten(row),
    }


# What each page is about: the figure in the centre of its donut, and how that figure is cut
# into slices. `waarden` hands back one dict per row, keyed by the codes in `labels`.
#
# The three detail pages split by a dimension the report holds in a grouping column
# (taakvelden[Lokale heffingen], categorieen[Overige inkomsten]). Those columns were not in
# the file to copy, so each page splits by the coarser dimension its own bar chart already
# names — categorie for the heffingen, hoofdtaakveld for the SPUKs, hoofdcategorie for the
# rest. The slices are therefore right but named differently from the report's.
#
# `baten_verdeling` says whether the reservemutaties toggle has to fold the Overige inkomsten
# breakdown for this page, and `velden` is what the page reads off a row. The two travel together
# on purpose: fold a breakdown whose column the page did not load and the `+=` lands on a deferred
# attribute, which is one SELECT per row. See _apply_reservemutaties.
BATEN_PAGINAS = {
    "alle": {
        "totaal": lambda row: row.baten,
        "waarden": _bron_waarden,
        "labels": d.BATEN_BRON_LABELS,
        # The residual is computed off baten and the three named bronnen, so the toggle reaches
        # this page through `baten` alone — the Overige inkomsten *breakdown* is never read here.
        "baten_verdeling": False,
        "velden": (*_VELDEN_BASIS, *_VELDEN_RESERVE_TOTALEN,
                   "rijk", "spuks", "baten_heffingen_per_categorie"),
    },
    # The *Baten overige rijk* page, whose figure is the SPUKs rather than the rijk as a
    # whole: the report gets there by filtering Inkomsten per bron to 'Rijk' and then dropping
    # taakveld 0.7, which leaves the algemene uitkering out. Named for the page, not the
    # column — the URL slug is /baten/overige-baten-rijk.
    "rijk": {
        "totaal": lambda row: row.spuks,
        "waarden": lambda row: row.spuks_per_hoofdtaakveld,
        "labels": d.HOOFDTAAKVELD_LABELS,
        # Nothing this page draws is booked on 0.10: the toggle moves baten, and this draws the
        # SPUKs. The totals fold anyway — four float columns, and a page that read a total it had
        # not folded would be a wrong figure rather than a slow one.
        "baten_verdeling": False,
        "velden": (*_VELDEN_BASIS, *_VELDEN_RESERVE_TOTALEN, "spuks", "spuks_per_hoofdtaakveld"),
    },
    "heffingen": {
        "totaal": _baten_heffingen,
        "waarden": lambda row: row.baten_heffingen_per_categorie,
        "labels": d.BATEN_HEFFINGEN_LABELS,
        "baten_verdeling": False,
        "velden": (*_VELDEN_BASIS, *_VELDEN_RESERVE_TOTALEN, "baten_heffingen_per_categorie"),
    },
    "overig": {
        "totaal": _overige_baten,
        "waarden": lambda row: row.overige_baten_per_hoofdcategorie,
        # Without the salarissen, which cannot be a baat — see the constant.
        "labels": d.BATEN_OVERIG_HOOFDCATEGORIE_LABELS,
        # The one Baten page that reads a breakdown the toggle moves: reserve_baten lands in the
        # residual, which is this page's whole subject.
        "baten_verdeling": True,
        "velden": (*_VELDEN_BASIS, *_VELDEN_RESERVE_TOTALEN, *_VELDEN_RESERVE_BATEN_VERDELING,
                   "rijk", "spuks", "baten_heffingen_per_categorie"),
    },
}


def baten(
    jaar: int,
    verslagsoort: str,
    bron: str = "alle",
    gemeente: str | None = None,
    referentie: list[str] | None = None,
    reserve: bool = False,
) -> dict:
    """One of the four Baten pages: where a gemeente's income comes from, against its group.

    `bron` picks the page out of BATEN_PAGINAS. `jaar` is the *end* of the range — the trend
    runs from the earliest year carrying the same kind of report up to it, and the donuts and
    bars show `jaar` itself.

    Landelijk is always drawn as a third cohort, so the page says something before anything
    has been picked in the sidebar, and either donut falls back to it.

    Every figure is the report's "Avg Bedrag Per Gemeente pi": an equal-weight mean over the
    gemeenten in a cohort (_per_inwoner_mean), never a population-weighted pooled ratio.
    """
    pagina = BATEN_PAGINAS[bron]
    totaal = pagina["totaal"]
    suffix = verslagsoort[-3:]
    referentie = referentie or []

    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    per_jaar: dict[int, dict[str, list]] = {}
    for chart_jaar in jaren:
        rows = list(
            Iv3Summary.objects.filter(
                jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}"
            ).only(*pagina["velden"])
        )
        # Before the zero filter: the toggle can move a gemeente's residual off zero.
        if reserve:
            _apply_reservemutaties(rows, baten_verdeling=pagina["baten_verdeling"])

        # A gemeente with nothing at all under this bron is blank in the report's measure,
        # not a zero — Power BI averages over VALUES(Gemeente), which such a gemeente never
        # enters, so it must not count towards the mean either. Mirrors the same rule on the
        # Benchmark page; INFERRED there and still inferred here.
        #
        # `!= 0` rather than Benchmark's `> 0`: the residual bron can legitimately come out
        # negative on a correction, and dropping those gemeenten would quietly pull the mean
        # up. For personele lasten the two tests coincide, so this is a divergence in letter
        # only. A gemeente that merely has nothing on one *slice* stays in as a 0 there,
        # which is what keeps the slices summing to the centre.
        rows = [row for row in rows if totaal(row) != 0]

        per_jaar[chart_jaar] = {
            COHORT_GEMEENTE: [row for row in rows if row.gm_code == gemeente],
            COHORT_REFERENTIE: [row for row in rows if row.gm_code in referentie],
            COHORT_LANDELIJK: rows,
        }

    cohorten = _cohort_labels(jaar, gemeente, referentie, groepen=[])
    snapshot = per_jaar.get(jaar, {})

    links = next((c for c in cohorten if c["key"] == COHORT_GEMEENTE), None)
    rechts = next((c for c in cohorten if c["key"] == COHORT_REFERENTIE), None)
    landelijk = cohorten[-1]

    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        "bron": bron,
        "cohorten": cohorten,
        "trend": [
            {
                "name": str(chart_jaar),
                **{
                    cohort["key"]: _per_inwoner_mean(per_jaar[chart_jaar][cohort["key"]], totaal)
                    for cohort in cohorten
                },
            }
            for chart_jaar in jaren
        ],
        # Once more per gemeente in the referentiegroep, so an outlier inside the group is
        # visible rather than averaged away.
        "referentiegroep": _referentiegroep_bedragen(
            jaar, snapshot.get(COHORT_REFERENTIE, []), totaal
        ),
        "verdeling": {
            "series": [{"key": code, "name": label} for code, label in pagina["labels"].items()],
            "links": _donut_zijde(links or landelijk, snapshot, pagina),
            "rechts": _donut_zijde(rechts or landelijk, snapshot, pagina),
        },
    }


def _referentiegroep_bedragen(jaar: int, rows, totaal) -> list[dict]:
    """One bar per gemeente in the referentiegroep, heaviest first."""
    namen = dict(
        Gemeente.objects.filter(
            jaar=jaar, gm_code__in=[row.gm_code for row in rows]
        ).values_list("gm_code", "gm_naam")
    )
    # One row is one gemeente, so the cohort mean collapses to that gemeente's own ratio.
    bars = [
        {"name": namen.get(row.gm_code, row.gm_code), "waarde": _per_inwoner_mean([row], totaal)}
        for row in rows
    ]
    return sorted(bars, key=lambda bar: -(bar["waarde"] or 0))


def _donut_zijde(cohort: dict, snapshot: dict, pagina: dict) -> dict:
    """One side of the donut pair: the page's figure per inwoner, split into its slices.

    Shared by the Baten and Lasten pages, which both draw this. `pagina` is how they say what
    the page is about — `totaal(row)` for the centre, `waarden(row)` for a dict of slices, and
    `labels` for the slices to take out of it, in the order they are drawn.
    """
    rows = snapshot.get(cohort["key"], [])
    waarden = pagina["waarden"]
    return {
        "label": cohort["label"],
        "totaal": _per_inwoner_mean(rows, pagina["totaal"]),
        "waarden": {
            code: _per_inwoner_mean(rows, lambda row, code=code: waarden(row).get(code, 0.0))
            for code in pagina["labels"]
        },
    }


# ── Lasten ──────────────────────────────────────────────────────────────────────────
#
# Ten pages off one shape, the same one the Baten pages use plus a bar for the kostensoorten:
# the overview splits the lasten over the nine hoofdtaakvelden, and each detail page splits one
# hoofdtaakveld over the taakvelden inside it. `taakveld` picks which — "alle", or "0".."8".
#
# Everything reads lasten_per_taakveld rather than per_hoofdtaakveld. The two hold the same
# figures (rolled up, the first *is* the second — which is worth checking), but only the first
# carries the reservemutaties toggle; see _apply_reservemutaties.

LASTEN_OVERZICHT = "alle"

# One tuple for all ten pages rather than a table of them: the overview rolls lasten_per_taakveld
# up and the detail pages split it, but both read the same two columns, and a table whose rows are
# all the same value says less than a constant. The two lasten breakdowns are 70% of every row
# this table has, so this is the page .only() helps least — see the two-tier note in lasten().
LASTEN_VELDEN = (
    *_VELDEN_BASIS,
    *_VELDEN_RESERVE_TOTALEN,  # the overview's totaal is row.lasten
    *_VELDEN_RESERVE_LASTEN_VERDELING,  # _lasten_per_hoofdtaakveld, _lasten_categorieen, the donut
)


def _lasten_per_hoofdtaakveld(row) -> dict[str, float]:
    """lasten_per_taakveld rolled up to the hoofdtaakveld — the overview donut's slices."""
    waarden: dict[str, float] = {}
    for code, bedrag in row.lasten_per_taakveld.items():
        hoofd = code.split(".")[0]
        waarden[hoofd] = waarden.get(hoofd, 0.0) + bedrag
    return waarden


def _lasten_categorieen(row, hoofdtaakveld: str | None) -> dict[str, float]:
    """Lasten per hoofdcategorie, for one hoofdtaakveld or across all of them."""
    if hoofdtaakveld is not None:
        return row.lasten_per_hoofdtaakveld_categorie.get(hoofdtaakveld, {})

    waarden: dict[str, float] = {}
    for categorieen in row.lasten_per_hoofdtaakveld_categorie.values():
        for code, bedrag in categorieen.items():
            waarden[code] = waarden.get(code, 0.0) + bedrag
    return waarden


def lasten(
    jaar: int,
    verslagsoort: str,
    taakveld: str = LASTEN_OVERZICHT,
    gemeente: str | None = None,
    referentie: list[str] | None = None,
    reserve: bool = False,
) -> dict:
    """One of the ten Lasten pages: what a gemeente spends, against its referentiegroep.

    `taakveld` is "alle" for the overview or a hoofdtaakveld code ("0".."8") for a detail page.
    `jaar` is the *end* of the range — the trend runs from the earliest year carrying the same
    kind of report up to it, everything else shows `jaar` itself.

    Every figure is the report's "Avg Bedrag Per Gemeente pi": an equal-weight mean over the
    gemeenten in a cohort (_per_inwoner_mean), never a population-weighted pooled ratio.
    """
    overzicht = taakveld == LASTEN_OVERZICHT
    hoofdtaakveld = None if overzicht else taakveld

    # The centre of the donut, and the figure the trend and the bars draw. On a detail page it
    # is that hoofdtaakveld's share of the lasten; on the overview, all of them.
    def totaal(row) -> float:
        if overzicht:
            return row.lasten
        return sum(_lasten_categorieen(row, hoofdtaakveld).values())

    suffix = verslagsoort[-3:]
    referentie = referentie or []

    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    per_jaar: dict[int, dict[str, list]] = {}
    for chart_jaar in jaren:
        rows = list(
            Iv3Summary.objects.filter(
                jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}"
            ).only(*LASTEN_VELDEN)
        )
        # Before the zero filter: the toggle can move a gemeente's lasten off zero.
        if reserve:
            _apply_reservemutaties(rows, lasten_verdeling=True)

        # A gemeente with nothing at all on this taakveld is blank in the report's measure, not
        # a zero — the same rule, and the same inference, as on the Baten and Benchmark pages.
        rows = [row for row in rows if totaal(row) != 0]

        per_jaar[chart_jaar] = {
            COHORT_GEMEENTE: [row for row in rows if row.gm_code == gemeente],
            COHORT_REFERENTIE: [row for row in rows if row.gm_code in referentie],
            COHORT_LANDELIJK: rows,
        }

    cohorten = _cohort_labels(jaar, gemeente, referentie, groepen=[])
    snapshot = per_jaar.get(jaar, {})

    links = next((c for c in cohorten if c["key"] == COHORT_GEMEENTE), None)
    rechts = next((c for c in cohorten if c["key"] == COHORT_REFERENTIE), None)
    landelijk = cohorten[-1]

    labels = (
        d.HOOFDTAAKVELD_LABELS
        if overzicht
        else _lasten_donut_labels(jaar, hoofdtaakveld, reserve)
    )
    waarden = (
        _lasten_per_hoofdtaakveld
        if overzicht
        else (lambda row: row.lasten_per_taakveld)
    )
    pagina = {"totaal": totaal, "waarden": waarden, "labels": labels}

    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        "taakveld": taakveld,
        "cohorten": cohorten,
        "trend": [
            {
                "name": str(chart_jaar),
                **{
                    cohort["key"]: _per_inwoner_mean(per_jaar[chart_jaar][cohort["key"]], totaal)
                    for cohort in cohorten
                },
            }
            for chart_jaar in jaren
        ],
        "referentiegroep": _referentiegroep_bedragen(
            jaar, snapshot.get(COHORT_REFERENTIE, []), totaal
        ),
        # The donut pair: where the money went, your gemeente against its group.
        "verdeling": {
            "series": [{"key": code, "name": label} for code, label in labels.items()],
            "links": _donut_zijde(links or landelijk, snapshot, pagina),
            "rechts": _donut_zijde(rechts or landelijk, snapshot, pagina),
        },
        # And the same money by kostensoort — one bar per cohort, stacked by hoofdcategorie.
        # The report splits this by a grouping column of its own that the thin file does not
        # carry; the hoofdcategorie is what its overview page demonstrably uses, so it stands in
        # on the detail pages too.
        "categorie": {
            "series": [
                {"key": code, "name": label} for code, label in d.HOOFDCATEGORIE_LABELS.items()
            ],
            "data": [
                {
                    # The cohort key rides along so the client can drop a bar without having to
                    # recognise it by its label, which is a gemeente's name.
                    "key": cohort["key"],
                    "name": cohort["label"],
                    **{
                        code: _per_inwoner_mean(
                            snapshot.get(cohort["key"], []),
                            lambda row, code=code: _lasten_categorieen(row, hoofdtaakveld).get(
                                code, 0.0
                            ),
                        )
                        for code in d.HOOFDCATEGORIE_LABELS
                    },
                }
                for cohort in cohorten
            ],
        },
    }


def _lasten_donut_labels(jaar: int, hoofdtaakveld: str, reserve: bool) -> dict[str, str]:
    """The taakvelden inside one hoofdtaakveld, named as `jaar` names them.

    Read from Iv3Taakveld, which sync_iv3_summary lifts out of the warehouse rather than this
    module holding ~59 names of its own. Per year, because the code space moves: 2024 books the
    jeugdhulp on 6.72a..d and 2026 on 6.751..753, and 6.4 changed its name outright.

    The reservemutaties taakveld is only a slice when the toggle has folded it in; drawn with
    the toggle off it would be a permanent zero in the legend of Bestuur en ondersteuning.
    """
    codes = Iv3Taakveld.objects.filter(jaar=jaar, code__startswith=f"{hoofdtaakveld}.")
    if not reserve:
        codes = codes.exclude(code=d.TAAKVELD_RESERVEMUTATIES)
    return {taakveld.code: f"{taakveld.code} {taakveld.titel}" for taakveld in codes}


# ── Managementoverzicht ─────────────────────────────────────────────────────────────
#
# Six questions on one page, each its own card: a line per year of your gemeente against its
# referentiegroep. Five are a euro figure per inwoner and read like every other page's trend;
# the sixth is the solvabiliteit, which is a percentage off the balance sheet and is drawn by
# rules of its own — see _solvabiliteit_pct and the pinning in managementoverzicht().

MANAGEMENT_LIJNEN = {
    # Total lasten — deliberately the same measure on the same cohort as Begroting's
    # uitgavenPerJaar, so the two pages agree to the cent.
    "uitgaven": lambda row: row.lasten,
    # The *wide* heffingen, leges included: the card names 2.2.1, 2.2.2 and 3.7 outright. Not
    # row.heffingen, which is the narrow pair Gemeentelijke Stand draws — the two disagree by
    # design, see CATEGORIEEN_BATEN_LOKALE_HEFFINGEN.
    "belastingdruk": _baten_heffingen,
    # Payroll and hired-in staff with the overhead taken out, and then the overhead on its own.
    # The three partition the personele lasten exactly: (L1.1 off 0.4) + (L3.5.1 off 0.4) +
    # (both on 0.4) == salarissen + inhuur, which is what the Benchmark page draws.
    #
    # These can come out negative for a handful of gemeenten, and that is the data rather than
    # a bug: a correction booked against a non-overhead taakveld can leave the categorie's total
    # below what sits on 0.4 alone (10 rows of 6398, e.g. GM1903's 2019 Jaarrekening).
    "salarissen": lambda row: row.salarissen - row.salarissen_overhead,
    "inhuur": lambda row: row.inhuur - row.inhuur_overhead,
    "overhead": lambda row: row.salarissen_overhead + row.inhuur_overhead,
}

# One JSON column for six lines. The balans pair rides along because the solvabiliteit reads it
# off these same rows whenever the page is already drawn from a Jaarrekening — see
# managementoverzicht(). This page reads no breakdown the toggle moves, so it folds neither.
MANAGEMENT_VELDEN = (
    *_VELDEN_BASIS,
    *_VELDEN_RESERVE_TOTALEN,  # MANAGEMENT_LIJNEN["uitgaven"]
    "salarissen", "salarissen_overhead", "inhuur", "inhuur_overhead",
    "baten_heffingen_per_categorie",  # _baten_heffingen — the *wide* heffingen
    "eigen_vermogen", "balanstotaal",  # _solvabiliteit_pct
)

# The solvabiliteit alone, for the Begroting path's second loop: four scalars and no JSON at all.
BALANS_VELDEN = (*_VELDEN_BASIS, "eigen_vermogen", "balanstotaal")


def _solvabiliteit_pct(rows) -> float | None:
    """A cohort's eigen vermogen as a share of its balanstotaal, in percent.

    The mean of each gemeente's own ratio, one row one gemeente, matching the equal weighting of
    `_per_inwoner_mean` and `_saldo_pct`: a referentiegroep is the average of its members'
    solvabiliteit, not the solvabiliteit of the group pooled into a single balance sheet.

    That makes the figure a different number from the one CBS publishes — 71231ned reports the
    pooled ratio (2023: 41.322/104.309 = 39,6%), and the equal-weight mean over 342 gemeenten is
    near it but not it. The pooled figure is what the sync's columns are checked against; this is
    what the page draws, for the same reason every other cohort on this dashboard is a mean.

    A zero balanstotaal is "no balance sheet" rather than a gemeente without assets: only the
    Jaarrekening carries one, and a dozen X005 rows are gemeenten that filed nothing at all.
    Both drop out here.
    """
    ratios = [row.eigen_vermogen / row.balanstotaal * 100 for row in rows if row.balanstotaal]
    if not ratios:
        return None
    return round(sum(ratios) / len(ratios), 2)


def _management_per_jaar(jaar: int, suffix: str, gemeente, referentie, reserve: bool, velden):
    """One report type, every year up to `jaar`, bucketed into the two reeksen.

    A year is only comparable to the others through the same kind of report, so the verslagsoort
    code is rebuilt per year from the suffix rather than reused verbatim — the same trick
    _begroting_rows turns.

    `velden` is what to read off a row, because the two calls in managementoverzicht() want
    different things: the page itself needs its six lines, and the solvabiliteit's own loop needs
    only the balans pair.
    """
    jaren = sorted(
        Iv3Summary.objects.filter(jaar__lte=jaar, verslagsoort__endswith=suffix)
        .values_list("jaar", flat=True)
        .distinct()
    )

    codes = _cohort_selectie(gemeente, referentie)
    per_jaar = {}
    for chart_jaar in jaren:
        rows = list(
            Iv3Summary.objects.filter(jaar=chart_jaar, verslagsoort=f"{chart_jaar}X{suffix}")
            .filter(gm_code__in=codes)
            .only(*velden)
        )
        if reserve:
            # Neither breakdown: the toggle reaches this page through the uitgaven line's total
            # and nothing else — see the docstring in managementoverzicht.
            _apply_reservemutaties(rows)
        per_jaar[chart_jaar] = {
            COHORT_GEMEENTE: [row for row in rows if row.gm_code == gemeente],
            COHORT_REFERENTIE: [row for row in rows if row.gm_code in referentie],
        }
    return jaren, per_jaar


def managementoverzicht(
    jaar: int,
    verslagsoort: str,
    gemeente: str | None = None,
    referentie: list[str] | None = None,
    reserve: bool = False,
) -> dict:
    """The Managementoverzicht page, in one payload.

    Six lines, your gemeente against its referentiegroep, with `jaar` the *end* of each range.
    No landelijk cohort: the page asks how your organisation compares with the group you chose to
    read it against and nothing else, the same two reeksen the Begroting overzicht draws.

    Every euro figure is the equal-weight mean over the gemeenten in a cohort (_per_inwoner_mean,
    the report's "Avg Bedrag Per Gemeente pi"), never a population-weighted pooled ratio.

    `reserve` reaches only the uitgaven line — it is the only one of the six drawn off a total the
    0.10 taakveld is part of. The heffingen and the two personele categorieën are never booked on
    0.10, and the balance sheet is not an exploitatiepost at all.

    Deliberately no per-metric zero filter, unlike benchmark/baten/lasten. Those drop gemeenten
    whose page total is zero to match a Power BI measure that averages over VALUES(Gemeente);
    there is no such reference for this page, and six totals on one page would mean six different
    cohorts per year. Keeping one cohort buys two identities worth having: `lijnen.uitgaven`
    equals Begroting's uitgavenPerJaar for the same cohort, and salarissen + inhuur + overhead
    equals Benchmark's trend. A gemeente that books nothing on inhuur has a real zero, and on a
    page asking how your organisation compares, a zero is the answer rather than a blank.
    """
    referentie = referentie or []
    suffix = verslagsoort[-3:]
    jaren, per_jaar = _management_per_jaar(
        jaar, suffix, gemeente, referentie, reserve, MANAGEMENT_VELDEN
    )
    cohorten = _cohort_labels(jaar, gemeente, referentie, groepen=[], landelijk=False)
    keys = [cohort["key"] for cohort in cohorten]

    # The solvabiliteit reads its own years off its own report. Pinned to the Jaarrekening
    # whatever the sidebar says, because the Begroting's balans is wrong rather than merely thin
    # — see the Balans block in definitions.py. That leaves this line shorter than the other five
    # whenever a year is selected that has no Jaarrekening yet (2025, 2026), which is honest: the
    # figure does not exist for those years.
    if suffix == d.VERSLAGSOORT_JAARREKENING:
        # Already read. eigen_vermogen and balanstotaal are the two columns the reservemutaties
        # fold does not touch, so these rows answer the solvabiliteit exactly as a second read of
        # the same report would — and a second read is what this was: the same nine queries and
        # the same ~2,700 rows, fetched and decoded twice.
        balans_jaren, balans_per_jaar = jaren, per_jaar
    else:
        balans_jaren, balans_per_jaar = _management_per_jaar(
            jaar, d.VERSLAGSOORT_JAARREKENING, gemeente, referentie,
            reserve=False, velden=BALANS_VELDEN,
        )

    return {
        "jaar": jaar,
        "verslagsoort": verslagsoort,
        "cohorten": cohorten,
        "lijnen": {
            metric: [
                {
                    "name": str(chart_jaar),
                    **{
                        key: _per_inwoner_mean(per_jaar[chart_jaar][key], meting)
                        for key in keys
                    },
                }
                for chart_jaar in jaren
            ]
            for metric, meting in MANAGEMENT_LIJNEN.items()
        },
        # Kept out of `lijnen` rather than added to it: it is not the same question asked of
        # another figure. It is a percentage rather than euros, it is read off the balance sheet
        # rather than the exploitatie, and it answers for a report the rest of the page is not
        # drawn from — which `verslagsoort` here says out loud so the card can print it.
        "solvabiliteit": {
            "verslagsoort": (
                f"{balans_jaren[-1]}X{d.VERSLAGSOORT_JAARREKENING}" if balans_jaren else None
            ),
            "label": VERSLAGSOORT_LABELS[d.VERSLAGSOORT_JAARREKENING],
            "data": [
                {
                    "name": str(chart_jaar),
                    **{
                        key: _solvabiliteit_pct(balans_per_jaar[chart_jaar][key])
                        for key in keys
                    },
                }
                for chart_jaar in balans_jaren
            ],
        },
    }
