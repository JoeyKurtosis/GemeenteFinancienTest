"""Build the app's iv3 tables out of the IV3 warehouse.

**Developer command — this is not deployed and never runs in production.** It is the only
thing in the project that reaches the warehouse, and it needs IV3_DB_* pointed at it. The
deployed app reads nothing but its own database; see load_iv3_data.

Takes a few minutes: it reads a few million rows per (jaar, verslagsoort) out of a 151M-row
table. That is precisely why it exists — the dashboard cannot do this per request, and the
warehouse grant is SELECT-only so a materialised view is not an option. It only has to run
when CBS publishes, which is about once a year.

    python manage.py sync_iv3_summary            # every year
    python manage.py sync_iv3_summary --jaar 2024

Then ship what it built:

    python manage.py dumpdata iv3 --indent 0 --output iv3/fixtures/iv3_data.json.gz
"""

import re

from django.core.management.base import BaseCommand
from django.db import connections, transaction

from iv3 import definitions as d
from iv3.models import Gemeente, Inwoners, Iv3Summary, Iv3Taakveld

# Which (jaar, verslagsoort) the warehouse actually carries — what this command loops over.
#
# A plain `SELECT DISTINCT jaar, verslagsoort FROM gemeenten_iv3` sequentially scans all 151M
# rows / 16GB and takes ~28 seconds. This walks the (jaar, verslagsoort) index one distinct
# pair at a time instead — a loose index scan — and returns in ~6ms.
#
# This is the warehouse's coverage, not the dashboard's: it returns all 54 pairs, including
# the quarterly X001-X004 that handle() skips. What the dashboard can *draw* is a different
# question, answered by queries.available_jaar_verslagsoort() off Iv3Summary.
_DISTINCT_JAAR_VERSLAGSOORT = """
WITH RECURSIVE pairs AS (
    (SELECT jaar, verslagsoort FROM gemeenten_iv3 ORDER BY jaar, verslagsoort LIMIT 1)
    UNION ALL
    SELECT next.jaar, next.verslagsoort
    FROM pairs p
    CROSS JOIN LATERAL (
        SELECT g.jaar, g.verslagsoort
        FROM gemeenten_iv3 g
        WHERE (g.jaar, g.verslagsoort) > (p.jaar, p.verslagsoort)
        ORDER BY g.jaar, g.verslagsoort
        LIMIT 1
    ) next
)
SELECT jaar, verslagsoort FROM pairs ORDER BY jaar, verslagsoort
"""

# The two small dimension tables, copied across wholesale — 6401 and 3543 rows.
#
# No trim() on either: unlike gemeenten_iv3.gemeenten, which is space-padded to 9 characters,
# these two store the bare code ("GM0606") and carry no padded rows at all. Padding one of
# these on the way in would be worse than useless — it would match nothing on the way out.
_GEMEENTEN = """
SELECT gm_code, gm_naam, prv_code, jaar FROM gemeenten
"""

_INWONERS = """
SELECT gemeente, jaar, aantal_inwoners FROM inwoners
"""

# Every taakveld the newest report carries, name and all. The name is the half of
# `taakveldbalanspost` that _AGGREGATE throws away, and the Lasten detail donuts need it to
# label their slices — see Iv3Taakveld. Bounded by the (jaar, verslagsoort) index like
# everything else here; the newest year wins because a renamed taakveld should show up under
# its current name.
_TAAKVELDEN = """
SELECT DISTINCT trim(taakveldbalanspost) AS taakveld
FROM gemeenten_iv3
WHERE jaar = %(jaar)s AND verslagsoort = %(verslagsoort)s
  AND taakveldbalanspost !~ %(balanspost_re)s
ORDER BY 1
"""

# One pass per (jaar, verslagsoort), so the scan is bounded by that index rather than the
# whole table. The grouping is deliberately finer than any single metric needs — down to
# the categorie and the hoofdtaakveld — because that one result set can then answer every
# question the dashboard asks, in Python, without going back to the warehouse. It stays
# small: the code space is sparse, so this collapses millions of rows to a few hundred
# thousand.
#
# `bedrag` resolves the sentinel before anything sums it (definitions.GEEN_OPGAVE).
# 2eplaatsing is the revised figure and the better populated of the two, so it wins
# wherever CBS has published it.
_AGGREGATE = f"""
WITH feiten AS (
    SELECT
        trim(gemeenten)          AS gm_code,
        trim(categorie)          AS categorie,
        trim(taakveldbalanspost) AS taakveld,
        CASE
            WHEN "2eplaatsing" <> {d.GEEN_OPGAVE} THEN "2eplaatsing"
            WHEN "1eplaatsing" <> {d.GEEN_OPGAVE} THEN "1eplaatsing"
            ELSE 0
        END AS bedrag
    FROM gemeenten_iv3
    WHERE jaar = %(jaar)s AND verslagsoort = %(verslagsoort)s
)
SELECT
    gm_code,
    categorie,
    -- The taakveld arrives as "0.7 Algemene uitkeringen en overige ui..", so the code has
    -- to be cut off the label. Keep it whole: 0.7 (algemene uitkering) and 0.10 (mutaties
    -- reserves) both have to stay distinguishable from 0.1 (bestuur).
    split_part(taakveld, ' ', 1) AS code,
    sum(bedrag)                  AS bedrag
FROM feiten
-- The balance sheet (A*/P*) is not income or expenditure, and 0.11 is the saldo of the
-- very rows being added up here.
WHERE taakveld !~ %(balanspost_re)s
  AND split_part(taakveld, ' ', 1) <> %(resultaat)s
GROUP BY 1, 2, 3
"""

# The balance sheet, which _AGGREGATE cannot answer: it drops the A*/P* balansposten outright,
# and rightly so — that filter is what keeps the balans out of every lasten and baten figure on
# every other page. So the balans gets a pass of its own rather than a widened _AGGREGATE.
#
# Bounded by the same (jaar, verslagsoort) index, and cheap next to _AGGREGATE: the balansposten
# are a small corner of the code space and only the passivazijde is read.
#
# `bedrag` resolves the sentinel exactly as _AGGREGATE does, by equality and 2eplaatsing first
# (definitions.GEEN_OPGAVE) — a balanspost carries a correction like anything else, so a
# `> -99000` cutoff would delete real money here too.
#
# Ultimo, not Primo: the closing position is what a solvabiliteitsratio is read off. The L*/B*
# categorie rows on a balanspost are mutations rather than standen and would double the figure.
_BALANS = f"""
WITH standen AS (
    SELECT
        trim(gemeenten)          AS gm_code,
        trim(taakveldbalanspost) AS post,
        CASE
            WHEN "2eplaatsing" <> {d.GEEN_OPGAVE} THEN "2eplaatsing"
            WHEN "1eplaatsing" <> {d.GEEN_OPGAVE} THEN "1eplaatsing"
            ELSE 0
        END AS bedrag
    FROM gemeenten_iv3
    WHERE jaar = %(jaar)s AND verslagsoort = %(verslagsoort)s
      AND trim(categorie) = %(ultimo)s
)
SELECT
    gm_code,
    sum(bedrag) FILTER (WHERE post ~ %(eigen_vermogen_re)s) AS eigen_vermogen,
    sum(bedrag) FILTER (WHERE post ~ %(passiva_re)s)        AS balanstotaal
FROM standen
GROUP BY 1
"""


def warehouse_jaar_verslagsoort() -> dict[int, list[str]]:
    """Every verslagsoort the warehouse has per year, e.g. {2026: ["2026X000", ...], ...}.

    Uncached and warehouse-bound, unlike its namesake in queries.py: this is the question
    "what is there to roll up", which only this command asks, and it must not be answered
    off Iv3Summary — that is the table being built, so a fresh database would report no
    work to do and the command could never populate itself.
    """
    with connections["iv3"].cursor() as cursor:
        cursor.execute(_DISTINCT_JAAR_VERSLAGSOORT)
        rows = cursor.fetchall()

    per_jaar: dict[int, list[str]] = {}
    for jaar, verslagsoort in rows:
        per_jaar.setdefault(jaar, []).append(verslagsoort)
    return per_jaar


class Command(BaseCommand):
    help = "Build the app's iv3 tables from the IV3 warehouse (developer command)."

    def add_arguments(self, parser):
        parser.add_argument("--jaar", type=int, help="Only refresh this year.")

    def handle(self, *args, **options):
        # Before the rollups, and deliberately not scoped by --jaar: a gemeente's name is
        # read for every year on a chart's x-axis, not just the year being refreshed. Since
        # this rebuilds by delete-then-insert, honouring --jaar here would wipe the other
        # nine years' gemeenten and empty every chart label but one. 6401 + 3543 rows —
        # refreshing all of it costs nothing.
        self._sync_gemeenten()

        per_jaar = warehouse_jaar_verslagsoort()
        if options["jaar"]:
            per_jaar = {options["jaar"]: per_jaar.get(options["jaar"], [])}

        for jaar in sorted(per_jaar):
            for verslagsoort in sorted(per_jaar[jaar]):
                # X001-X004 are the quarterly reports, which the dashboard does not offer.
                if verslagsoort[-3:] not in (d.VERSLAGSOORT_BEGROTING, d.VERSLAGSOORT_JAARREKENING):
                    continue
                rows, scheef = self._sync(jaar, verslagsoort)
                self.stdout.write(f"{jaar} {verslagsoort}: {rows} gemeenten")
                if scheef:
                    # True by construction today (see _accumulate); this is what catches the
                    # next edit that quietly stops it being true.
                    self.stdout.write(
                        self.style.ERROR(
                            f"  {scheef} gemeenten waarvan de baten of lasten niet opgaan "
                            f"in hun onderverdeling"
                        )
                    )

        # After the rollups, and off the newest report the run touched: the names only have to
        # cover the codes the summaries actually carry.
        if per_jaar:
            self._sync_taakvelden(per_jaar)

        self.stdout.write(self.style.SUCCESS(f"{Iv3Summary.objects.count()} rows in total"))

    def _sync_gemeenten(self) -> None:
        """Copy the warehouse's gemeenten and inwoners into the app database.

        Small enough to take whole — the aggregation below is what needs the year bounds,
        not these. Every year, always: see the note at the call site.

        Written before the loop so that _sync()'s own Inwoners lookup reads the fresh copy.
        """
        with connections["iv3"].cursor() as cursor:
            cursor.execute(_GEMEENTEN)
            gemeenten = [
                Gemeente(gm_code=gm_code, gm_naam=gm_naam, prv_code=prv_code, jaar=jaar)
                for gm_code, gm_naam, prv_code, jaar in cursor.fetchall()
            ]
            cursor.execute(_INWONERS)
            inwoners = [
                Inwoners(gemeente=gemeente, jaar=jaar, aantal_inwoners=aantal)
                for gemeente, jaar, aantal in cursor.fetchall()
            ]

        with transaction.atomic():
            Gemeente.objects.all().delete()
            Gemeente.objects.bulk_create(gemeenten, batch_size=500)
            Inwoners.objects.all().delete()
            Inwoners.objects.bulk_create(inwoners, batch_size=500)
        self.stdout.write(f"{len(gemeenten)} gemeenten, {len(inwoners)} inwonertallen")

    def _sync_taakvelden(self, per_jaar: dict[int, list[str]]) -> None:
        """Refresh the taakveld names the Lasten donuts label their slices with.

        Every year on its own, because a code is not a stable name — see Iv3Taakveld.
        """
        # {jaar: {rolled code: name as that year writes it}}. A child's own name is dropped: it
        # describes the child, not the parent the donut draws.
        per_jaar_namen: dict[int, dict[str, str]] = {}
        for jaar in sorted(per_jaar):
            verslagsoorten = [
                code
                for code in sorted(per_jaar[jaar])
                if code[-3:] in (d.VERSLAGSOORT_BEGROTING, d.VERSLAGSOORT_JAARREKENING)
            ]
            if not verslagsoorten:
                continue

            with connections["iv3"].cursor() as cursor:
                cursor.execute(
                    _TAAKVELDEN,
                    {
                        "jaar": jaar,
                        "verslagsoort": verslagsoorten[-1],
                        "balanspost_re": f"^[{''.join(d.BALANSPOST_PREFIXES)}]",
                    },
                )
                rijen = [rij[0] for rij in cursor.fetchall()]

            namen: dict[str, str] = {}
            for rij in rijen:
                # The warehouse writes "0.1 Bestuur": code, space, name.
                code, _, titel = rij.partition(" ")
                # 0.11 is the saldo of the very rows the donut draws — _AGGREGATE drops it, so
                # no figure will ever reach it and naming it would only put an empty slice in
                # the legend. 0.10 stays: it is a real taakveld, and the reservemutaties toggle
                # decides per request whether it is drawn.
                if code != _rol_taakveld_op(code) or not titel or code == d.TAAKVELD_RESULTAAT:
                    continue
                namen[code] = titel
            per_jaar_namen[jaar] = namen

        # A rolled-up parent often has no bare row in the year that uses it — 2026 books on
        # 6.711..714 and never on 6.71 itself — but an older year named it. Newest year wins.
        elders: dict[str, str] = {}
        for jaar in sorted(per_jaar_namen):
            for code, titel in per_jaar_namen[jaar].items():
                if not titel.endswith(".."):
                    elders[code] = titel

        rows: list[Iv3Taakveld] = []
        for jaar, namen in sorted(per_jaar_namen.items()):
            for code in sorted(self._taakveld_codes(jaar) | set(namen)):
                titel = self._taakveld_naam(jaar, code, namen, elders)
                if titel:
                    rows.append(Iv3Taakveld(jaar=jaar, code=code, titel=titel))

        with transaction.atomic():
            Iv3Taakveld.objects.all().delete()
            Iv3Taakveld.objects.bulk_create(rows, batch_size=500)
        self.stdout.write(f"{len(rows)} taakveldnamen over {len(per_jaar_namen)} jaren")

    def _taakveld_codes(self, jaar: int) -> set[str]:
        """Every taakveld the year's summaries can actually draw a slice for."""
        return {
            taakveld
            for row in Iv3Summary.objects.filter(jaar=jaar).values_list(
                "lasten_per_taakveld", flat=True
            )
            for taakveld in row
        }

    def _taakveld_naam(
        self, jaar: int, code: str, namen: dict[str, str], elders: dict[str, str]
    ) -> str | None:
        """What to call `code` in `jaar`: its own name, a completion, or another year's."""
        eigen = namen.get(code)
        if eigen and not eigen.endswith(".."):
            return eigen

        override = d.TAAKVELD_LABEL_OVERRIDES.get(code)
        if override:
            # A truncated name is a prefix of the real one, so it is also a check on it: if CBS
            # renames a taakveld, the override stops matching and says so rather than quietly
            # disagreeing with the warehouse. The authored ones have no stem to check against.
            stam = (eigen or "").removesuffix("..")
            if code not in d.TAAKVELD_LABELS_ZONDER_BRON and stam and not override.startswith(stam):
                self.stdout.write(
                    self.style.ERROR(
                        f"  {jaar} taakveld {code}: override {override!r} past niet op {stam!r}"
                    )
                )
            return override

        ander = elders.get(code)
        if ander:
            return ander

        # Nothing to go on: a truncated name is still better than none, but say so.
        self.stdout.write(
            self.style.ERROR(f"  {jaar} taakveld {code} heeft geen bruikbare naam: {eigen!r}")
        )
        return eigen

    def _sync(self, jaar: int, verslagsoort: str) -> tuple[int, int]:
        with connections["iv3"].cursor() as cursor:
            cursor.execute(
                _AGGREGATE,
                {
                    "jaar": jaar,
                    "verslagsoort": verslagsoort,
                    "resultaat": d.TAAKVELD_RESULTAAT,
                    "balanspost_re": f"^[{''.join(d.BALANSPOST_PREFIXES)}]",
                },
            )
            feiten = cursor.fetchall()

        inwoners = dict(
            Inwoners.objects.filter(jaar=jaar).values_list("gemeente", "aantal_inwoners")
        )

        summaries: dict[str, Iv3Summary] = {}
        for gm_code, categorie, code, bedrag in feiten:
            row = summaries.get(gm_code)
            if row is None:
                row = summaries[gm_code] = Iv3Summary(
                    jaar=jaar,
                    verslagsoort=verslagsoort,
                    gm_code=gm_code,
                    inwoners=inwoners.get(gm_code),
                    per_hoofdcategorie={},
                    per_hoofdtaakveld={},
                    personeel_per_hoofdtaakveld={},
                    spuks_per_hoofdtaakveld={},
                    baten_heffingen_per_categorie={},
                    overige_baten_per_hoofdcategorie={},
                    reserve_baten_per_hoofdcategorie={},
                    lasten_per_taakveld={},
                    lasten_per_hoofdtaakveld_categorie={},
                    reserve_lasten_per_hoofdcategorie={},
                )
            _accumulate(row, categorie, code, bedrag or 0.0)

        # Only off a Jaarrekening. The Begroting's balans is not thin-but-directional, it is
        # wrong — see the Balans block in definitions.py. Left at zero, which is what a ratio
        # reads as "no figure".
        if verslagsoort.endswith(d.VERSLAGSOORT_JAARREKENING):
            self._sync_balans(jaar, verslagsoort, summaries)

        with transaction.atomic():
            Iv3Summary.objects.filter(jaar=jaar, verslagsoort=verslagsoort).delete()
            Iv3Summary.objects.bulk_create(list(summaries.values()), batch_size=500)

        scheef = sum(
            not (_baten_gaan_op(row) and _lasten_gaan_op(row)) for row in summaries.values()
        )
        return len(summaries), scheef

    def _sync_balans(
        self, jaar: int, verslagsoort: str, summaries: dict[str, Iv3Summary]
    ) -> None:
        """Read the year's balansposten onto the rows _AGGREGATE has already built."""
        with connections["iv3"].cursor() as cursor:
            cursor.execute(
                _BALANS,
                {
                    "jaar": jaar,
                    "verslagsoort": verslagsoort,
                    "ultimo": d.BALANS_CATEGORIE_ULTIMO,
                    "eigen_vermogen_re": d.BALANS_EIGEN_VERMOGEN_PREFIX,
                    "passiva_re": d.BALANS_PASSIVA_PREFIX,
                },
            )
            rijen = cursor.fetchall()

        # Only onto rows that already exist: a gemeente with a balans but not a single lasten or
        # baten row has no inwoners on the summary to divide by and nothing to draw. Counted
        # rather than ignored, because it would mean the two passes disagree about who filed.
        vreemd = 0
        for gm_code, eigen_vermogen, balanstotaal in rijen:
            row = summaries.get(gm_code)
            if row is None:
                vreemd += 1
                continue
            row.eigen_vermogen = eigen_vermogen or 0.0
            row.balanstotaal = balanstotaal or 0.0

        if vreemd:
            self.stdout.write(
                self.style.ERROR(
                    f"  {vreemd} gemeenten met een balans maar zonder exploitatie"
                )
            )


def _rol_taakveld_op(code: str) -> str:
    """The taakveld a code's figures belong under: 6.71a and 6.711 both -> 6.71, 0.1 -> 0.1.

    Drop a trailing letter, then keep two digits after the dot — the sociaal domein is the only
    hoofdtaakveld that goes deeper, and it has numbered its children both ways. See
    TAAKVELD_SUBCODE_SUFFIX for why the parents can absorb them without double-counting.
    """
    hoofd, _, sub = code.partition(".")
    sub = re.sub(d.TAAKVELD_SUBCODE_SUFFIX, "", sub)[: d.TAAKVELD_SUBCODE_DIEPTE]
    return f"{hoofd}.{sub}" if sub else hoofd


def _lasten_gaan_op(row: Iv3Summary) -> bool:
    """Whether the row's lasten are exactly what the two Lasten breakdowns say they are.

    Both are built from the same euros in _accumulate, so this is true by construction — and
    worth asserting, because the Lasten donuts print the total in the centre and the taakvelden
    as the slices around it. A cent of slack for float addition.
    """
    per_taakveld = sum(row.lasten_per_taakveld.values())
    per_categorie = sum(
        bedrag
        for categorieen in row.lasten_per_hoofdtaakveld_categorie.values()
        for bedrag in categorieen.values()
    )
    return abs(row.lasten - per_taakveld) < 0.01 and abs(row.lasten - per_categorie) < 0.01


def _baten_gaan_op(row: Iv3Summary) -> bool:
    """Whether the row's baten are exactly the four bronnen the Baten pages split them into.

    True by construction — _accumulate routes every baat to precisely one of them — and worth
    asserting anyway: the Baten donuts print the total in the centre and the bronnen as the
    slices around it, so the day this stops holding is the day they stop agreeing on screen.

    A cent of slack for float addition over a few hundred thousand rows.
    """
    bronnen = (
        row.rijk
        + row.spuks
        + sum(row.baten_heffingen_per_categorie.values())
        + sum(row.overige_baten_per_hoofdcategorie.values())
    )
    return abs(row.baten - bronnen) < 0.01


def _accumulate(row: Iv3Summary, categorie: str, code: str, bedrag: float):
    """Fold one (categorie, taakveld) bucket into the gemeente's summary row.

    `code` is the bare taakveld code, e.g. "0.7" or "6.72a".
    """
    soort = categorie[:1]  # "L" lasten, "B" baten
    hoofdcategorie = categorie[1:2]
    hoofdtaakveld = code.split(".")[0]

    # The reservemutaties taakveld is kept apart so the sidebar toggle is an addition
    # rather than a second copy of every column.
    if code == d.TAAKVELD_RESERVEMUTATIES:
        if soort == "L":
            row.reserve_lasten += bedrag
            # Split as well as totalled, mirroring the baten below: the toggle adds
            # reserve_lasten to lasten, and the Lasten donut has to keep summing to it.
            row.reserve_lasten_per_hoofdcategorie[hoofdcategorie] = (
                row.reserve_lasten_per_hoofdcategorie.get(hoofdcategorie, 0.0) + bedrag
            )
        elif soort == "B":
            row.reserve_baten += bedrag
            # Split as well as totalled: the toggle adds reserve_baten to baten, where it
            # falls into the Baten pages' residual bron, and that bron is drawn as a
            # hoofdcategorie split. See _apply_reservemutaties.
            row.reserve_baten_per_hoofdcategorie[hoofdcategorie] = (
                row.reserve_baten_per_hoofdcategorie.get(hoofdcategorie, 0.0) + bedrag
            )
        return

    if soort == "L":
        row.lasten += bedrag
        row.per_hoofdcategorie[hoofdcategorie] = (
            row.per_hoofdcategorie.get(hoofdcategorie, 0.0) + bedrag
        )
        row.per_hoofdtaakveld[hoofdtaakveld] = (
            row.per_hoofdtaakveld.get(hoofdtaakveld, 0.0) + bedrag
        )
        if hoofdtaakveld == d.TAAKVELD_SOCIAAL_DOMEIN:
            row.sociaal += bedrag

        # The two the Lasten pages read. Both partition the lasten — every euro reaches each
        # of them exactly once — which is the invariant _lasten_gaan_op checks.
        taakveld = _rol_taakveld_op(code)
        row.lasten_per_taakveld[taakveld] = row.lasten_per_taakveld.get(taakveld, 0.0) + bedrag
        per_categorie = row.lasten_per_hoofdtaakveld_categorie.setdefault(hoofdtaakveld, {})
        per_categorie[hoofdcategorie] = per_categorie.get(hoofdcategorie, 0.0) + bedrag
    elif soort == "B":
        row.baten += bedrag
        # Every euro of baten lands in exactly one of the three buckets below — the two
        # named bronnen and the residual — which is what makes the Baten donuts' slices sum
        # to their centre figure. The rijk is the odd one out: it is not bucketed here
        # because rijk/spuks already split it, further down.
        if categorie in d.CATEGORIEEN_BATEN_LOKALE_HEFFINGEN:
            row.baten_heffingen_per_categorie[categorie] = (
                row.baten_heffingen_per_categorie.get(categorie, 0.0) + bedrag
            )
        elif categorie != d.CATEGORIE_RIJK:
            row.overige_baten_per_hoofdcategorie[hoofdcategorie] = (
                row.overige_baten_per_hoofdcategorie.get(hoofdcategorie, 0.0) + bedrag
            )

    if categorie in (d.CATEGORIE_SALARISSEN, d.CATEGORIE_INHUUR):
        # Personele lasten: payroll plus the staff hired in to do the same work. Kept per
        # hoofdtaakveld as well, which is the whole of the Benchmark page.
        row.personeel_per_hoofdtaakveld[hoofdtaakveld] = (
            row.personeel_per_hoofdtaakveld.get(hoofdtaakveld, 0.0) + bedrag
        )

    if categorie == d.CATEGORIE_SALARISSEN:
        row.salarissen += bedrag
        # The overhead alongside the total rather than out of it: salarissen stays every
        # taakveld, 0.4 included, and the Managementoverzicht subtracts per request. See
        # TAAKVELD_OVERHEAD.
        if code == d.TAAKVELD_OVERHEAD:
            row.salarissen_overhead += bedrag
    elif categorie == d.CATEGORIE_INHUUR:
        row.inhuur += bedrag
        if code == d.TAAKVELD_OVERHEAD:
            row.inhuur_overhead += bedrag
    elif categorie == d.CATEGORIE_VERBONDEN_PARTIJEN:
        row.verbonden += bedrag
    elif categorie in d.CATEGORIEEN_LOKALE_HEFFINGEN:
        row.heffingen += bedrag
    elif categorie == d.CATEGORIE_RIJK:
        # Booked on 0.7 it is the algemene uitkering uit het gemeentefonds; the same
        # categorie booked on any other taakveld is a specifieke uitkering (SPUK).
        if code == d.TAAKVELD_ALGEMENE_UITKERING:
            row.rijk += bedrag
        else:
            row.spuks += bedrag
            # Kept per hoofdtaakveld too: the Overige baten rijk page is exactly this
            # figure, asked which tasks the rijk is funding.
            row.spuks_per_hoofdtaakveld[hoofdtaakveld] = (
                row.spuks_per_hoofdtaakveld.get(hoofdtaakveld, 0.0) + bedrag
            )
