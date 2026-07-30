"""Bridge between the DashboardSettings model and queries.py.

Every configurable constant queries.py needs is accessed through get_settings(),
which returns a namespace that mirrors definitions.py but reflects any overrides
stored in the database. Fields that are empty/null fall back to definitions.py —
a fresh database behaves identically to the hardcoded constants.
"""

from types import SimpleNamespace

from iv3 import definitions as d


def get_settings() -> SimpleNamespace:
    """Return the effective settings, DB overriding definitions.py defaults."""
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
