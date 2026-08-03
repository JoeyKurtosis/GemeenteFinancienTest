"""Assert that no chart endpoint has grown an N+1.

    python manage.py check_query_budget

Every chart endpoint should answer in a handful of queries: one per year of the x-axis, plus
the lookups around them. The number does not depend on how many gemeenten are in the
referentiegroep — that is the whole point, and it is what this checks.

The failure this exists to catch is the deferred-field N+1. queries.py narrows each page's
year-loop with .only(), and the invariant stated above the _VELDEN tuples is that a column
read anywhere on a page's path must be listed in its tuple. Miss one and nothing breaks and
no test fails — the attribute is simply deferred, and touching it costs one SELECT per row.
Two such columns went missing from LASTEN_VELDEN and took `?taakveld=6` to 3.903 queries and
2,8 seconds before anyone measured it. The symptom is invisible in the response; only the
query count shows it.

Run it after touching queries.py, especially after reading a column a page did not read
before, or after adding a Measure whose expression names a new field.
"""

import time

from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from django.test import Client
from django.test.utils import override_settings

#: Every chart endpoint, at the parameters that cost the most: `referentie=alle` is what the
#: dashboard sends by default and expands to every gemeente in the year (~342), and the Lasten
#: and Baten sub-pages each walk a different branch of the breakdown code.
URLS = [
    "/api/iv3/filters/",
    "/api/iv3/gemeentelijke-stand/?referentie=alle",
    "/api/iv3/begroting/?referentie=alle",
    "/api/iv3/benchmark/?referentie=alle",
    "/api/iv3/managementoverzicht/?referentie=alle",
    "/api/iv3/lasten/?referentie=alle",
    *[f"/api/iv3/lasten/?taakveld={code}&referentie=alle" for code in "012345678"],
    "/api/iv3/baten/?referentie=alle",
    *[f"/api/iv3/baten/?bron={bron}&referentie=alle" for bron in ("rijk", "heffingen", "overig")],
]

#: Comfortably above the measured worst case (14) and far below what a per-row N+1 produces
#: (hundreds at least, since the cheapest one runs once per gemeente). Set so that tightening
#: it is never needed to catch the bug it is for — a regression overshoots by two orders of
#: magnitude, not by two queries. Raise it only for an endpoint that genuinely needs more
#: round trips, and say why.
BUDGET = 25


class Command(BaseCommand):
    help = "Fail if a chart endpoint issues more queries than its budget (catches N+1 regressions)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--budget",
            type=int,
            default=BUDGET,
            help=f"Max queries per endpoint (default {BUDGET}).",
        )

    def handle(self, *args, **options):
        budget = options["budget"]
        # connection.queries only records when DEBUG is on, whatever the environment runs with.
        with override_settings(DEBUG=True):
            over = self._run(budget)

        if over:
            self.stderr.write(
                self.style.ERROR(
                    f"\n{len(over)} endpoint(s) over the budget of {budget} queries. "
                    "This is what a deferred-field N+1 looks like — check that every column the "
                    "page reads is named in its _VELDEN tuple in queries.py."
                )
            )
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS(f"\nAll {len(URLS)} endpoints within {budget} queries."))

    def _run(self, budget: int) -> list[str]:
        client = Client()
        over = []

        for url in URLS:
            reset_queries()
            started = time.perf_counter()
            response = client.get(url)
            elapsed = (time.perf_counter() - started) * 1000
            count = len(connection.queries)

            if response.status_code != 200:
                self.stderr.write(self.style.ERROR(f"  HTTP {response.status_code}  {url}"))
                over.append(url)
                continue

            line = f"  {count:5d} queries  {elapsed:7.0f} ms  {url}"
            if count > budget:
                self.stderr.write(self.style.ERROR(line + f"  OVER BUDGET ({budget})"))
                over.append(url)
            else:
                self.stdout.write(line)

        return over
