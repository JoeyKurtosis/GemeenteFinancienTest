"""Tests for the signup email-verification flow.

Signup used to hand out a session immediately, so a typo'd or invented address produced a working
account. It now creates the account unverified and gates it behind the same six-digit code the
login 2FA path uses. These cover the parts of that which are tedious to re-check by hand: that no
session leaks out before the code is verified, that an abandoned signup can still recover, and that
accounts which predate the flag (superusers have no UserProfile at all) are not locked out.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import TwoFactorCode, UserProfile

PASSWORD = "zeergeheim!42"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SignupVerificationTests(TestCase):
    signup_url = "/api/auth/signup/"
    login_url = "/api/auth/login/"
    verify_url = "/api/auth/2fa/verify/"
    resend_url = "/api/auth/2fa/resend/"
    me_url = "/api/auth/me/"

    def signup(self, email="nieuw@voorbeeld.nl", name="Joey Quandt", password=PASSWORD):
        return self.client.post(
            self.signup_url,
            {"name": name, "email": email, "password": password},
            content_type="application/json",
        )

    def login(self, email="nieuw@voorbeeld.nl", password=PASSWORD):
        return self.client.post(
            self.login_url,
            {"email": email, "password": password},
            content_type="application/json",
        )

    def latest_code(self, email="nieuw@voorbeeld.nl"):
        return TwoFactorCode.objects.filter(user__email__iexact=email, status="pending").latest("id")

    def verify(self, code):
        return self.client.post(self.verify_url, {"code": code}, content_type="application/json")

    def make_verified_user(self, email="bestaand@voorbeeld.nl"):
        user = get_user_model().objects.create_user(username=email, email=email, password=PASSWORD)
        UserProfile.objects.create(user=user, email_verified=True)
        return user

    # ── signup issues a challenge instead of a session ──

    def test_signup_creates_unverified_account_without_a_session(self):
        response = self.signup()

        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.json()["requires_2fa"])

        user = get_user_model().objects.get(email="nieuw@voorbeeld.nl")
        self.assertFalse(user.profile.email_verified)
        # The whole point: no session until the address is proven.
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(self.client.get(self.me_url).status_code, 403)

    def test_signup_mails_the_code_and_not_the_welcome(self):
        self.signup()

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Je verificatiecode")
        self.assertIn(self.latest_code().code, mail.outbox[0].body)

    def test_signup_rejects_a_malformed_address(self):
        response = self.signup(email="joey@gmail")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Vul een geldig e-mailadres in.")
        self.assertFalse(get_user_model().objects.filter(email="joey@gmail").exists())
        self.assertEqual(len(mail.outbox), 0)

    # ── verification completes the account ──

    def test_verifying_the_code_logs_in_and_marks_verified(self):
        self.signup()
        response = self.verify(self.latest_code().code)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "nieuw@voorbeeld.nl")
        self.assertIn("_auth_user_id", self.client.session)

        user = get_user_model().objects.get(email="nieuw@voorbeeld.nl")
        self.assertTrue(user.profile.email_verified)

    def test_welcome_mail_is_sent_once_and_only_after_verification(self):
        self.signup()
        self.assertNotIn("Welkom bij Gemeentefinanciën", [m.subject for m in mail.outbox])

        self.verify(self.latest_code().code)
        self.assertEqual([m.subject for m in mail.outbox].count("Welkom bij Gemeentefinanciën"), 1)

        # A second code exchange on the same (now verified) account must not re-send it.
        self.client.post("/api/auth/logout/")
        self.login()
        self.verify(self.latest_code().code)
        self.assertEqual([m.subject for m in mail.outbox].count("Welkom bij Gemeentefinanciën"), 1)

    def test_wrong_code_does_not_verify_or_log_in(self):
        self.signup()
        response = self.verify("000000")

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertFalse(get_user_model().objects.get(email="nieuw@voorbeeld.nl").profile.email_verified)

    def test_resend_works_after_the_code_expired(self):
        """The expiry branch used to wipe the session, which broke the resend button."""
        self.signup()
        code = self.latest_code()
        TwoFactorCode.objects.filter(id=code.id).update(created_at=timezone.now() - timedelta(minutes=11))

        self.assertEqual(self.verify(code.code).status_code, 410)

        self.assertEqual(self.client.post(self.resend_url).status_code, 200)
        self.assertEqual(self.verify(self.latest_code().code).status_code, 200)

    # ── recovery paths ──

    def test_unverified_account_can_recover_by_logging_in(self):
        self.signup()
        self.client.cookies.clear()  # walked away, lost the session

        response = self.login()
        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.json()["requires_2fa"])

        self.assertEqual(self.verify(self.latest_code().code).status_code, 200)
        self.assertTrue(get_user_model().objects.get(email="nieuw@voorbeeld.nl").profile.email_verified)

    def test_signing_up_again_over_an_unverified_account_reissues_a_code(self):
        self.signup(name="Joey Quandt", password=PASSWORD)
        user_id = get_user_model().objects.get(email="nieuw@voorbeeld.nl").id

        response = self.signup(name="Joey Anders", password="anderwachtwoord!9")

        self.assertEqual(response.status_code, 202)
        self.assertEqual(get_user_model().objects.filter(email__iexact="nieuw@voorbeeld.nl").count(), 1)

        user = get_user_model().objects.get(id=user_id)
        self.assertEqual(user.last_name, "Anders")
        self.assertTrue(user.check_password("anderwachtwoord!9"))

        self.assertEqual(self.verify(self.latest_code().code).status_code, 200)

    def test_signing_up_over_a_verified_account_is_refused(self):
        self.make_verified_user()

        response = self.signup(email="bestaand@voorbeeld.nl")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Er bestaat al een account met dit e-mailadres.")

    # ── accounts that predate the flag ──

    @override_settings(TWO_FACTOR_ENABLED=False)
    def test_profileless_superuser_is_not_locked_out(self):
        """createsuperuser makes no UserProfile, so the flag has to fail open."""
        get_user_model().objects.create_superuser(username="baas@voorbeeld.nl", email="baas@voorbeeld.nl", password=PASSWORD)

        response = self.login(email="baas@voorbeeld.nl")

        self.assertEqual(response.status_code, 200)
        self.assertIn("_auth_user_id", self.client.session)

    @override_settings(TWO_FACTOR_ENABLED=False)
    def test_verification_is_required_even_with_login_2fa_off(self):
        self.assertEqual(self.login(email=self.make_verified_user().email).status_code, 200)

        self.client.cookies.clear()
        self.assertEqual(self.signup().status_code, 202)

        self.client.cookies.clear()
        self.assertEqual(self.login().status_code, 202)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", TWO_FACTOR_ENABLED=False)
class DeleteAccountTests(TestCase):
    """Deleting your own account from the account page.

    The endpoint is irreversible, so the parts worth pinning down are the ones that keep it from
    firing by accident: it needs the current password, it refuses beheerder accounts outright, and
    a refusal must leave the account and its session exactly as they were.
    """

    delete_url = "/api/auth/account/delete/"
    me_url = "/api/auth/me/"

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="weg@voorbeeld.nl",
            email="weg@voorbeeld.nl",
            password=PASSWORD,
            first_name="Joey",
        )
        UserProfile.objects.create(user=self.user, email_verified=True)
        self.client.login(username="weg@voorbeeld.nl", password=PASSWORD)

    def delete(self, password=PASSWORD):
        return self.client.post(self.delete_url, {"password": password}, content_type="application/json")

    def test_delete_removes_the_account_ends_the_session_and_mails_a_confirmation(self):
        response = self.delete()

        self.assertEqual(response.status_code, 204)
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertFalse(UserProfile.objects.filter(pk=self.user.pk).exists())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(self.client.get(self.me_url).status_code, 403)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Je account is verwijderd")
        self.assertEqual(mail.outbox[0].to, ["weg@voorbeeld.nl"])

    def test_wrong_password_keeps_the_account(self):
        response = self.delete(password="niet-mijn-wachtwoord")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Wachtwoord is onjuist.")
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
        self.assertIn("_auth_user_id", self.client.session)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_is_required(self):
        response = self.client.post(self.delete_url, {}, content_type="application/json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Wachtwoord is verplicht.")
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_staff_accounts_are_refused(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])

        response = self.delete()

        self.assertEqual(response.status_code, 403)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_anonymous_visitors_cannot_call_it(self):
        self.client.logout()

        self.assertEqual(self.delete().status_code, 403)
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())
