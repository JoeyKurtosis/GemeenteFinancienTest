from django.contrib import admin

from .models import SupportRequest, SupportRequestAttachment


class SupportRequestAttachmentInline(admin.TabularInline):
    model = SupportRequestAttachment
    extra = 0
    readonly_fields = ["file", "uploaded_at"]


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ["ticket_number", "subject", "email", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["ticket_number", "subject", "email", "name"]
    readonly_fields = ["ticket_number", "created_at", "updated_at"]
    inlines = [SupportRequestAttachmentInline]
