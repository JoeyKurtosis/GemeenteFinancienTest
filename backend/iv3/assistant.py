"""The IV3 figures, shaped for the chat assistant rather than for a chart.

The dashboard's own query layer (queries.py) answers "everything one page draws"; a chat turn
needs the opposite — one narrow figure, small enough to hand a language model as context. So
this module reads Iv3Summary directly instead of wrapping queries.gemeentelijke_stand and
friends, each of which returns a whole page (gemeentelijke_stand alone feeds fourteen charts
across ten years) and would exhaust the model's context on its own.

What it does share with queries.py is every *definition*: the metric formulas below are
LIJN_METRICS', the verslagsoort fallback is queries.resolve_verslagsoort, the inwonergroep
bounds are _in_groep. A figure quoted in the chat and the same figure on the page it points at
have to agree, and the only way to guarantee that is to compute them from the same place.

Reads the app database through the ORM, like every other request path — never the warehouse.
See the module note in models.py.

Two conventions hold throughout:

  * Everything returned is in **whole euros**. Iv3Summary stores thousands; nothing leaves this
    module without going through _euro or _per_inwoner.
  * Everything is untrusted. The arguments arrive from a language model, so `jaar` may be a
    string, a float, 2031, or "vorig jaar" — nothing reaches the ORM before valideer_selectie
    or resolve_gemeente has vouched for it.
"""

import difflib
import unicodedata
from functools import lru_cache
from types import SimpleNamespace

from iv3 import definitions as d
from iv3 import queries
from iv3.models import Gemeente, Iv3Summary


class ArgumentFout(Exception):
    """An argument no ORM query should see. The message is written for the model to read."""


class GemeenteOnbekend(Exception):
    """A name that resolved to no gemeente, or to several.

    Carries its suggestions so the caller can hand them back as a tool result: "did you mean
    Bergen (L.), Bergen (NH.) or Bergen op Zoom?" is an answer the model can act on, where an
    exception is not.
    """

    def __init__(self, reden: str, gevraagd: str, suggesties: list[str]):
        super().__init__(f"{reden}: {gevraagd}")
        self.reden = reden
        self.gevraagd = gevraagd
        self.suggesties = suggesties


# ── Metrieken ───────────────────────────────────────────────────────────────────────
#
# Metric -> (the Iv3Summary columns it needs, how to compute it from a row).
#
# The formulas are queries.LIJN_METRICS', and have to stay that way — a figure the assistant
# quotes and the same figure on the dashboard page it points at must agree. The one difference
# is the row type: LIJN_METRICS reads model instances (r.lasten), these read .values() dicts
# (r["lasten"]), because every query here is a .values() on a narrow column list rather than a
# full model load.
#
# The columns travel with the formula so callers can build a minimal .values() list without
# knowing what any metric is made of; personeel is the only one that needs two.
METRIEKEN = {
    "lasten": (("lasten",), lambda r: r["lasten"]),
    "baten": (("baten",), lambda r: r["baten"]),
    "sociaal": (("sociaal",), lambda r: r["sociaal"]),
    # "Totale" personeelskosten: payroll plus the staff hired in to do the same work.
    "personeel": (("salarissen", "inhuur"), lambda r: r["salarissen"] + r["inhuur"]),
    "inhuur": (("inhuur",), lambda r: r["inhuur"]),
    "verbonden": (("verbonden",), lambda r: r["verbonden"]),
    "rijk": (("rijk",), lambda r: r["rijk"]),
    "heffingen": (("heffingen",), lambda r: r["heffingen"]),
    "spuks": (("spuks",), lambda r: r["spuks"]),
}

# Written out for the model to say aloud, not for a chart axis.
METRIEK_LABELS = {
    "lasten": "totale lasten",
    "baten": "totale baten",
    "sociaal": "sociaal domein",
    "personeel": "personele lasten (salarissen en inhuur)",
    "inhuur": "inhuur van personeel",
    "verbonden": "bijdragen aan verbonden partijen",
    "rijk": "algemene uitkering uit het gemeentefonds",
    "heffingen": "lokale heffingen",
    "spuks": "specifieke uitkeringen (SPUK's)",
}

# What gemeente_kerncijfers reports without being asked. All of them: nine figures is still a
# small answer, and the alternative is a second tool call for whichever one the user meant.
KERN_METRIEKEN = ("lasten", "baten", "sociaal", "personeel", "inhuur", "verbonden", "rijk", "heffingen", "spuks")

# The .values() list for a kerncijfers row: the balance columns plus every column the kern
# metrics need, deduped. Derived rather than written out so adding a metric above cannot leave
# a column behind and produce a KeyError deep inside a lambda.
_KERN_VELDEN = (
    "gm_code",
    "inwoners",
    "eigen_vermogen",
    "balanstotaal",
    *sorted({veld for metriek in KERN_METRIEKEN for veld in METRIEKEN[metriek][0]}),
)

# The national context worth carrying on every answer. Deliberately two: each one costs a scan
# of every gemeente in the year, and lasten plus sociaal is what makes a figure interpretable.
_LANDELIJK_METRIEKEN = ("lasten", "sociaal")

# ── Verdelingen ─────────────────────────────────────────────────────────────────────
#
# The breakdowns the assistant can ask for. `veld` is the Iv3Summary JSON column holding
# {sleutel: bedrag}; baten_bron has none — it is assembled from four columns in
# gemeente_verdeling, the same four the Baten page's donut draws.
VERDELINGEN = {
    "hoofdtaakveld": {
        "veld": "per_hoofdtaakveld",
        "labels": d.HOOFDTAAKVELD_LABELS,
        "omschrijving": "lasten per hoofdtaakveld",
    },
    "hoofdcategorie": {
        "veld": "per_hoofdcategorie",
        "labels": d.HOOFDCATEGORIE_LABELS,
        "omschrijving": "lasten per hoofdcategorie",
    },
    "baten_bron": {
        "veld": None,
        "labels": d.BATEN_BRON_LABELS,
        "omschrijving": "baten per bron",
    },
}

# The columns the baten_bron verdeling is assembled from, since it has no `veld` of its own.
_VERDELING_BATEN_VELDEN = ("baten", "rijk", "spuks", "baten_heffingen_per_categorie")

# Caps on how much one tool result may carry. The model pays for every row in context, and a
# ranking of 342 gemeenten answers no question a top-10 does not.
MAX_RANGLIJST = 10
MAX_VERGELIJKING = 5
MAX_VERGELIJK_METRIEKEN = 4

# ── Namen ───────────────────────────────────────────────────────────────────────────
#
# The handful of names a user types that _normaliseer alone will not bridge, because they are
# not spelling variants of the CBS name but different names for the same place. Everything
# else — diacritics, punctuation, casing — is handled by normalisation, and prefix and
# fuzzy matching catch the rest.
GEMEENTE_ALIASSEN = {
    "den haag": "GM0518",
    "the hague": "GM0518",
    "den bosch": "GM0855",
    "adam": "GM0363",
    "rdam": "GM0599",
}


def _normaliseer(naam: str) -> str:
    """Casefold, strip diacritics, reduce punctuation to spaces, collapse whitespace.

    Bridges "Fryslan"/"Fryslân", "s-Gravenhage"/"s gravenhage" and "Bergen (NH.)"/"bergen nh"
    without needing a table entry for each.
    """
    plat = unicodedata.normalize("NFKD", naam.casefold())
    plat = "".join(teken for teken in plat if not unicodedata.combining(teken))
    plat = "".join(teken if teken.isalnum() else " " for teken in plat)
    return " ".join(plat.split())


@lru_cache(maxsize=16)
def _namen_index(jaar: int) -> tuple[dict[str, tuple[str, ...]], dict[str, str]]:
    """(normalised name -> gm_codes, gm_code -> name) for one year.

    Cached per process, which available_jaar_verslagsoort deliberately is not (queries.py:26-31).
    The difference is what is being cached: that one holds a fact about the data, which a refresh
    can move under a running worker. This holds names loaded by load_iv3_data before gunicorn
    starts, from a fixture that cannot change without a redeploy.
    """
    op_naam: dict[str, list[str]] = {}
    per_code: dict[str, str] = {}
    for code, naam in Gemeente.objects.filter(jaar=jaar).values_list("gm_code", "gm_naam"):
        op_naam.setdefault(_normaliseer(naam), []).append(code)
        per_code[code] = naam
    return {sleutel: tuple(codes) for sleutel, codes in op_naam.items()}, per_code


def resolve_gemeente(naam, jaar: int) -> tuple[str, str]:
    """A name the model was handed -> (gm_code, the name as CBS writes it) for that year.

    Never guesses between candidates. Ambiguity and near-misses both raise GemeenteOnbekend
    with suggestions, so the assistant asks the user rather than picking a Bergen.
    """
    if not isinstance(naam, str) or not naam.strip():
        raise GemeenteOnbekend("ongeldige_naam", str(naam), [])

    op_naam, per_code = _namen_index(jaar)
    sleutel = _normaliseer(naam)

    code = GEMEENTE_ALIASSEN.get(sleutel)
    if code and code in per_code:
        return code, per_code[code]

    codes = op_naam.get(sleutel, ())
    if len(codes) == 1:
        return codes[0], per_code[codes[0]]
    if len(codes) > 1:
        raise GemeenteOnbekend("meerdere_treffers", naam, sorted(per_code[c] for c in codes))

    # "Bergen" typed at "Bergen op Zoom": a prefix on a word boundary, so "Berg" does not
    # match and "Bergen " does. Several hits are still ambiguous rather than a pick.
    prefix = [
        c
        for genormaliseerd, gevonden in op_naam.items()
        if genormaliseerd.startswith(sleutel + " ")
        for c in gevonden
    ]
    if len(prefix) == 1:
        return prefix[0], per_code[prefix[0]]
    if len(prefix) > 1:
        raise GemeenteOnbekend("meerdere_treffers", naam, sorted(per_code[c] for c in prefix)[:6])

    dichtbij = difflib.get_close_matches(sleutel, list(op_naam), n=5, cutoff=0.75)
    raise GemeenteOnbekend(
        "onbekende_gemeente",
        naam,
        sorted({per_code[c] for treffer in dichtbij for c in op_naam[treffer]}),
    )


# ── Selectie ────────────────────────────────────────────────────────────────────────
#
# The label the model speaks -> the last three digits of the CBS verslagsoort code. The code
# itself is f"{jaar}X{suffix}"; see the note above queries.VERSLAGSOORT_LABELS.
_VERSLAGSOORT_SUFFIX = {
    "Begroting": d.VERSLAGSOORT_BEGROTING,
    "Jaarrekening": d.VERSLAGSOORT_JAARREKENING,
}


def valideer_selectie(jaar, verslagsoort=None) -> tuple[int, str, str]:
    """Pin (jaar, verslagsoort) to something the data actually carries.

    Returns (jaar, verslagsoort_code, verslagsoort_label). Falls back through
    queries.resolve_verslagsoort — the same Jaarrekening-first preference the dashboard uses —
    so a chat answer and the page it sends the user to cannot land on different reports for the
    same year.
    """
    per_jaar = queries.available_jaar_verslagsoort()
    if not per_jaar:
        raise ArgumentFout("Er zijn op dit moment geen cijfers beschikbaar.")

    try:
        jaar = int(jaar)
    except (TypeError, ValueError):
        raise ArgumentFout(f"Ongeldig jaar: {jaar!r}. Geef een jaartal, bijvoorbeeld 2023.")
    if jaar not in per_jaar:
        raise ArgumentFout(
            f"Voor {jaar} zijn geen cijfers beschikbaar. Beschikbaar zijn de jaren "
            f"{min(per_jaar)} tot en met {max(per_jaar)}."
        )

    if verslagsoort is not None and verslagsoort not in _VERSLAGSOORT_SUFFIX:
        raise ArgumentFout(
            f"Onbekende verslagsoort {verslagsoort!r}. Kies Begroting of Jaarrekening."
        )

    suffix = _VERSLAGSOORT_SUFFIX.get(verslagsoort)
    gevraagd = f"{jaar}X{suffix}" if suffix else None

    code = queries.resolve_verslagsoort(gevraagd, jaar, per_jaar)
    if code is None:
        raise ArgumentFout(f"Voor {jaar} is geen bruikbaar verslag beschikbaar.")
    return jaar, code, queries.VERSLAGSOORT_LABELS[code[-3:]]


def valideer_metriek(naam) -> str:
    if naam not in METRIEKEN:
        raise ArgumentFout(f"Onbekende metriek {naam!r}. Kies uit: {', '.join(METRIEKEN)}.")
    return naam


def _valideer_aantal(waarde, standaard: int, maximum: int) -> int:
    try:
        aantal = int(waarde) if waarde is not None else standaard
    except (TypeError, ValueError):
        aantal = standaard
    return max(1, min(aantal, maximum))


# ── Bedragen ────────────────────────────────────────────────────────────────────────


def _euro(bedrag: float) -> int:
    """Thousands of euros — the unit Iv3Summary stores — to whole euros."""
    return round(bedrag * d.BEDRAG_FACTOR)


def _per_inwoner(bedrag: float, inwoners) -> float | None:
    """Euros per inhabitant, or None where the inwonertal is missing.

    None rather than 0: a gemeente with no population figure cannot be ranked or compared per
    inwoner, and a zero would sort to the top of a "laagste" ranglijst as if it were a finding.
    """
    if not inwoners:
        return None
    return round(bedrag * d.BEDRAG_FACTOR / inwoners, 2)


def _bedrag(bedrag: float, inwoners) -> dict:
    return {"totaal": _euro(bedrag), "per_inwoner": _per_inwoner(bedrag, inwoners)}


def _gemiddelde(rows, meet, per_inwoner: bool) -> float | None:
    """The equal-weight mean across a bundle of rows — one gemeente, one vote.

    The mean of each gemeente's own figure rather than the pooled total/total, matching
    queries._per_inwoner_mean: that is what the dashboard draws, so it is what the user is
    comparing a figure against on screen. Rows without an inwonertal are skipped in the
    per-inwoner case, exactly as the ranking skips them.
    """
    waarden = [
        _per_inwoner(meet(row), row["inwoners"]) if per_inwoner else _euro(meet(row))
        for row in rows
        if not per_inwoner or row["inwoners"]
    ]
    if not waarden:
        return None
    return round(sum(waarden) / len(waarden), 2)


# ── Tools ───────────────────────────────────────────────────────────────────────────


def beschikbare_data() -> dict:
    """Which years and report types carry figures at all.

    The first tool the assistant should reach for when a question names no year, and the thing
    that stops it asserting a 2025 Jaarrekening exists: the newest years carry a Begroting alone
    until the municipalities have filed.
    """
    per_jaar = queries.available_jaar_verslagsoort()
    if not per_jaar:
        return {"fout": "geen_data", "toelichting": "Er zijn geen cijfers geladen."}

    jaren = {
        str(jaar): [
            queries.VERSLAGSOORT_LABELS[code[-3:]]
            for code in sorted(codes)
            if code[-3:] in queries.VERSLAGSOORT_LABELS
        ]
        for jaar, codes in sorted(per_jaar.items())
    }
    met_jaarrekening = [int(j) for j, soorten in jaren.items() if "Jaarrekening" in soorten]
    met_begroting = [int(j) for j, soorten in jaren.items() if "Begroting" in soorten]

    return {
        "jaren": jaren,
        "nieuwste_jaarrekening": max(met_jaarrekening) if met_jaarrekening else None,
        "nieuwste_begroting": max(met_begroting) if met_begroting else None,
        "aantal_gemeenten": Gemeente.objects.filter(jaar=max(per_jaar)).count(),
        "toelichting": (
            "De Begroting is het plan, de Jaarrekening is wat er werkelijk is uitgegeven. "
            "Balansgegevens bestaan alleen bij de Jaarrekening."
        ),
    }


def dashboard_selectie(gemeente=None, jaar=None, verslagsoort=None) -> dict:
    """The filters the user has applied, resolved to labels the model can read.

    Not a tool — the client sends this, the user does not ask for it. It is what lets "wat geeft
    mijn gemeente uit" mean something: the dashboard already knows which gemeente is selected.

    Untrusted like everything else here, and unlike the tools it never raises: an unusable
    selection is not an error to report but a context line to leave out. Each field is dropped
    on its own, so a stale gemeente code does not cost us the year as well.

    Resolution is per year because gemeente names and codes are (see _namen_index), so a code
    can only be resolved once the year has been.
    """
    gekozen = {"gemeente": None, "jaar": None, "verslagsoort": None}

    per_jaar = queries.available_jaar_verslagsoort()
    if not per_jaar:
        return gekozen

    # bool is an int subclass, and True would otherwise sail through as a year.
    if isinstance(jaar, int) and not isinstance(jaar, bool) and jaar in per_jaar:
        gekozen["jaar"] = jaar
    else:
        return gekozen

    if isinstance(verslagsoort, str) and verslagsoort in per_jaar[gekozen["jaar"]]:
        gekozen["verslagsoort"] = queries.VERSLAGSOORT_LABELS.get(verslagsoort[-3:])

    if isinstance(gemeente, str):
        _, per_code = _namen_index(gekozen["jaar"])
        gekozen["gemeente"] = per_code.get(gemeente)

    return gekozen


def _landelijk_per_inwoner(jaar: int, verslagsoort: str, metrieken) -> dict:
    """The national equal-weight mean per inhabitant, for a couple of metrics."""
    velden = sorted({veld for metriek in metrieken for veld in METRIEKEN[metriek][0]})
    rows = list(
        Iv3Summary.objects.filter(jaar=jaar, verslagsoort=verslagsoort).values("inwoners", *velden)
    )
    return {
        metriek: _gemiddelde(rows, METRIEKEN[metriek][1], per_inwoner=True)
        for metriek in metrieken
    }


def gemeente_kerncijfers(gemeente, jaar, verslagsoort=None) -> dict:
    """Every headline figure for one gemeente in one year."""
    jaar, code, label = valideer_selectie(jaar, verslagsoort)
    gm_code, naam = resolve_gemeente(gemeente, jaar)

    row = (
        Iv3Summary.objects.filter(jaar=jaar, verslagsoort=code, gm_code=gm_code)
        .values(*_KERN_VELDEN)
        .first()
    )
    if row is None:
        # A gemeente that exists but filed nothing. Not an error the model should retry —
        # it is the answer, and it needs to say so rather than reach for another tool.
        return {
            "fout": "geen_cijfers",
            "toelichting": f"{naam} heeft voor de {label} {jaar} geen cijfers ingediend.",
        }

    inwoners = row["inwoners"]
    resultaat = {
        "gemeente": naam,
        "jaar": jaar,
        "verslagsoort": label,
        "inwoners": inwoners,
        "eenheid": "euro",
        "cijfers": {
            metriek: {
                "label": METRIEK_LABELS[metriek],
                **_bedrag(METRIEKEN[metriek][1](row), inwoners),
            }
            for metriek in KERN_METRIEKEN
        },
        "landelijk_per_inwoner": _landelijk_per_inwoner(jaar, code, _LANDELIJK_METRIEKEN),
    }

    # Balansgegevens are filed with the Jaarrekening only. Say why they are absent rather than
    # returning nulls the model might read as "zero" — and say it in the payload, because the
    # system prompt alone has not stopped that before.
    if row["balanstotaal"]:
        resultaat["balans"] = {
            "eigen_vermogen": _euro(row["eigen_vermogen"]),
            "balanstotaal": _euro(row["balanstotaal"]),
            "solvabiliteit_pct": round(row["eigen_vermogen"] / row["balanstotaal"] * 100, 1),
        }
    else:
        resultaat["balans"] = None
        resultaat["balans_toelichting"] = (
            "Balansgegevens (eigen vermogen, balanstotaal, solvabiliteit) worden alleen bij de "
            "Jaarrekening vastgelegd."
        )
    return resultaat


def gemeente_verdeling(gemeente, jaar, indeling, verslagsoort=None) -> dict:
    """Where one gemeente's money goes, or where it comes from.

    Stops at the hoofd- level on purpose: the taakveld detail is fifty-odd rows, which is a
    dashboard page rather than a chat answer.
    """
    if indeling not in VERDELINGEN:
        raise ArgumentFout(f"Onbekende indeling {indeling!r}. Kies uit: {', '.join(VERDELINGEN)}.")
    jaar, code, label = valideer_selectie(jaar, verslagsoort)
    gm_code, naam = resolve_gemeente(gemeente, jaar)

    spec = VERDELINGEN[indeling]
    velden = (
        "inwoners",
        *(_VERDELING_BATEN_VELDEN if spec["veld"] is None else (spec["veld"],)),
    )
    row = (
        Iv3Summary.objects.filter(jaar=jaar, verslagsoort=code, gm_code=gm_code)
        .values(*velden)
        .first()
    )
    if row is None:
        return {
            "fout": "geen_cijfers",
            "toelichting": f"{naam} heeft voor de {label} {jaar} geen cijfers ingediend.",
        }

    if spec["veld"] is None:
        # The Baten page's four slices: the two rijk halves, the lokale heffingen summed out
        # of their categorie split, and whatever is left over.
        heffingen = sum(row["baten_heffingen_per_categorie"].values())
        waarden = {
            "rijk": row["rijk"],
            "spuks": row["spuks"],
            "heffingen": heffingen,
            "overig": row["baten"] - row["rijk"] - row["spuks"] - heffingen,
        }
    else:
        waarden = row[spec["veld"]]

    inwoners = row["inwoners"]
    totaal = sum(waarden.values())

    return {
        "gemeente": naam,
        "jaar": jaar,
        "verslagsoort": label,
        "indeling": spec["omschrijving"],
        "inwoners": inwoners,
        "eenheid": "euro",
        "totaal": _euro(totaal),
        "onderdelen": [
            {
                "label": spec["labels"].get(sleutel, sleutel),
                **_bedrag(bedrag, inwoners),
                "aandeel_pct": round(bedrag / totaal * 100, 1) if totaal else None,
            }
            for sleutel, bedrag in sorted(waarden.items(), key=lambda paar: -paar[1])
            if sleutel in spec["labels"]
        ],
    }


def vergelijk_gemeenten(gemeenten, jaar, metrieken=None, verslagsoort=None) -> dict:
    """A handful of gemeenten side by side on a handful of metrics, plus the national mean."""
    if not isinstance(gemeenten, (list, tuple)) or len(gemeenten) < 2:
        raise ArgumentFout("Geef minstens twee gemeenten om te vergelijken.")
    jaar, code, label = valideer_selectie(jaar, verslagsoort)

    gevraagd = list(metrieken) if metrieken else [*("lasten", "sociaal", "personeel")]
    gekozen = [valideer_metriek(metriek) for metriek in gevraagd[:MAX_VERGELIJK_METRIEKEN]]
    velden = sorted({veld for metriek in gekozen for veld in METRIEKEN[metriek][0]})

    # Resolve every name first, collecting the failures instead of raising on the first one:
    # one unknown name out of four should still answer for the other three, with a "did you
    # mean" for the fourth. Keyed by gm_code so two spellings of the same gemeente collapse
    # into one column rather than being compared against themselves.
    codes = {}
    niet_gevonden = []
    for naam in gemeenten[:MAX_VERGELIJKING]:
        try:
            gm_code, canoniek = resolve_gemeente(naam, jaar)
            codes[gm_code] = canoniek
        except GemeenteOnbekend as exc:
            niet_gevonden.append({"gevraagd": exc.gevraagd, "bedoelde_je": exc.suggesties})

    rows = {
        row["gm_code"]: row
        for row in Iv3Summary.objects.filter(
            jaar=jaar, verslagsoort=code, gm_code__in=list(codes)
        ).values("gm_code", "inwoners", *velden)
    }

    vergelijking = []
    for gm_code, naam in codes.items():
        row = rows.get(gm_code)
        if row is None:
            niet_gevonden.append(
                {"gevraagd": naam, "toelichting": f"geen cijfers voor de {label} {jaar}"}
            )
            continue
        vergelijking.append(
            {
                "gemeente": naam,
                "inwoners": row["inwoners"],
                "cijfers": {
                    metriek: _bedrag(METRIEKEN[metriek][1](row), row["inwoners"])
                    for metriek in gekozen
                },
            }
        )

    return {
        "jaar": jaar,
        "verslagsoort": label,
        "eenheid": "euro",
        "metrieken": {metriek: METRIEK_LABELS[metriek] for metriek in gekozen},
        "gemeenten": vergelijking,
        "landelijk_per_inwoner": _landelijk_per_inwoner(jaar, code, gekozen),
        "niet_gevonden": niet_gevonden,
    }


def _provincie_codes(provincie, jaar: int) -> set[str]:
    """The gemeente codes of one province, by its name."""
    genormaliseerd = _normaliseer(str(provincie))
    treffer = next(
        (code for code, naam in d.PROVINCIE_LABELS.items() if _normaliseer(naam) == genormaliseerd),
        None,
    )
    if treffer is None:
        raise ArgumentFout(
            f"Onbekende provincie {provincie!r}. Kies uit: "
            f"{', '.join(sorted(d.PROVINCIE_LABELS.values()))}."
        )
    return set(
        Gemeente.objects.filter(jaar=jaar, prv_code=treffer).values_list("gm_code", flat=True)
    )


def _inwonergroep(groep_id):
    treffer = next((groep for groep in d.INWONERGROEPEN if groep["id"] == groep_id), None)
    if treffer is None:
        raise ArgumentFout(
            f"Onbekende inwonergroep {groep_id!r}. Kies uit: "
            f"{', '.join(groep['id'] for groep in d.INWONERGROEPEN)}."
        )
    return treffer


def ranglijst(
    jaar,
    metriek,
    verslagsoort=None,
    per_inwoner=True,
    richting="hoogste",
    aantal=5,
    provincie=None,
    inwonergroep=None,
) -> dict:
    """Which gemeenten sit highest or lowest on one metric, with the national context."""
    jaar, code, label = valideer_selectie(jaar, verslagsoort)
    metriek = valideer_metriek(metriek)
    velden, meet = METRIEKEN[metriek]
    aantal = _valideer_aantal(aantal, standaard=5, maximum=MAX_RANGLIJST)
    if richting not in ("hoogste", "laagste"):
        richting = "hoogste"
    # Anything but an explicit False means per inwoner: a ranking on the raw total is very
    # nearly a ranking on population, which answers nothing the user asked.
    per_inwoner = per_inwoner is not False

    rows = list(
        Iv3Summary.objects.filter(jaar=jaar, verslagsoort=code).values("gm_code", "inwoners", *velden)
    )
    _, namen = _namen_index(jaar)

    # The national mean over every gemeente, before any filter — the figure the user sees on
    # the dashboard, and the one that makes a top-5 mean something.
    landelijk = _gemiddelde(rows, meet, per_inwoner)

    selectie = []
    if provincie is not None:
        binnen = _provincie_codes(provincie, jaar)
        rows = [row for row in rows if row["gm_code"] in binnen]
        selectie.append(f"provincie {provincie}")
    if inwonergroep is not None:
        groep = _inwonergroep(inwonergroep)
        # Through queries._in_groep rather than comparing the bounds here, so the chat and the
        # dashboard's inwonergroep filter cannot disagree about where a gemeente sits. It reads
        # attributes, and these rows are dicts.
        rows = [
            row
            for row in rows
            if queries._in_groep(
                SimpleNamespace(gm_code=row["gm_code"], inwoners=row["inwoners"]), groep
            )
        ]
        selectie.append(f"inwonergroep {groep['label']}")
    if not rows:
        raise ArgumentFout("Geen enkele gemeente voldoet aan deze selectie.")

    gemeten = []
    for row in rows:
        bedrag = meet(row)
        waarde = _per_inwoner(bedrag, row["inwoners"]) if per_inwoner else _euro(bedrag)
        # Skipped rather than sorted last: see _per_inwoner on why None is not 0.
        if waarde is not None:
            gemeten.append((waarde, row["gm_code"], row["inwoners"]))
    if not gemeten:
        raise ArgumentFout("Geen enkele gemeente in deze selectie heeft een inwonertal.")

    gemeten.sort(key=lambda meting: meting[0], reverse=richting == "hoogste")
    waarden = sorted(waarde for waarde, _, _ in gemeten)

    resultaat = {
        "jaar": jaar,
        "verslagsoort": label,
        "metriek": METRIEK_LABELS[metriek],
        "eenheid": "euro per inwoner" if per_inwoner else "euro",
        "richting": richting,
        "aantal_gemeenten": len(gemeten),
        "landelijk_gemiddelde": landelijk,
        "mediaan": waarden[len(waarden) // 2],
        "ranglijst": [
            {
                "positie": positie,
                "gemeente": namen.get(gm_code, gm_code),
                "inwoners": inwoners,
                "waarde": waarde,
            }
            for positie, (waarde, gm_code, inwoners) in enumerate(gemeten[:aantal], start=1)
        ],
    }
    # Only when a filter was applied: without one this is the landelijk gemiddelde again, and
    # two identical figures under different names invites the model to contrast them.
    if selectie:
        resultaat["selectie"] = " en ".join(selectie)
        resultaat["gemiddelde_in_selectie"] = _gemiddelde(rows, meet, per_inwoner)
    return resultaat
