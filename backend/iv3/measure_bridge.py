"""Load user-defined measures from the database and compile them to callables.

Falls back to the hardcoded LIJN_METRICS lambdas in queries.py if a key does
not exist in the database.

Every measure is loaded in one query and compiled once per request. The alternative — a
lookup per key — cost one SELECT per metric, and the callers ask for all of them: queries.py
rebuilds the whole metric dict inside comprehensions (_get_lijn_metrics at :251,
_get_management_lijnen at :1953), so the keys are always wanted together.

Scoped to the request rather than the process, like settings_bridge: measures are editable
from the settings page (/api/iv3/measures/), and the previous process-lifetime dict meant an
edited formula did not take effect until the server restarted. Iv3RequestCacheMiddleware
clears this on the way into each request.
"""

from contextvars import ContextVar

from iv3.expression_eval import compile_expression

#: key -> compiled callable, for the request in flight. None until the first lookup builds it.
#: A ContextVar rather than a module global so concurrent requests cannot read each other's;
#: the middleware resets it per request, since a pooled worker thread reuses its context.
_current: ContextVar[dict | None] = ContextVar("iv3_measures", default=None)


def get_measure_fn(key: str, fallback=None):
    """Return a callable (row) -> float for the given measure key.

    Compiles the expression stored on the Measure row. If the key has no row, or its
    expression does not compile, returns `fallback` (which should be a lambda like the
    ones in LIJN_METRICS).
    """
    return _compiled().get(key, fallback)


def _compiled() -> dict:
    cached = _current.get()
    if cached is not None:
        return cached

    compiled = _build()
    _current.set(compiled)
    return compiled


def _build() -> dict:
    from iv3.models import Measure  # late import

    compiled: dict[str, callable] = {}
    try:
        rows = list(Measure.objects.all().only("key", "expression"))
    except Exception:
        # No table yet (a migration is still to run), or the database is unreachable. Every
        # caller passes a hardcoded fallback, so the dashboard draws from definitions.py.
        return compiled

    for measure in rows:
        try:
            compiled[measure.key] = compile_expression(measure.expression)
        except Exception:
            # A formula that no longer parses — an edit that named a field that has since
            # gone, say. Leave the key out so the caller's fallback wins, rather than
            # failing the whole page over one measure.
            continue
    return compiled


def clear_cache():
    """Forget the compiled measures. Called per request by Iv3RequestCacheMiddleware."""
    _current.set(None)
