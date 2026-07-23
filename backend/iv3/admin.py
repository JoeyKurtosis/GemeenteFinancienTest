"""Read-only admin for the iv3 dataset.

A viewer, not an editor, and deliberately so: none of these tables is a place where data
can be corrected. All four are rebuilt wholesale — sync_iv3_summary deletes and reinserts
them from the warehouse, and load_iv3_data empties them before every deploy — so an edit
made here would be destroyed by the next deploy, silently and with nothing in the diff to
show for it. The fixture is the source of truth; see iv3/models.py.

Hence add/change/delete are off across the board. What remains is what the admin is
actually good for here: looking at what shipped.
"""

from django.contrib import admin

from iv3.models import DashboardSettings, Gemeente, Inwoners, Iv3Summary, Iv3Taakveld, Measure


class ReadOnlyAdmin(admin.ModelAdmin):
    """Look, don't touch. Django renders the detail page read-only when change is denied."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Gemeente)
class GemeenteAdmin(ReadOnlyAdmin):
    list_display = ["gm_code", "gm_naam", "jaar", "prv_code"]
    list_filter = ["jaar"]
    search_fields = ["gm_code", "gm_naam"]
    ordering = ["-jaar", "gm_naam"]


@admin.register(Inwoners)
class InwonersAdmin(ReadOnlyAdmin):
    list_display = ["gemeente", "jaar", "aantal_inwoners"]
    list_filter = ["jaar"]
    search_fields = ["gemeente"]
    ordering = ["-jaar", "gemeente"]


@admin.register(Iv3Summary)
class Iv3SummaryAdmin(ReadOnlyAdmin):
    # The totals only. The ten JSON breakdowns are the point of the detail page, but they are
    # ~2KB a row and unreadable in a list.
    list_display = ["gm_code", "jaar", "verslagsoort", "inwoners", "lasten", "baten"]
    list_filter = ["jaar", "verslagsoort"]
    search_fields = ["gm_code"]
    ordering = ["-jaar", "verslagsoort", "gm_code"]


@admin.register(Iv3Taakveld)
class Iv3TaakveldAdmin(ReadOnlyAdmin):
    list_display = ["code", "titel", "jaar"]
    list_filter = ["jaar"]
    search_fields = ["code", "titel"]


@admin.register(DashboardSettings)
class DashboardSettingsAdmin(admin.ModelAdmin):
    list_display = ["__str__", "aggregation_method"]

    def has_add_permission(self, request):
        return not DashboardSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Measure)
class MeasureAdmin(admin.ModelAdmin):
    list_display = ["key", "name", "expression", "page"]
    search_fields = ["key", "name"]
