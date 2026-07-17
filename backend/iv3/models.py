from django.db import models

# Every model here is managed and lives in the app database. The IV3 warehouse is a
# build-time input, not a runtime dependency: sync_iv3_summary reads it on a developer's
# machine to build these tables, dumpdata ships them as the iv3_data fixture, and
# load_iv3_data restores them on deploy. Nothing in the request path can reach the
# warehouse — `grep -rn 'connections\["iv3"\]'` should only ever find sync_iv3_summary.


class Gemeente(models.Model):
    """A municipality, per year — names and mergers change over time.

    Built from the warehouse's `gemeenten` by sync_iv3_summary. Read at request time for
    the sidebar, the provincie filter, and the name on every chart's cohort label.

    Per year, because a gemeente is not a stable row: 2017 carries 388 of them against
    2025's 342, and only 325 of those are the same. A chart labels each year with the names
    that year actually had.
    """

    # The bare code, "GM0606". Only the fact table's `gemeenten` column is space-padded, and
    # the SQL that reads it trims on the way out — see sync_iv3_summary. Nothing downstream
    # of that ever sees a padded code.
    gm_code = models.CharField(max_length=16)
    gm_naam = models.CharField(max_length=255)
    # Nullable, as it is in the warehouse. provincie_options() skips the NULLs.
    prv_code = models.IntegerField(null=True)
    jaar = models.IntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["jaar", "gm_code"], name="unique_gemeente_row")
        ]

    def __str__(self):
        return f"{self.gm_naam} ({self.gm_code}, {self.jaar})"


class Inwoners(models.Model):
    """Population per municipality per year.

    Built from the warehouse's `inwoners` alongside Gemeente. `gemeente` holds the bare
    gm_code, the same key space as Gemeente.gm_code, so the two join on a plain dict.

    Read at request time only by gemeente_options(), for the sidebar. The charts read the
    denormalised Iv3Summary.inwoners instead, which is why this table can be missing a
    gemeente for a year without a figure moving.
    """

    gemeente = models.CharField(max_length=16)
    jaar = models.IntegerField()
    aantal_inwoners = models.IntegerField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["jaar", "gemeente"], name="unique_inwoners_row")
        ]

    def __str__(self):
        return f"{self.gemeente} {self.jaar}: {self.aantal_inwoners}"


class Iv3Summary(models.Model):
    """The dashboard's figures, pre-aggregated per gemeente per report.

    Aggregating the 151M-row fact table takes minutes, which is impossible inside a request
    and unnecessary more than once a year, so `sync_iv3_summary` rolls it up to one row per
    (jaar, verslagsoort, gm_code) — roughly 6.4k rows in total — and every dashboard query
    runs against this instead. This is the table the whole product is drawn from.

    Also the answer to "which years can the dashboard draw": available_jaar_verslagsoort()
    reads the distinct (jaar, verslagsoort) here rather than asking the warehouse what it
    has, so a year cannot reach the sidebar unless its figures actually shipped.

    Amounts are kept in the warehouse's own unit, thousands of euros; the API multiplies
    by definitions.BEDRAG_FACTOR on the way out.
    """

    jaar = models.IntegerField()
    verslagsoort = models.CharField(max_length=16)
    gm_code = models.CharField(max_length=16)
    inwoners = models.IntegerField(null=True)

    # Totals, excluding the reservemutaties taakveld.
    lasten = models.FloatField(default=0)
    baten = models.FloatField(default=0)

    # The reservemutaties taakveld on its own, so the sidebar toggle is an addition
    # rather than a second copy of every column.
    reserve_lasten = models.FloatField(default=0)
    reserve_baten = models.FloatField(default=0)

    sociaal = models.FloatField(default=0)
    salarissen = models.FloatField(default=0)
    inhuur = models.FloatField(default=0)
    verbonden = models.FloatField(default=0)
    rijk = models.FloatField(default=0)
    spuks = models.FloatField(default=0)
    heffingen = models.FloatField(default=0)

    # The overhead half of the two personele categorieën: L1.1 and L3.5.1 booked on taakveld
    # 0.4 alone. A *subset* of salarissen and inhuur above, not a slice taken out of them —
    # those two are what Gemeentelijke Stand and Benchmark have always drawn (every taakveld,
    # overhead included) and they must not move. The Managementoverzicht subtracts per request:
    # its salarislasten are salarissen - salarissen_overhead, its inhuur is inhuur -
    # inhuur_overhead, and its overheadkosten card is the two below added together.
    # See definitions.TAAKVELD_OVERHEAD.
    salarissen_overhead = models.FloatField(default=0)
    inhuur_overhead = models.FloatField(default=0)

    # The balance sheet at year end, for the solvabiliteitsratio. The only figures on this row
    # that are not income or expenditure: everything else here comes out of _AGGREGATE, which
    # drops the A*/P* balansposten outright, so these are read by a query of their own.
    #
    # Zero on every Begroting row, deliberately: the Begroting's balans is unusable, and storing
    # what it says would leave a 213% solvabiliteitsratio lying around for the next reader to
    # trust. See the Balans block in definitions.py. A zero balanstotaal reads as "no figure"
    # wherever it is divided by, which is exactly what it is.
    eigen_vermogen = models.FloatField(default=0)
    balanstotaal = models.FloatField(default=0)

    # Lasten broken down by hoofdcategorie ("1".."7") and hoofdtaakveld ("0".."8").
    # JSON rather than 16 columns: the breakdowns are only ever read whole, and the CBS
    # code space gains a category now and then.
    per_hoofdcategorie = models.JSONField(default=dict)
    per_hoofdtaakveld = models.JSONField(default=dict)

    # Salarissen + inhuur alone, broken down by hoofdtaakveld: the Benchmark page asks
    # where a gemeente's *personele* lasten land, which per_hoofdtaakveld (all lasten)
    # cannot answer.
    personeel_per_hoofdtaakveld = models.JSONField(default=dict)

    # Baten broken down for the Baten pages. The three breakdowns above are lasten-only, and
    # `baten` is a single total, so neither side can answer where a gemeente's income comes
    # from. Each page splits one inkomstenbron further, hence one field per page.
    #
    # Between them these partition `baten` exactly — the invariant sync_iv3_summary keeps is
    #
    #     baten == sum(baten_heffingen_per_categorie) + rijk + spuks
    #              + sum(overige_baten_per_hoofdcategorie)
    #
    # which is what makes each donut's slices sum to the figure in its centre.

    # The B4.3.1 booked off taakveld 0.7 — the SPUKs — per hoofdtaakveld ("0".."8"), which is
    # the question the Overige baten rijk page asks: which tasks the rijk is funding.
    spuks_per_hoofdtaakveld = models.JSONField(default=dict)

    # Keyed by the categorie codes of definitions.CATEGORIEEN_BATEN_LOKALE_HEFFINGEN. Note
    # this counts B3.7 alongside the two the `heffingen` column above sums — the Baten pages
    # and the older pages genuinely disagree on the leges, see that constant.
    baten_heffingen_per_categorie = models.JSONField(default=dict)

    # Everything left of baten once the heffingen and the rijk are taken out, per
    # hoofdcategorie ("1".."7").
    overige_baten_per_hoofdcategorie = models.JSONField(default=dict)

    # The reservemutaties taakveld's baten per hoofdcategorie, kept apart for the same reason
    # reserve_baten is: the toggle folds it in per request. It rides with the residual, since
    # reserve_baten lands in the residual once `baten` grows by it.
    reserve_baten_per_hoofdcategorie = models.JSONField(default=dict)

    # Lasten broken down for the Lasten pages. per_hoofdtaakveld above stops at the
    # hoofdtaakveld ("0".."8"), but those pages ask what sits *inside* one — the detail donuts
    # split hoofdtaakveld 6 into 6.1 Samenkracht, 6.2 Wijkteams and so on.
    #
    # Deliberately not an extension of per_hoofdtaakveld / per_hoofdcategorie: those two do not
    # move when the reservemutaties toggle is on, and making them would shift the Gemeentelijke
    # Stand and Begroting verdeling charts. These carry the toggle instead (see
    # _apply_reservemutaties), which is what lets a donut's slices sum to its centre.
    #
    # The invariant sync_iv3_summary keeps and checks, per row:
    #
    #     lasten == sum(lasten_per_taakveld)
    #            == sum of every value in lasten_per_hoofdtaakveld_categorie

    # Keyed by the rolled-up taakveld code ("0.1", "6.71") — see TAAKVELD_SUBCODE_SUFFIX.
    # Excludes 0.10, which rides in reserve_lasten.
    lasten_per_taakveld = models.JSONField(default=dict)

    # {hoofdtaakveld: {hoofdcategorie: bedrag}}, e.g. {"0": {"1": ..., "3": ...}} — the
    # "Lasten per inwoner per categorie" bar, which asks the question per page. Excludes 0.10.
    lasten_per_hoofdtaakveld_categorie = models.JSONField(default=dict)

    # The reservemutaties taakveld's lasten per hoofdcategorie, the mirror of
    # reserve_baten_per_hoofdcategorie. 0.10 is itself a taakveld of hoofdtaakveld 0, which is
    # where the toggle folds it back to.
    reserve_lasten_per_hoofdcategorie = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["jaar", "verslagsoort", "gm_code"], name="unique_iv3_summary_row"
            )
        ]
        indexes = [models.Index(fields=["jaar", "verslagsoort"])]

    def __str__(self):
        return f"{self.gm_code} {self.verslagsoort}"


class Iv3Taakveld(models.Model):
    """What a taakveld code was called in a given year, for the Lasten detail donuts.

    The names come out of the warehouse's own `taakveldbalanspost`, which carries them next
    to the code ("0.1 Bestuur") and which sync_iv3_summary otherwise throws away when it
    cuts the code off. Lifting them here rather than typing ~59 of them into definitions.py
    keeps them authoritative; the handful the warehouse truncates or never names are
    completed by definitions.TAAKVELD_LABEL_OVERRIDES.

    Per year, because a code is not a stable name: 6.4 was Begeleide participatie through 2024
    and is WSW en beschut werk from 2025, and 8.1 went from Ruimtelijke ordening to Ruimte en
    leefomgeving in 2022. One row per code would label a 2023 chart with 2026's words. A few
    hundred rows is nothing.

    Keyed by the rolled-up code, so 6.71a..d and 6.711..714 both collapse into 6.71 — the same
    key space as Iv3Summary.lasten_per_taakveld, which is what the donut joins against.
    """

    jaar = models.IntegerField()
    code = models.CharField(max_length=16)
    titel = models.CharField(max_length=128)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["jaar", "code"], name="unique_iv3_taakveld_row")
        ]
        ordering = ["jaar", "code"]

    def __str__(self):
        return f"{self.jaar} {self.code} {self.titel}"
