from django.contrib import admin

from .models import ChartComment


@admin.register(ChartComment)
class ChartCommentAdmin(admin.ModelAdmin):
    list_display = ("user", "chart_id", "text", "updated_at")
    list_filter = ("updated_at",)
    search_fields = ("user__email", "chart_id", "text")
    readonly_fields = ("created_at", "updated_at")
