"""The formula layer: the expression evaluator, and the wiring behind /instellingen.

Two things are checked here, and the second is the important one.

The evaluator tests are the ordinary kind — what parses, what is refused, what a division by
zero comes back as.

The parity tests exist because every measure on the settings page is an *override* of a
hardcoded formula in queries.py, and the two have to agree while the formula is still the
shipped default. If they ever stop agreeing, editing nothing at all changes the dashboard,
which is the one thing the override mechanism must never do. `test_every_default_measure_is_wired`
is the other half of that: it fails when a measure is added to the settings page without
anything on the dashboard reading it, which is exactly how five of them came to be editable
but dead.

    python manage.py test iv3.tests.test_measures
"""

from types import SimpleNamespace

from django.test import SimpleTestCase

from iv3 import queries
from iv3.expression_eval import (
    ALLOWED_FIELDS,
    compile_expression,
    validate_expression,
)
from iv3.management.commands.init_measures import DEFAULT_MEASURES

#: measure key -> the hardcoded formula it overrides, gathered from the tables queries.py
#: resolves them through. Deliberately built from those tables rather than written out again:
#: a fallback that changes without its default expression changing has to fail here.
def _fallbacks() -> dict:
    fallbacks = dict(queries._LIJN_DEFAULTS)
    fallbacks.update(queries._RESULTAAT_DEFAULTS)
    fallbacks.update(
        {measure_key: fn for measure_key, fn in queries._MANAGEMENT_DEFAULTS.values()}
    )
    fallbacks.update(
        {measure_key: fn for measure_key, fn in queries._INKOMSTEN_BRON_DEFAULTS.values()}
    )
    # Not in a table: applied inline, per row, inside _solvabiliteit_pct.
    fallbacks["solvabiliteit"] = lambda row: row.eigen_vermogen / row.balanstotaal * 100
    return fallbacks


#: The one measure that does not run per row — see _saldo_pct. Excluded from the row-wise parity
#: sweep and checked on its own in SaldoMeasureTests.
COHORT_MEASURES = {"overschot"}


def _row(**overrides):
    """A summary row with every allowed field set, as a plain namespace.

    Values are deliberately distinct and coprime-ish so that a formula which confuses two
    fields, or drops a term, produces a different number rather than the same one by luck.
    """
    fields = {
        "lasten": 812_345.0,
        "baten": 798_210.0,
        "reserve_lasten": 41_000.0,
        "reserve_baten": 37_500.0,
        "sociaal": 301_777.0,
        "salarissen": 154_321.0,
        "inhuur": 28_909.0,
        "verbonden": 63_004.0,
        "rijk": 402_611.0,
        "spuks": 88_133.0,
        "heffingen": 91_226.0,
        "heffingen_breed": 118_452.0,
        "salarissen_overhead": 39_887.0,
        "inhuur_overhead": 7_211.0,
        "eigen_vermogen": 244_500.0,
        "balanstotaal": 615_900.0,
        "inwoners": 84_312,
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


class ExpressionValidatorTests(SimpleTestCase):
    def test_accepts_the_four_arithmetic_operators(self):
        for expr in ("lasten + baten", "lasten - baten", "lasten * 2", "lasten / baten"):
            with self.subTest(expr=expr):
                self.assertEqual(validate_expression(expr), [])

    def test_accepts_parentheses_unary_minus_and_constants(self):
        for expr in ("(baten - lasten) / 2", "-lasten", "+lasten", "1.5 * baten", "100"):
            with self.subTest(expr=expr):
                self.assertEqual(validate_expression(expr), [])

    def test_accepts_every_allowed_field_by_name(self):
        for name in sorted(ALLOWED_FIELDS):
            with self.subTest(field=name):
                self.assertEqual(validate_expression(name), [])

    def test_rejects_unknown_field(self):
        errors = validate_expression("lasten + verzonnen_veld")
        self.assertTrue(errors)
        self.assertIn("verzonnen_veld", errors[0])

    def test_rejects_anything_that_is_not_arithmetic(self):
        for expr in (
            "__import__('os').system('ls')",   # call
            "lasten.real",                     # attribute access
            "abs(lasten)",                     # call
            "'lasten'",                        # string constant
            "lasten ** 2",                     # operator outside _SAFE_BINOPS
            "lasten % 2",                      # ditto
            "lasten > baten",                  # comparison
            "[lasten, baten]",                 # container
            "lasten if baten else 0",          # conditional
        ):
            with self.subTest(expr=expr):
                self.assertTrue(validate_expression(expr), f"{expr!r} should not validate")

    def test_rejects_empty_and_unparseable(self):
        self.assertTrue(validate_expression(""))
        self.assertTrue(validate_expression("   "))
        self.assertTrue(validate_expression("lasten +"))


class ExpressionEvaluatorTests(SimpleTestCase):
    def test_evaluates_arithmetic_with_python_precedence(self):
        row = _row(baten=300.0, lasten=100.0)
        self.assertEqual(compile_expression("baten - lasten * 2")(row), 100.0)
        self.assertEqual(compile_expression("(baten - lasten) * 2")(row), 400.0)

    def test_division_by_zero_is_zero_not_an_error(self):
        row = _row(balanstotaal=0.0)
        self.assertEqual(compile_expression("eigen_vermogen / balanstotaal * 100")(row), 0.0)

    def test_missing_attribute_reads_as_zero(self):
        # validate_expression refuses unknown names on save; this is the belt to that pair of
        # braces, for a row that simply does not carry the column.
        self.assertEqual(compile_expression("lasten + sociaal")(SimpleNamespace(lasten=5.0)), 5.0)

    def test_none_reads_as_zero(self):
        self.assertEqual(compile_expression("lasten + sociaal")(_row(sociaal=None)), 812_345.0)

    def test_only_the_named_fields_are_touched(self):
        """compile_expression resolves just the names the formula mentions — reading the rest
        would defer-load columns the page never asked for. See its comment."""

        class Tripwire:
            lasten = 10.0

            def __getattr__(self, name):
                raise AssertionError(f"formula touched {name!r}, which it does not name")

        self.assertEqual(compile_expression("lasten * 2")(Tripwire()), 20.0)


class MeasureParityTests(SimpleTestCase):
    """Every shipped formula must equal the hardcoded one it overrides."""

    def test_every_default_measure_expression_validates(self):
        for measure in DEFAULT_MEASURES:
            with self.subTest(key=measure["key"]):
                self.assertEqual(validate_expression(measure["expression"]), [])

    def test_default_measures_have_unique_keys(self):
        keys = [m["key"] for m in DEFAULT_MEASURES]
        self.assertEqual(len(keys), len(set(keys)), "duplicate key in DEFAULT_MEASURES")

    def test_every_default_measure_is_wired_to_something(self):
        """A measure on the settings page that nothing reads is an editable no-op.

        Five of them were, which is what this test is here to stop happening again. If you are
        adding a measure, add it to the table in queries.py that resolves it too.
        """
        wired = set(_fallbacks()) | COHORT_MEASURES
        for measure in DEFAULT_MEASURES:
            with self.subTest(key=measure["key"]):
                self.assertIn(
                    measure["key"],
                    wired,
                    f"measure {measure['key']!r} is editable on /instellingen but nothing reads it",
                )

    def test_default_expression_matches_its_hardcoded_fallback(self):
        fallbacks = _fallbacks()
        rows = [
            _row(),
            _row(inhuur=0.0, inhuur_overhead=0.0),
            _row(baten=812_345.0),               # saldo of exactly zero
            _row(rijk=0.0, spuks=0.0),
            _row(salarissen=39_887.0),           # salarissen == its own overhead
        ]
        for measure in DEFAULT_MEASURES:
            key = measure["key"]
            if key in COHORT_MEASURES:
                continue
            compiled = compile_expression(measure["expression"])
            for index, row in enumerate(rows):
                with self.subTest(key=key, row=index):
                    self.assertAlmostEqual(
                        compiled(row),
                        fallbacks[key](row),
                        places=6,
                        msg=f"measure {key!r} disagrees with the fallback it overrides",
                    )


class SaldoMeasureTests(SimpleTestCase):
    """`overschot` is the one measure applied after averaging rather than per row."""

    def test_default_expression_reproduces_the_dax(self):
        compiled = compile_expression(
            next(m["expression"] for m in DEFAULT_MEASURES if m["key"] == "overschot")
        )
        for baten, lasten in ((3200.0, 3000.0), (2900.0, 3100.0), (3000.0, 3000.0)):
            with self.subTest(baten=baten, lasten=lasten):
                expected = round((baten - lasten) / (baten + lasten) * 100, 1)
                actual = round(compiled(SimpleNamespace(baten=baten, lasten=lasten)), 1)
                self.assertEqual(actual, expected)

    def test_reads_euros_per_inhabitant_not_thousands(self):
        """The synthetic row _saldo_pct builds carries the two cohort means, which are already
        per inhabitant. A ratio is scale-free, so this holds — the test pins the assumption."""
        compiled = compile_expression("(baten - lasten) / (baten + lasten) * 100")
        klein = compiled(SimpleNamespace(baten=3200.0, lasten=3000.0))
        groot = compiled(SimpleNamespace(baten=3_200_000.0, lasten=3_000_000.0))
        self.assertAlmostEqual(klein, groot, places=9)
