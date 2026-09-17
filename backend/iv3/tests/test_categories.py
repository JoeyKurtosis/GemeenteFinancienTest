from copy import deepcopy
from types import SimpleNamespace

from django.test import SimpleTestCase

from iv3 import queries
from iv3.management.commands.audit_categories import audit
from iv3.models import Iv3Summary, Iv3Taakveld
from iv3.tests.test_sociaal_domein import SociaalDomeinTests


class CategoryCoverageTests(SociaalDomeinTests):
    def test_missing_dimension_row_preserves_amount(self):
        Iv3Taakveld.objects.filter(jaar=2024, code="6.1").delete()
        data = queries.lasten(2024, "2024X000", taakveld="6", gemeente="GM0001")
        labels = {s["key"]: s["name"] for s in data["verdeling"]["series"]}
        self.assertEqual(labels["6.1"], "Niet ingedeeld (6.1)")
        donut = data["verdeling"]["links"]
        self.assertEqual(donut["waarden"]["6.1"], 100)
        self.assertEqual(sum(donut["waarden"].values()), donut["totaal"])

    def test_unknown_main_task_survives_income_personnel_and_expense_donuts(self):
        row = Iv3Summary.objects.get(jaar=2024, gm_code="GM0001")
        row.lasten += 5
        row.lasten_per_taakveld["9.1"] = 5
        row.spuks = 7
        row.spuks_per_hoofdtaakveld = {"9": 7}
        row.salarissen = 45
        row.personeel_per_hoofdtaakveld = {"6": 40, "9": 5}
        row.save()
        args = dict(jaar=2024, verslagsoort="2024X000", gemeente="GM0001")
        charts = [queries.lasten(**args)["verdeling"],
                  queries.baten(**args, bron="rijk")["verdeling"],
                  queries.benchmark(**args)["taakvelden"]]
        for chart, expected in zip(charts, (5, 7, 5)):
            with self.subTest(expected=expected, total=chart["links"]["totaal"]):
                self.assertIn({"key": "9", "name": "Niet ingedeeld (9)"}, chart["series"])
                self.assertEqual(chart["links"]["waarden"]["9"], expected)
                self.assertAlmostEqual(sum(chart["links"]["waarden"].values()),
                                       chart["links"]["totaal"])

    def test_blank_parent_label_uses_rollup_and_same_year_title_wins(self):
        Iv3Taakveld.objects.filter(jaar=2024, code="6.73").update(titel="")
        Iv3Taakveld.objects.filter(jaar=2025, code="6.75").update(titel="Naam uit dit verslagjaar")
        self.assertEqual(queries._lasten_donut_labels(2024, "6", False)["6.73"],
                         "6.73 Jeugdhulp met verblijf")
        self.assertEqual(queries._lasten_donut_labels(2025, "6", False)["6.75"],
                         "6.75 Naam uit dit verslagjaar")


class CategoryHelpersTests(SimpleTestCase):
    def test_unknown_and_empty_codes_keep_zero_and_negative_amounts(self):
        labels = {"1": "Known"}
        row = SimpleNamespace(values={"1": 10, "9": -2, "": 0})
        result = queries._verdeling({"a": [row]}, [{"key": "a", "label": "A"}],
                                    "values", labels, lambda rows, fn: sum(map(fn, rows)))
        self.assertEqual(result["totalen"], [8])
        self.assertEqual({s["key"]: s["name"] for s in result["series"]},
                         {"1": "Known", "9": "Niet ingedeeld (9)",
                          "": "Niet ingedeeld (ontbrekende code)"})
        self.assertEqual(labels, {"1": "Known"})
        self.assertEqual(result["data"][0]["9"], -2)

    def test_audit_reports_location_amount_and_does_not_mutate(self):
        row = dict(jaar=2024, verslagsoort="2024X000", gm_code="GM0001",
                   per_hoofdtaakveld={"9": -2, "": 0},
                   lasten_per_taakveld={"6.1": 3, "6.73": 5})
        before = deepcopy(row)
        result = audit([row], {(2024, "6.1"): ""}, {(2024, "GM0001"): "Test"})
        self.assertEqual(row, before)
        self.assertEqual(result["rows_checked"], 1)
        self.assertEqual(result["counts"], {"unmapped_code": 1, "missing_code": 1,
                                          "missing_label": 1, "resolved_parent_label": 1})
        self.assertEqual(result["findings"][0]["amount_eur"], -2000)
        self.assertIn("begroting", result["findings"][0]["pages"])
