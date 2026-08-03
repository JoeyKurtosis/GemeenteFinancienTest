"""Request-scoped cache lifecycle for the iv3 bridges.

settings_bridge and measure_bridge both memoize what they read from the database, because
queries.py asks for both from inside per-row loops — the dashboard's measurement primitive
`_per_inwoner_mean` reads the settings once per line, per bar and per donut slice, which put
hundreds of identical single-row SELECTs on every chart request.

Neither may outlive the request: both the dashboard settings and the measure formulas are
editable from the settings page, and a process-lifetime cache would leave every worker
serving the old figures until it restarted. Clearing here is what buys the memoization
without that trade — the caches live exactly as long as they are useful.

Cleared on the way in rather than on the way out: a worker thread's context is reused across
requests, and an exception mid-response would otherwise leave a stale cache behind for the
next one.
"""

from iv3.measure_bridge import clear_cache as clear_measure_cache
from iv3.settings_bridge import clear_settings_cache


class Iv3RequestCacheMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clear_settings_cache()
        clear_measure_cache()
        return self.get_response(request)
