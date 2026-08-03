"""Bridge between the DashboardSettings model and queries.py.

Every configurable constant queries.py needs is accessed through get_settings(),
which returns a namespace that mirrors definitions.py but reflects any overrides
stored in the database. Fields that are empty/null fall back to definitions.py —
a fresh database behaves identically to the hardcoded constants.

get_settings() is memoized for the length of one request, because the settings row is read
from deep inside per-row loops. `_per_inwoner_mean` (queries.py) is the measurement primitive
behind every line, bar and donut slice on the dashboard, and `_inwonergroepen_voor` runs once
per gemeente — unmemoized, a single /filters/ call issued ~343 identical SELECTs for pk=1 and
/benchmark/ issued ~740. There is one row and it is tiny; the cost was never the query, it was
issuing it thousands of times.

Scoped to the request, not the process: the settings are editable from the admin settings page,
and a process-lifetime cache would leave every worker serving the old figures until it restarted.
Iv3RequestCacheMiddleware clears this on the way into each request, so an edit takes effect on
the next one.
"""

from contextvars import ContextVar
from types import SimpleNamespace

from iv3 import definitions as d

#: The effective settings for the request in flight, or None if not built yet. A ContextVar
#: rather than a module global so concurrent requests cannot read each other's; the middleware
#: resets it per request, since a pooled worker thread reuses its context across requests.
_current: ContextVar[SimpleNamespace | None] = ContextVar("iv3_settings", default=None)


def clear_settings_cache() -> None:
    """Forget the memoized settings. Called per request by Iv3RequestCacheMiddleware."""
    _current.set(None)


def get_settings() -> SimpleNamespace:
    """Return the effective settings, DB overriding definitions.py defaults.

    Memoized per request — see the module docstring.
    """
    cached = _current.get()
    if cached is not None:
        return cached

    settings = _build()
    _current.set(settings)
    return settings


def _build() -> SimpleNamespace:
    from iv3.models import DashboardSettings  # late import to avoid circular

    try:
        row = DashboardSettings.load()
    except Exception:
        return _defaults()

    return SimpleNamespace(
        CPI_PER_JAAR=_int_keys(row.cpi_per_jaar) or d.CPI_PER_JAAR,
        CAO_LONEN_PER_JAAR=_int_keys(row.cao_lonen_per_jaar) or d.CAO_LONEN_PER_JAAR,
        INWONERGROEPEN=row.inwonergroepen or d.INWONERGROEPEN,
        TAAKVELD_LABEL_OVERRIDES={**d.TAAKVELD_LABEL_OVERRIDES, **(row.taakveld_label_overrides or {})},
        AGGREGATION_METHOD=row.aggregation_method or "equal_weight",
    )


def _defaults() -> SimpleNamespace:
    return SimpleNamespace(
        CPI_PER_JAAR=d.CPI_PER_JAAR,
        CAO_LONEN_PER_JAAR=d.CAO_LONEN_PER_JAAR,
        INWONERGROEPEN=d.INWONERGROEPEN,
        TAAKVELD_LABEL_OVERRIDES=d.TAAKVELD_LABEL_OVERRIDES,
        AGGREGATION_METHOD="equal_weight",
    )


def _int_keys(d_: dict) -> dict:
    """JSON keys are always strings; convert back to int for year dicts."""
    if not d_:
        return {}
    return {int(k): v for k, v in d_.items()}
