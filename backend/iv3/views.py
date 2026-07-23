from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from iv3 import definitions as d
from iv3 import queries

#: The referentiegroep as "every gemeente in the year". The client cannot name those ~342 codes
#: until /filters/ has answered, and making every chart wait for that is what put four sequential
#: copies of the same heavy request on a cold page load. It sends this instead; see
#: ChartView._referentie for why it resolves to codes rather than to "no filter".
REFERENTIE_ALLE = "alle"


class FilterOptionsView(APIView):
    """Every option the dashboard's sidebar filters need, for one year.

    Gemeenten and verslagsoorten both depend on the year — municipalities merge, and a
    year only carries a Jaarrekening once it has been filed — so the client refetches
    this when the year changes.
    """

    # The dashboard is public; DRF defaults to IsAuthenticated.
    permission_classes = [AllowAny]

    def get(self, request):
        per_jaar = queries.available_jaar_verslagsoort()
        jaren = sorted(per_jaar, reverse=True)

        if not jaren:
            return Response({"jaren": [], "jaar": None, "gemeenten": [], "verslagsoorten": [], "inwonergroepen": [], "provincies": []})

        try:
            jaar = int(request.query_params.get("jaar", ""))
        except ValueError:
            jaar = jaren[0]
        if jaar not in per_jaar:
            jaar = jaren[0]

        return Response(
            {
                "jaren": jaren,
                "jaar": jaar,
                "gemeenten": queries.gemeente_options(jaar),
                "verslagsoorten": queries.verslagsoort_options(per_jaar[jaar]),
                "inwonergroepen": queries.inwonergroep_options(),
                "provincies": queries.provincie_options(jaar),
            }
        )


class ChartView(APIView):
    """Shared plumbing for the chart endpoints: pin the request to a year and a report.

    Both pages read the pre-aggregated Iv3Summary rather than the warehouse — see
    sync_iv3_summary for why.
    """

    permission_classes = [AllowAny]

    #: What to answer when the selection has no data behind it at all.
    leeg: dict = {}

    def get(self, request):
        params = request.query_params

        per_jaar = queries.available_jaar_verslagsoort()
        jaren = sorted(per_jaar, reverse=True)
        if not jaren:
            return Response({"jaar": None, **self.leeg})

        try:
            jaar = int(params.get("jaar", ""))
        except ValueError:
            jaar = jaren[0]
        if jaar not in per_jaar:
            jaar = jaren[0]

        verslagsoort = self._resolve_verslagsoort(params.get("verslagsoort"), jaar, per_jaar)
        if verslagsoort is None:
            # A year with no report the dashboard understands is empty, not an error.
            return Response({"jaar": jaar, **self.leeg})

        return Response(self.chart(params, jaar, verslagsoort))

    def chart(self, params, jaar: int, verslagsoort: str) -> dict:
        raise NotImplementedError

    def _resolve_verslagsoort(self, requested: str | None, jaar: int, per_jaar: dict) -> str | None:
        """See queries.resolve_verslagsoort — the assistant applies the same rule."""
        return queries.resolve_verslagsoort(requested, jaar, per_jaar)

    @staticmethod
    def _codes(params, key: str) -> list[str]:
        """A comma-joined multi-select param, as the URL carries it."""
        return [code for code in params.get(key, "").split(",") if code]

    def _referentie(self, params, jaar: int) -> list[str]:
        """The referentiegroep, with the `alle` shorthand resolved to the codes it stands for.

        The same kind of pinning as _resolve_verslagsoort above: the client sends shorthand, and
        the view turns it into something the selected year actually has. Below this line
        `referentie` is always a concrete list, so queries.py never has to know the sentinel
        exists.

        Resolved to every code rather than left as "no filter", which is what it looks like it
        ought to mean. The group is every gemeente in the *selected* year, and the charts measure
        it across every year on the x-axis: 2017 carries 388 gemeenten against 2024's 342, of
        which only 325 are the same. "No filter" would quietly redraw the referentiegroep's entire
        history over a different set of municipalities — the 2017 point would become a mean over
        388 where today it is a mean over 325. These are the same codes the client used to send
        verbatim, so no figure moves.
        """
        if params.get("referentie") == REFERENTIE_ALLE:
            return queries.alle_gemeente_codes(jaar)
        return self._codes(params, "referentie")


class GemeentelijkeStandView(ChartView):
    """Every chart on the Gemeentelijke Stand page, for one filter selection."""

    leeg = {"cohorten": [], "lijnen": {}, "verdeling": {}, "spuks": []}

    def chart(self, params, jaar, verslagsoort):
        # The charts compare inwonergroepen, so `referentie` is not a cohort here but the
        # report's Gemeente slicer: which municipalities count towards their class's average.
        #
        # The `alle` sentinel is left as "no filter" rather than resolved through
        # _referentie, deliberately unlike every other page. There it stands for a
        # referentiegroep whose membership has to hold still across the x-axis, so it becomes
        # the selected year's codes. Here it stands for the country, and pinning it to one
        # year's codes would drop every gemeente that has since merged out of existence from
        # the earlier years of these lines.
        referentie = self._codes(params, "referentie")
        gemeenten = None if params.get("referentie") == REFERENTIE_ALLE else referentie or None

        return queries.gemeentelijke_stand(
            jaar=jaar,
            verslagsoort=verslagsoort,
            inwoner=self._codes(params, "inwoner"),
            gemeenten=gemeenten,
            reserve=params.get("reserve") == "true",
        )


class BegrotingView(ChartView):
    """The Begroting page: what comes in and what goes out, per inhabitant or in euros."""

    leeg = {"cohorten": [], "resultaat": [], "uitgavenPerJaar": [], "inkomsten": None, "verdeling": {}}

    def chart(self, params, jaar, verslagsoort):
        weergave = params.get("weergave")
        # The tab is part of the URL, so a stale or hand-edited one is a normal thing to
        # receive: fall back to the overview rather than erroring the page out.
        if weergave not in queries.BEGROTING_WEERGAVEN:
            weergave = "overzicht"

        return queries.begroting(
            jaar=jaar,
            verslagsoort=verslagsoort,
            gemeente=params.get("gemeente") or None,
            referentie=self._referentie(params, jaar),
            reserve=params.get("reserve") == "true",
            weergave=weergave,
        )


class BenchmarkView(ChartView):
    """The Benchmark page: personele lasten, your gemeente against its referentiegroep."""

    leeg = {"cohorten": [], "trend": [], "categorie": [], "referentiegroep": [], "taakvelden": None}

    def chart(self, params, jaar, verslagsoort):
        return queries.benchmark(
            jaar=jaar,
            verslagsoort=verslagsoort,
            gemeente=params.get("gemeente") or None,
            referentie=self._referentie(params, jaar),
        )


class BatenView(ChartView):
    """The Baten pages: where a gemeente's income comes from, against its referentiegroep.

    One endpoint for all four, because they are one page drawn four times — `bron` says
    which. See queries.BATEN_PAGINAS.
    """

    leeg = {"cohorten": [], "trend": [], "referentiegroep": [], "verdeling": None}

    def chart(self, params, jaar, verslagsoort):
        bron = params.get("bron")
        # The tab is part of the URL, so a stale or hand-edited one is a normal thing to
        # receive: fall back to the overview rather than erroring the page out.
        if bron not in queries.BATEN_PAGINAS:
            bron = "alle"

        return queries.baten(
            jaar=jaar,
            verslagsoort=verslagsoort,
            bron=bron,
            gemeente=params.get("gemeente") or None,
            referentie=self._referentie(params, jaar),
            reserve=params.get("reserve") == "true",
        )


class LastenView(ChartView):
    """The Lasten pages: what a gemeente spends, against its referentiegroep.

    One endpoint for all ten — they are one page drawn per hoofdtaakveld, plus the overview.
    `taakveld` says which: "alle", or a hoofdtaakveld code.
    """

    leeg = {"cohorten": [], "trend": [], "referentiegroep": [], "verdeling": None, "categorie": None}

    def chart(self, params, jaar, verslagsoort):
        taakveld = params.get("taakveld")
        # The page is part of the URL, so a stale or hand-edited code is a normal thing to
        # receive: fall back to the overview rather than erroring the page out.
        if taakveld not in d.HOOFDTAAKVELD_LABELS:
            taakveld = queries.LASTEN_OVERZICHT

        return queries.lasten(
            jaar=jaar,
            verslagsoort=verslagsoort,
            taakveld=taakveld,
            gemeente=params.get("gemeente") or None,
            referentie=self._referentie(params, jaar),
            reserve=params.get("reserve") == "true",
        )


class ManagementoverzichtView(ChartView):
    """The Managementoverzicht: six figures, your gemeente against its referentiegroep.

    The solvabiliteit rides along in a field of its own — it is drawn off the Jaarrekening
    whatever verslagsoort was asked for, and says which one. See queries.managementoverzicht.
    """

    leeg = {"cohorten": [], "lijnen": {}, "solvabiliteit": None}

    def chart(self, params, jaar, verslagsoort):
        return queries.managementoverzicht(
            jaar=jaar,
            verslagsoort=verslagsoort,
            gemeente=params.get("gemeente") or None,
            referentie=self._referentie(params, jaar),
            reserve=params.get("reserve") == "true",
        )


class DashboardSettingsView(APIView):
    """GET/PUT the configurable dashboard parameters. Admin only."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        from iv3.settings_bridge import get_settings

        s = get_settings()
        return Response({
            "cpi_per_jaar": s.CPI_PER_JAAR,
            "cao_lonen_per_jaar": s.CAO_LONEN_PER_JAAR,
            "inwonergroepen": s.INWONERGROEPEN,
            "aggregation_method": s.AGGREGATION_METHOD,
            "taakveld_label_overrides": s.TAAKVELD_LABEL_OVERRIDES,
        })

    def put(self, request):
        from iv3.models import DashboardSettings
        from iv3.serializers import DashboardSettingsSerializer

        instance = DashboardSettings.load()
        serializer = DashboardSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DashboardSettingsDefaultsView(APIView):
    """Returns the hardcoded defaults from definitions.py so the frontend can offer a reset."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "cpi_per_jaar": d.CPI_PER_JAAR,
            "cao_lonen_per_jaar": d.CAO_LONEN_PER_JAAR,
            "inwonergroepen": d.INWONERGROEPEN,
            "aggregation_method": "equal_weight",
            "taakveld_label_overrides": d.TAAKVELD_LABEL_OVERRIDES,
        })


class MeasureListView(APIView):
    """List all measures or create a new one. Admin only."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        from iv3.expression_eval import ALLOWED_FIELDS, FIELD_DESCRIPTIONS
        from iv3.models import Measure
        from iv3.serializers import MeasureSerializer

        measures = Measure.objects.all()
        fields = [
            {"name": name, "description": FIELD_DESCRIPTIONS.get(name, "")}
            for name in sorted(ALLOWED_FIELDS)
        ]
        return Response({
            "measures": MeasureSerializer(measures, many=True).data,
            "fields": fields,
        })

    def post(self, request):
        from iv3.serializers import MeasureSerializer

        serializer = MeasureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class MeasureDetailView(APIView):
    """Get, update, or delete a single measure. Admin only."""

    permission_classes = [IsAdminUser]

    def get(self, request, key):
        from iv3.models import Measure
        from iv3.serializers import MeasureSerializer

        try:
            measure = Measure.objects.get(key=key)
        except Measure.DoesNotExist:
            return Response({"detail": "Measure niet gevonden."}, status=404)
        return Response(MeasureSerializer(measure).data)

    def put(self, request, key):
        from iv3.models import Measure
        from iv3.serializers import MeasureSerializer

        try:
            measure = Measure.objects.get(key=key)
        except Measure.DoesNotExist:
            return Response({"detail": "Measure niet gevonden."}, status=404)

        serializer = MeasureSerializer(measure, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, key):
        from iv3.models import Measure

        try:
            measure = Measure.objects.get(key=key)
        except Measure.DoesNotExist:
            return Response({"detail": "Measure niet gevonden."}, status=404)
        measure.delete()
        return Response(status=204)


class MeasureResetView(APIView):
    """Reset all measures to their system defaults. Admin only."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        from django.core.management import call_command
        from iv3.models import Measure

        Measure.objects.all().delete()
        call_command("init_measures")
        return Response({"detail": "Measures hersteld naar standaardwaarden."})
