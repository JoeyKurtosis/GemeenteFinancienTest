"""Read-only category coverage audit. Amounts are euros, never pooled across reports."""
import gzip
import json
import math
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand

from iv3 import definitions as d, queries
from iv3.models import Gemeente, Iv3Summary, Iv3Taakveld

# All stored breakdowns, including reserve/resultaat components and legacy diagnostics.
MAIN = {
    "per_hoofdtaakveld": ["gemeentelijke-stand", "trends", "begroting"],
    "personeel_per_hoofdtaakveld": ["benchmark"],
    "spuks_per_hoofdtaakveld": ["baten/rijk"],
}
CATEGORIES = {
    "per_hoofdcategorie": ["gemeentelijke-stand", "trends", "begroting"],
    "overige_baten_per_hoofdcategorie": ["baten/overig", "begroting"],
    "reserve_baten_per_hoofdcategorie": ["baten/overig", "begroting"],
    "reserve_lasten_per_hoofdcategorie": ["lasten", "begroting"],
    "resultaat_lasten_per_hoofdcategorie": ["lasten"],
    "naamloze_lasten_per_hoofdcategorie": ["legacy diagnostic (not rendered)"],
}


def audit(rows, titles, municipalities):
    issues = []
    pairs = Counter()
    checked = 0

    def record(row, kind, field, code, amount, pages):
        issues.append(dict(kind=kind, jaar=row["jaar"], verslagsoort=row["verslagsoort"],
                           gemeente=row["gm_code"], field=field, code=code,
                           amount_eur=round(amount * d.BEDRAG_FACTOR, 2), pages=pages))

    for row in rows:
        checked += 1
        pairs[(row["jaar"], row["verslagsoort"])] += 1
        def check(field, labels, pages, values=None):
            for code, amount in (row.get(field, {}) if values is None else values).items():
                if code not in labels or (isinstance(labels, dict) and not str(labels[code] or "").strip()):
                    record(row, "unmapped_code" if code else "missing_code", field, code, amount, pages)
        for field, pages in MAIN.items():
            check(field, d.HOOFDTAAKVELD_LABELS, pages)
        for field, pages in CATEGORIES.items():
            check(field, d.HOOFDCATEGORIE_LABELS, pages)
        check("baten_heffingen_per_categorie", d.CATEGORIEEN_BATEN_LOKALE_HEFFINGEN,
              ["baten/heffingen", "begroting"])
        check("baten_heffingen_per_taakveld", d.BATEN_HEFFINGEN_TAAKVELDEN,
              ["baten/heffingen", "begroting"])
        check("overige_baten_grond_huren", {d.CATEGORIE_BATEN_GROND, *d.CATEGORIEEN_BATEN_HUREN_PACHTEN},
              ["baten/overig", "begroting"])
        for main, values in row.get("lasten_per_hoofdtaakveld_categorie", {}).items():
            check("lasten_per_hoofdtaakveld_categorie", d.HOOFDTAAKVELD_LABELS,
                  ["lasten"], {main: sum(values.values())})
            check("lasten_per_hoofdtaakveld_categorie/" + main, d.HOOFDCATEGORIE_LABELS,
                  ["lasten/" + main], values)
        for code, amount in row.get("lasten_per_taakveld", {}).items():
            title = titles.get((row["jaar"], code), "").strip()
            if not title.strip() or title.lower() in {"(leeg)", "leeg", "none"}:
                kind = "resolved_parent_label" if code in d.TAAKVELD_LABEL_OVERRIDES else (
                    "missing_label" if (row["jaar"], code) in titles else "unmapped_code")
                record(row, kind, "lasten_per_taakveld", code, amount,
                       ["lasten", "lasten/" + code.split(".")[0]])
        # Summary units are thousands of euros: tolerate less than one euro per row.
        partitions = [
            ("per_hoofdcategorie", "lasten", ["gemeentelijke-stand", "trends", "begroting"]),
            ("per_hoofdtaakveld", "lasten", ["gemeentelijke-stand", "trends", "begroting"]),
            ("lasten_per_taakveld", "lasten", ["lasten"]),
            ("spuks_per_hoofdtaakveld", "spuks", ["baten/rijk"]),
            ("reserve_lasten_per_hoofdcategorie", "reserve_lasten", ["lasten", "begroting"]),
            ("reserve_baten_per_hoofdcategorie", "reserve_baten", ["baten", "begroting"]),
        ]
        for field, total, pages in partitions:
            if field in row and total in row:
                difference = row[total] - sum(row[field].values())
                if not math.isclose(difference, 0, abs_tol=.00001):
                    record(row, "unreconciled_amount", field, "", difference, pages)
        if not municipalities.get((row["jaar"], row["gm_code"]), "").strip():
            record(row, "missing_municipality_label", "gemeente", row["gm_code"], 0,
                   ["filters", "referentiegroep", "all cohort charts"])
    if "leeg" in queries.BATEN_HEFFINGEN_SLICES:
        issues.append(dict(kind="artificial_blank", pages=["baten/heffingen"], amount_eur=0))
    return dict(rows_checked=checked, coverage=[dict(jaar=y, verslagsoort=v, rows=n)
                for (y, v), n in sorted(pairs.items())],
                counts=dict(Counter(i["kind"] for i in issues)), findings=issues)


class Command(BaseCommand):
    help = "Audit all IV3 category codes and labels without changing data; emits JSON in euros."

    def add_arguments(self, parser):
        parser.add_argument("--fixture", action="store_true", help="Read bundled fixture instead of database")
        parser.add_argument("--strict", action="store_true", help="Exit 1 for unresolved findings")

    def handle(self, *args, **options):
        if options["fixture"]:
            path = Path(__file__).resolve().parents[2] / "fixtures/iv3_data.json.gz"
            with gzip.open(path, "rt") as stream:
                data = json.load(stream)
            rows = [o["fields"] for o in data if o["model"] == "iv3.iv3summary"]
            titles = {(o["fields"]["jaar"], o["fields"]["code"]): o["fields"]["titel"] or ""
                      for o in data if o["model"] == "iv3.iv3taakveld"}
            names = {(o["fields"]["jaar"], o["fields"]["gm_code"]): o["fields"]["gm_naam"]
                     for o in data if o["model"] == "iv3.gemeente"}
        else:
            rows = Iv3Summary.objects.values().iterator()
            titles = {(y, c): t or "" for y, c, t in Iv3Taakveld.objects.values_list("jaar", "code", "titel")}
            names = {(y, c): n for y, c, n in Gemeente.objects.values_list("jaar", "gm_code", "gm_naam")}
        result = audit(rows, titles, names)
        self.stdout.write(json.dumps(result, ensure_ascii=False, indent=2))
        if options["strict"] and (not result["rows_checked"] or any(
            k != "resolved_parent_label" for k in result["counts"]
        )):
            raise SystemExit(1)
