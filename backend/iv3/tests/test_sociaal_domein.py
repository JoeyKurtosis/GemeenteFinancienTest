"""Jeugdhulp/PGB rollups remain part of Sociaal domein in every chart."""

from django.test import TestCase

from iv3 import definitions as d, queries
from iv3.models import Gemeente, Iv3Summary, Iv3Taakveld
from iv3.settings_bridge import clear_settings_cache


class SociaalDomeinTests(TestCase):
    codes_per_jaar = {
        2024: {"6.73": 30, "6.74": 20},
        2025: {"6.75": 20, "6.76": 20, "6.79": 10},
    }

    @classmethod
    def setUpTestData(cls):
        for jaar, extra in cls.codes_per_jaar.items():
            for code in ["0.1", "6.1", *extra]:
                Iv3Taakveld.objects.create(
                    jaar=jaar, code=code,
                    titel=d.TAAKVELD_LABEL_OVERRIDES.get(code, code),
                )
            for gm, factor, inwoners in [("GM0001", 1, 1000), ("GM0002", 3, 2000)]:
                Gemeente.objects.create(jaar=jaar, gm_code=gm, gm_naam=gm)
                Iv3Summary.objects.create(
                    jaar=jaar, verslagsoort=f"{jaar}X000", gm_code=gm, inwoners=inwoners,
                    lasten=350 * factor, baten=400 * factor,
                    per_hoofdtaakveld={"0": 200 * factor, "6": 150 * factor},
                    per_hoofdcategorie={"1": 30 * factor, "3": 300 * factor, "4": 20 * factor},
                    lasten_per_taakveld={
                        code: value * factor for code, value in {"0.1": 200, "6.1": 100, **extra}.items()
                    },
                    lasten_per_hoofdtaakveld_categorie={
                        "0": {"3": 200 * factor},
                        "6": {"1": 30 * factor, "3": 100 * factor, "4": 20 * factor},
                    },
                    personeel_per_hoofdtaakveld={"6": 40 * factor},
                    naamloze_lasten_per_hoofdcategorie={
                        "1": 10 * factor, "3": 30 * factor, "4": 10 * factor,
                    },
                    reserve_lasten=5 * factor,
                    reserve_lasten_per_hoofdcategorie={"7": 5 * factor},
                    resultaat_lasten_per_hoofdcategorie={"7": 7 * factor},
                )

    def setUp(self):
        clear_settings_cache()
        self.addCleanup(clear_settings_cache)

    def test_begroting_and_lasten_overview_preserve_total(self):
        for jaar in self.codes_per_jaar:
            for reserve in (False, True):
                with self.subTest(jaar=jaar, reserve=reserve):
                    args = dict(jaar=jaar, verslagsoort=f"{jaar}X000", gemeente="GM0001",
                                referentie=["GM0002"], reserve=reserve)
                    begroting = queries.begroting(**args)["verdeling"]["hoofdtaakveld"]
                    self.assertNotIn("leeg", [s["key"] for s in begroting["series"]])
                    for bar, factor in zip(begroting["data"], (1, 1.5)):
                        self.assertEqual(bar["6"], 150 * factor)
                        self.assertEqual(sum(bar[s["key"]] for s in begroting["series"]),
                                         (350 + 5 * reserve) * factor)
                    overview = queries.lasten(**args)["verdeling"]
                    self.assertNotIn("leeg", [s["key"] for s in overview["series"]])
                    for side, factor in [("links", 1), ("rechts", 1.5)]:
                        donut = overview[side]
                        self.assertEqual(donut["waarden"]["6"], 150 * factor)
                        self.assertEqual(donut["totaal"], (357 + 5 * reserve) * factor)
                        self.assertEqual(sum(donut["waarden"].values()), donut["totaal"])

    def test_detail_includes_rollups_in_donut_bars_and_trend(self):
        for jaar, extra in self.codes_per_jaar.items():
            with self.subTest(jaar=jaar):
                data = queries.lasten(jaar, f"{jaar}X000", taakveld="6",
                                      gemeente="GM0001", referentie=["GM0002"])
                labels = {s["key"]: s["name"] for s in data["verdeling"]["series"]}
                self.assertEqual(set(labels), {"6.1", *extra})
                for code in extra:
                    self.assertEqual(labels[code], f"{code} {d.TAAKVELD_LABEL_OVERRIDES[code]}")
                for side, cohort, factor in [("links", "gemeente", 1), ("rechts", "referentie", 1.5)]:
                    donut = data["verdeling"][side]
                    self.assertEqual(donut["totaal"], 150 * factor)
                    self.assertEqual(sum(donut["waarden"].values()), donut["totaal"])
                    for code, bedrag in extra.items():
                        self.assertEqual(donut["waarden"][code], bedrag * factor)
                    bar = next(b for b in data["categorie"]["data"] if b["key"] == cohort)
                    self.assertEqual([bar[k] for k in ("salarissen", "inhuur", "goederen", "overig")],
                                     [v * factor for v in (30, 10, 90, 20)])
                    self.assertEqual(sum(bar[s["key"]] for s in data["categorie"]["series"]), donut["totaal"])
                    for point in data["trend"]:
                        self.assertEqual(point[cohort], 150 * factor)
                self.assertEqual(data["referentiegroep"][0]["waarde"], 225)

    def test_municipality_with_only_rollup_costs_remains_visible(self):
        Iv3Summary.objects.filter(jaar=2024, gm_code="GM0001").update(
            lasten=50, lasten_per_taakveld={"6.73": 30, "6.74": 20},
            lasten_per_hoofdtaakveld_categorie={"6": {"1": 10, "3": 30, "4": 10}},
            personeel_per_hoofdtaakveld={"6": 10},
        )
        data = queries.lasten(2024, "2024X000", taakveld="6", gemeente="GM0001")
        self.assertEqual(data["verdeling"]["links"]["totaal"], 50)
        self.assertEqual(data["trend"][0]["gemeente"], 50)

    def test_local_tax_has_no_artificial_empty_legend(self):
        self.assertNotIn("leeg", queries.BATEN_HEFFINGEN_SLICES)
