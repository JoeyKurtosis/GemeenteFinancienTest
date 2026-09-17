from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/signup/", views.SignupView.as_view()),
    path("auth/password-reset/request/", views.PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", views.PasswordResetConfirmView.as_view()),
    path("auth/password-reset/<uuid:token>/", views.PasswordResetTokenView.as_view()),
    path("auth/password/change/", views.ChangePasswordView.as_view()),
    path("auth/account/delete/", views.DeleteAccountView.as_view()),
    path("auth/2fa/verify/", views.TwoFactorVerifyView.as_view()),
    path("auth/2fa/resend/", views.TwoFactorResendView.as_view()),
]
