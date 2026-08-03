"""Seed the default calculation measures from queries.py.

Idempotent: only inserts measures whose key does not yet exist. Run this after
migrating to populate the Measure table for the first time, or to restore any
deleted system defaults without touching user-modified formulas. load_iv3_data
calls it on every deploy, which is what makes a fresh database arrive seeded.

With --force it also overwrites the defaults' own rows, reverting an edited
formula. This is what the "Standaardwaarden herstellen" button runs. It still
touches nothing but the keys listed below, so a measure an admin created is
left alone — the button used to empty the table first and destroyed those.
"""

from django.core.management.base import BaseCommand

from iv3.models import Measure

DEFAULT_MEASURES = [
    {
        "key": "uitgaven",
        "name": "Totale uitgaven",
        "expression": "lasten",
        "description": "Totale lasten exclusief reservemutaties.",
        "page": "Gemeentelijke Stand, Begroting, Managementoverzicht",
    },
    {
        "key": "sociaal",
        "name": "Sociaal domein",
        "expression": "sociaal",
        "description": "Lasten sociaal domein (hoofdtaakveld 6).",
        "page": "Gemeentelijke Stand",
    },
    {
        "key": "personeel",
        "name": "Personele lasten",
        "expression": "salarissen + inhuur",
        "description": "Totale personeelskosten: salarissen plus ingeleend personeel.",
        "page": "Gemeentelijke Stand, Benchmark",
    },
    {
        "key": "inhuur",
        "name": "Inhuur",
        "expression": "inhuur",
        "description": "Ingeleend personeel (categorie L3.5.1).",
        "page": "Gemeentelijke Stand",
    },
    {
        "key": "verbonden",
        "name": "Verbonden partijen",
        "expression": "verbonden",
        "description": "Inkomensoverdrachten aan gemeenschappelijke regelingen (categorie L4.3.3).",
        "page": "Gemeentelijke Stand",
    },
    {
        "key": "rijk",
        "name": "Algemene uitkering",
        "expression": "rijk",
        "description": "Algemene uitkering uit het gemeentefonds (B4.3.1 op taakveld 0.7).",
        "page": "Gemeentelijke Stand, Baten, Begroting",
    },
    {
        "key": "heffingen",
        "name": "Lokale heffingen",
        "expression": "heffingen",
        "description": "Gemeentelijke belastingen en heffingen (B2.2.1 + B2.2.2), zonder leges.",
        "page": "Gemeentelijke Stand",
    },
    # Not the same figure as `heffingen` above, and deliberately a second measure rather than a
    # widened first: the Baten-pagina's tellen de leges (B3.7) mee en de Gemeentelijke Stand niet.
    # Zie CATEGORIEEN_BATEN_LOKALE_HEFFINGEN — het verschil is ~EUR 148 per inwoner.
    {
        "key": "heffingen-breed",
        "name": "Lokale heffingen (incl. leges)",
        "expression": "heffingen_breed",
        "description": "Lokale heffingen zoals de Baten-pagina's ze tellen: B2.2.1 + B2.2.2 + B3.7.",
        "page": "Baten, Begroting, Managementoverzicht",
    },
    {
        "key": "spuks",
        "name": "Specifieke uitkeringen",
        "expression": "spuks",
        "description": "Specifieke uitkeringen van het Rijk (B4.3.1 excl. taakveld 0.7).",
        "page": "Gemeentelijke Stand, Baten, Begroting",
    },
    {
        "key": "inkomsten",
        "name": "Totale inkomsten",
        "expression": "baten",
        "description": "Totale baten exclusief reservemutaties.",
        "page": "Begroting",
    },
    # De vier Baten-bronnen (rijk, spuks, heffingen-breed, overig-baten) partitioneren `baten`
    # precies zolang de formules de standaardwaarden zijn. Zie _bron_waarden in queries.py.
    {
        "key": "resultaat",
        "name": "Resultaat (saldo)",
        "expression": "baten - lasten",
        "description": "Verschil tussen baten en lasten (positief = overschot, negatief = tekort).",
        "page": "Begroting",
    },
    {
        "key": "overschot",
        "name": "Overschot/tekort (%)",
        "expression": "(baten - lasten) / (baten + lasten) * 100",
        "description": "Saldo als percentage van de totale kasstroom.",
        "page": "Gemeentelijke Stand",
    },
    {
        "key": "overig-baten",
        "name": "Overige inkomsten",
        # heffingen_breed, niet heffingen: dit residu moet met de Baten-donut kloppen, en die
        # telt de leges bij de heffingen. Met de smalle kolom zouden de leges in dit residu
        # belanden en de vier bronnen niet langer optellen tot `baten`.
        "expression": "baten - rijk - spuks - heffingen_breed",
        "description": "Residuele baten na aftrek van Rijk, SPUKs en lokale heffingen (incl. leges).",
        "page": "Baten, Begroting",
    },
    {
        "key": "solvabiliteit",
        "name": "Solvabiliteitsratio",
        "expression": "eigen_vermogen / balanstotaal * 100",
        "description": "Eigen vermogen als percentage van het balanstotaal.",
        "page": "Managementoverzicht",
    },
    {
        "key": "mgmt-salarissen",
        "name": "Salarislasten (excl. overhead)",
        "expression": "salarissen - salarissen_overhead",
        "description": "Salarissen exclusief overhead (taakveld 0.4).",
        "page": "Managementoverzicht",
    },
    {
        "key": "mgmt-inhuur",
        "name": "Inhuur (excl. overhead)",
        "expression": "inhuur - inhuur_overhead",
        "description": "Ingeleend personeel exclusief overhead (taakveld 0.4).",
        "page": "Managementoverzicht",
    },
    {
        "key": "mgmt-overhead",
        "name": "Overheadkosten",
        "expression": "salarissen_overhead + inhuur_overhead",
        "description": "Salarissen plus inhuur geboekt op taakveld 0.4.",
        "page": "Managementoverzicht",
    },
]


#: The keys this command owns. Anything else in the table was created by an admin and is never
#: touched here, not even by --force.
DEFAULT_KEYS = frozenset(m["key"] for m in DEFAULT_MEASURES)


class Command(BaseCommand):
    help = "Seed the default calculation measures (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Also overwrite the default measures that already exist, reverting edits to them.",
        )

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for m in DEFAULT_MEASURES:
            if options["force"]:
                _, was_created = Measure.objects.update_or_create(key=m["key"], defaults=m)
                updated += not was_created
            else:
                _, was_created = Measure.objects.get_or_create(key=m["key"], defaults=m)
            created += was_created

        if not options["verbosity"]:
            return
        if options["force"]:
            self.stdout.write(f"Measures: {created} created, {updated} reset to their default.")
        else:
            self.stdout.write(f"Measures: {created} created, {len(DEFAULT_MEASURES) - created} already existed.")
