"""Seed the default calculation measures from queries.py.

Idempotent: only inserts measures whose key does not yet exist. Run this after
migrating to populate the Measure table for the first time, or to restore any
deleted system defaults without touching user-modified formulas.
"""

from django.core.management.base import BaseCommand

from iv3.models import Measure

DEFAULT_MEASURES = [
    {
        "key": "uitgaven",
        "name": "Totale uitgaven",
        "expression": "lasten",
        "description": "Totale lasten exclusief reservemutaties.",
        "page": "Gemeentelijke Stand, Begroting",
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
        "page": "Gemeentelijke Stand, Baten",
    },
    {
        "key": "heffingen",
        "name": "Lokale heffingen",
        "expression": "heffingen",
        "description": "Gemeentelijke belastingen en heffingen (B2.2.1 + B2.2.2).",
        "page": "Gemeentelijke Stand, Baten",
    },
    {
        "key": "spuks",
        "name": "Specifieke uitkeringen",
        "expression": "spuks",
        "description": "Specifieke uitkeringen van het Rijk (B4.3.1 excl. taakveld 0.7).",
        "page": "Gemeentelijke Stand, Baten",
    },
    {
        "key": "inkomsten",
        "name": "Totale inkomsten",
        "expression": "baten",
        "description": "Totale baten exclusief reservemutaties.",
        "page": "Begroting",
    },
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
        "expression": "baten - rijk - spuks - heffingen",
        "description": "Residuele baten na aftrek van Rijk, SPUKs en lokale heffingen.",
        "page": "Baten",
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


class Command(BaseCommand):
    help = "Seed the default calculation measures (idempotent)."

    def handle(self, *args, **options):
        created = 0
        for m in DEFAULT_MEASURES:
            _, was_created = Measure.objects.get_or_create(
                key=m["key"],
                defaults=m,
            )
            if was_created:
                created += 1

        self.stdout.write(f"Measures: {created} created, {len(DEFAULT_MEASURES) - created} already existed.")
