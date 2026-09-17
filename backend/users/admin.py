from django.contrib import admin

from .models import PasswordResetToken, TwoFactorCode, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_number", "email_verified", "created_at")
    list_filter = ("email_verified",)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "created_at", "expires_at", "used_at")


@admin.register(TwoFactorCode)
class TwoFactorCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__email", "user__username")


