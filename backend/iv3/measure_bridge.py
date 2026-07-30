"""Load user-defined measures from the database and compile them to callables.

Falls back to the hardcoded LIJN_METRICS lambdas in queries.py if a key does
not exist in the database.
"""

from iv3.expression_eval import compile_expression

# Cache compiled measures within a request to avoid re-parsing.
_cache: dict[str, callable] = {}


def get_measure_fn(key: str, fallback=None):
    """Return a callable (row) -> float for the given measure key.

    Looks up the Measure row in the database and compiles its expression. If the
    key does not exist, returns `fallback` (which should be a lambda like the
    ones in LIJN_METRICS).
    """
    if key in _cache:
        return _cache[key]

    from iv3.models import Measure  # late import

    try:
        measure = Measure.objects.get(key=key)
        fn = compile_expression(measure.expression)
    except Measure.DoesNotExist:
        fn = fallback
    except Exception:
        fn = fallback

    if fn is not None:
        _cache[key] = fn
    return fn


def clear_cache():
    """Clear the compiled measure cache. Call after saving measures."""
    _cache.clear()
