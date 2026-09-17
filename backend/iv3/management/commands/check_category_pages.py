"""Exercise all financial API variants against the local dataset, without writes."""
import json
from urllib.parse import parse_qsl, urlsplit

from django.core.management.base import BaseCommand, CommandError
from django.test import Client

from iv3 import queries
from iv3.management.commands.check_query_budget import URLS
from iv3.models import Iv3Summary


def inspect(value, path="root"):
    errors = []
    if isinstance(value, dict):
        for key in ("name", "label"):
            if key in value and isinstance(value[key], str) and (
                not value[key].strip() or value[key].lower() in {"leeg", "(leeg)", "none"}
            ):
                errors.append(f"{path}.{key}: blank label")
        if isinstance(value.get("waarden"), dict) and isinstance(value.get("totaal"), (int, float)):
            amounts = [v for v in value["waarden"].values() if v is not None]
            # Each API slice is rounded to cents independently.
            if abs(sum(amounts) - value["totaal"]) > .005 * (len(amounts) + 1) + 1e-6:
                errors.append(f"{path}: slices {sum(amounts):.2f} != total {value['totaal']:.2f}")
        if "totalen" in value and "series" in value and "data" in value:
            for index, (row, total) in enumerate(zip(value["data"], value["totalen"])):
                if total is None:
                    continue
                amounts = [row.get(series["key"]) or 0 for series in value["series"]]
                if abs(sum(amounts) - total) > .005 * (len(amounts) + 1) + 1e-6:
                    errors.append(f"{path}.data[{index}]: stack does not reconcile")
        if "series" in value:
            keys = {s["key"] for s in value["series"]}
            for side in ("links", "rechts"):
                if isinstance(value.get(side), dict) and "waarden" in value[side]:
                    if keys != set(value[side]["waarden"]):
                        errors.append(f"{path}.{side}: legend/value keys differ")
        for key, child in value.items():
            errors.extend(inspect(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            errors.extend(inspect(child, f"{path}[{index}]"))
    return errors


class Command(BaseCommand):
    help = "Check every year/report/page, reserve toggle and selection for blank labels and donut reconciliation."

    def add_arguments(self, parser):
        parser.add_argument("--jaar", type=int, help="Limit to a year for a quick check")

    def handle(self, *args, **options):
        pairs = sorted((year, report) for year, reports in queries.available_jaar_verslagsoort().items()
                       for report in reports if not options["jaar"] or year == options["jaar"])
        if not pairs:
            raise CommandError("No summary rows to check")
        client = Client(HTTP_HOST="localhost")
        failures, count = [], 0
        for year, report in pairs:
            codes = list(Iv3Summary.objects.filter(jaar=year, verslagsoort=report)
                         .order_by("gm_code").values_list("gm_code", flat=True))
            selections = [{"referentie": "alle"}, {"gemeente": codes[0], "referentie": ",".join(codes[1:4])}]
            for url in URLS:
                parsed = urlsplit(url)
                base = dict(parse_qsl(parsed.query))
                modes = ("overzicht", "per-inwoner", "absolute-bedragen") if "/begroting/" in url else (None,)
                for mode in modes:
                    for reserve in ("false", "true"):
                        for selection in selections:
                            params = {**base, **selection, "jaar": year, "verslagsoort": report, "reserve": reserve}
                            if mode:
                                params["weergave"] = mode
                            response = client.get(parsed.path, params)
                            count += 1
                            errors = inspect(response.json()) if response.status_code == 200 else [f"HTTP {response.status_code}"]
                            if response.status_code == 200:
                                payload = response.json()
                                if payload.get("jaar") != year or ("verslagsoort" in payload and payload["verslagsoort"] != report):
                                    errors.append("response silently selected a different year/report")
                            if errors:
                                failures.append(dict(path=parsed.path, params=params, errors=errors))
            self.stdout.write(f"{year} {report}: {count} responses checked, {len(failures)} failures")
            self.stdout.flush()
        self.stdout.write(json.dumps(dict(responses=count, failures=failures), ensure_ascii=False, indent=2))
        if failures:
            raise SystemExit(1)
