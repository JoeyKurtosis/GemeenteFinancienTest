import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .email import send_account_deleted_email, send_password_reset_email, send_two_factor_code_email, send_welcome_email
from .models import PasswordResetToken, TwoFactorCode, UserProfile

SPECIAL_CHAR_REGEX = re.compile(r"[^A-Za-z0-9]")
UPPERCASE_REGEX = re.compile(r"[A-Z]")
TWO_FACTOR_CODE_EXPIRY_MINUTES = 10


def serialize_user(user):
    """Serialize a User instance to the format the frontend expects."""
    avatar_url = None
    if hasattr(user, "profile") and user.profile.avatar:
        avatar_url = user.profile.avatar.url

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_admin": user.is_staff,
        "avatar_url": avatar_url,
    }


def _clear_pending_two_factor(request):
    request.session.pop("pending_2fa_user_id", None)
    request.session.pop("pending_2fa_code_id", None)


def _issue_two_factor_code(request, user):
    """Expire any outstanding code, mail a fresh one and park the challenge in the session.

    Shared by the three entry points that start a code exchange: login, signup and resend.
    """
    TwoFactorCode.objects.filter(user=user, status="pending").update(status="expired")
    two_factor_code = TwoFactorCode.objects.create(
        user=user,
        code=f"{secrets.randbelow(1000000):06d}",
        status="pending",
    )
    request.session["pending_2fa_user_id"] = user.id
    request.session["pending_2fa_code_id"] = two_factor_code.id
    send_two_factor_code_email(user.email, two_factor_code.code)
    return two_factor_code


def _is_email_verified(user):
    """Whether this user has proven their address.

    Profiles are only created by SignupView, so superusers and admin-created accounts have none.
    Those count as verified: they were not created through the flow that asks for proof.
    """
    profile = getattr(user, "profile", None)
    return profile is None or profile.email_verified


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"detail": "E-mailadres en wachtwoord zijn verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Ongeldige inloggegevens."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(request, username=user_obj.username, password=password)

        if user is None:
            return Response(
                {"detail": "Ongeldige inloggegevens."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Dit account is gedeactiveerd."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # A deployment-wide switch, not a per-user one: TWO_FACTOR_ENABLED applies to everybody
        # who logs in. See settings.py. An address that was never confirmed at signup has to be
        # confirmed here regardless, which is also how an abandoned signup gets a second chance:
        # the code is re-issued rather than the login dead-ending.
        email_verified = _is_email_verified(user)
        requires_two_factor = settings.TWO_FACTOR_ENABLED or not email_verified

        if requires_two_factor:
            _issue_two_factor_code(request, user)
            return Response(
                {
                    "requires_2fa": True,
                    "detail": (
                        "Bevestig je e-mailadres. We hebben je een code gestuurd."
                        if not email_verified
                        else "2FA code vereist. Controleer je e-mail."
                    ),
                    "expires_in_seconds": TWO_FACTOR_CODE_EXPIRY_MINUTES * 60,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        login(request, user)
        _clear_pending_two_factor(request)
        return Response(serialize_user(user))


class TwoFactorVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = str(request.data.get("code") or "").strip()
        if not code:
            return Response(
                {"detail": "Code is verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pending_user_id = request.session.get("pending_2fa_user_id")
        pending_code_id = request.session.get("pending_2fa_code_id")
        if not pending_user_id or not pending_code_id:
            return Response(
                {"detail": "Geen actieve 2FA challenge gevonden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        user = User.objects.filter(id=pending_user_id).first()
        two_factor_code = TwoFactorCode.objects.filter(
            id=pending_code_id,
            user_id=pending_user_id,
            status="pending",
        ).first()

        if user is None or two_factor_code is None:
            _clear_pending_two_factor(request)
            return Response(
                {"detail": "Ongeldige 2FA challenge."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = two_factor_code.created_at + timedelta(minutes=TWO_FACTOR_CODE_EXPIRY_MINUTES)
        if expires_at <= timezone.now():
            two_factor_code.status = "expired"
            two_factor_code.save(update_fields=["status"])
            # The challenge stays in the session on purpose, so "genereer opnieuw" still works
            # from here. It only names the user, and resend re-expires and re-issues anyway —
            # the wrong-code branch below has always left it in place for the same reason.
            return Response(
                {"detail": "De 2FA code is verlopen."},
                status=status.HTTP_410_GONE,
            )

        if two_factor_code.code != code:
            return Response(
                {"detail": "Ongeldige 2FA code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        two_factor_code.status = "verified"
        two_factor_code.save(update_fields=["status"])

        # The False -> True transition is the only signal needed to tell a signup confirmation
        # apart from an ordinary login 2FA, so neither the code nor the session has to carry an
        # intent. It also means the welcome mail goes out exactly once, at the moment the address
        # is actually proven, rather than to whatever was typed into the signup form.
        profile = getattr(user, "profile", None)
        if profile is not None and not profile.email_verified:
            profile.email_verified = True
            profile.save(update_fields=["email_verified"])
            origin = request.META.get("HTTP_ORIGIN", "http://localhost:5173")
            send_welcome_email(user.email, user.first_name, f"{origin}/login")

        _clear_pending_two_factor(request)
        return Response(serialize_user(user))


class TwoFactorResendView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        pending_user_id = request.session.get("pending_2fa_user_id")
        if not pending_user_id:
            return Response(
                {"detail": "Geen actieve 2FA challenge gevonden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        user = User.objects.filter(id=pending_user_id).first()
        if user is None:
            _clear_pending_two_factor(request)
            return Response(
                {"detail": "Ongeldige 2FA challenge."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _issue_two_factor_code(request, user)
        return Response(
            {
                "detail": "Nieuwe 2FA code verstuurd naar je e-mail.",
                "expires_in_seconds": TWO_FACTOR_CODE_EXPIRY_MINUTES * 60,
            }
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(serialize_user(request.user))

    def patch(self, request):
        user = request.user
        User = get_user_model()

        if "first_name" in request.data:
            user.first_name = request.data.get("first_name", "").strip()

        if "last_name" in request.data:
            user.last_name = request.data.get("last_name", "").strip()

        if "email" in request.data:
            email = request.data.get("email", "").strip()

            if not email:
                return Response(
                    {"detail": "E-mailadres is verplicht."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {"detail": "Er bestaat al een account met dit e-mailadres."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.email = email
            user.username = email

        user.save()
        return Response(serialize_user(user))


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not current_password or not new_password:
            return Response(
                {"detail": "Huidig en nieuw wachtwoord zijn verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(current_password):
            return Response(
                {"detail": "Huidig wachtwoord is onjuist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as e:
            return Response(
                {"detail": e.messages[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response(status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    """Permanently remove the signed-in account.

    Everything hanging off the user is CASCADE'd away by the database: the profile, outstanding
    2FA codes, password reset tokens and chart comments. The avatar is the one thing that is not —
    Django drops the row and leaves the uploaded file in MEDIA_ROOT — so it is deleted by hand
    first. Support requests are deliberately untouched: they carry a free-text email rather than a
    link to the account, and they are correspondence with the team rather than account data.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get("password", "")

        if not password:
            return Response(
                {"detail": "Wachtwoord is verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # This endpoint cannot tell whether it is about to remove the last account that can reach
        # /admin/, so it never removes one at all. Deleting a beheerder stays a deliberate action
        # taken from the admin, not something self-service can do by accident.
        if user.is_staff or user.is_superuser:
            return Response(
                {"detail": "Beheerdersaccounts kunnen niet via deze pagina worden verwijderd."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Wachtwoord is onjuist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient_email = user.email
        name = user.first_name or user.username

        profile = getattr(user, "profile", None)
        if profile is not None and profile.avatar:
            profile.avatar.delete(save=False)

        logout(request)
        _clear_pending_two_factor(request)
        user.delete()

        # After the delete, never before: send_account_deleted_email swallows its own failures, so
        # mailing first would risk confirming a deletion that then fell over.
        send_account_deleted_email(recipient_email, name)

        return Response(status=status.HTTP_204_NO_CONTENT)


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        if not name or not email or not password:
            return Response(
                {"detail": "Alle velden zijn verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The address becomes both email and username and is about to be mailed a code, so it has
        # to at least be shaped like an address. Whether it actually exists is what the code proves.
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "Vul een geldig e-mailadres in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None and _is_email_verified(existing):
            return Response(
                {"detail": "Er bestaat al een account met dit e-mailadres."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except ValidationError as e:
            return Response(
                {"detail": e.messages[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parts = name.split(maxsplit=1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        if existing is not None:
            # An unverified row is a signup nobody ever finished — the address has never been
            # proven, so there is nothing to protect and no reason to let it squat the address.
            # Take it over rather than dead-ending the person trying to register.
            user = existing
            user.first_name = first_name
            user.last_name = last_name
            user.set_password(password)
            user.save(update_fields=["first_name", "last_name", "password"])
        else:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            UserProfile.objects.create(user=user, email_verified=False)

        # Independent of settings.TWO_FACTOR_ENABLED: that switch is about login security, this is
        # about whether the address is real. Turning 2FA off does not turn signup confirmation off.
        # The welcome mail waits until the code is verified — see TwoFactorVerifyView.
        _issue_two_factor_code(request, user)
        return Response(
            {
                "requires_2fa": True,
                "detail": "Bevestig je e-mailadres. We hebben je een code gestuurd.",
                "expires_in_seconds": TWO_FACTOR_CODE_EXPIRY_MINUTES * 60,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"detail": "E-mailadres is verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(status=status.HTTP_200_OK)

        token = PasswordResetToken.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        origin = request.META.get("HTTP_ORIGIN", "http://localhost:5173")
        reset_url = f"{origin}/password-reset?token={token.token}"

        send_password_reset_email(user.email, reset_url)

        return Response(status=status.HTTP_200_OK)


class PasswordResetTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        reset_record = PasswordResetToken.objects.filter(token=token).select_related("user").first()
        if reset_record is None:
            return Response(
                {"detail": "Ongeldige resetlink."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if reset_record.used_at is not None:
            return Response(
                {"detail": "Deze resetlink is al gebruikt."},
                status=status.HTTP_410_GONE,
            )
        if reset_record.expires_at <= timezone.now():
            return Response(
                {"detail": "Deze resetlink is verlopen."},
                status=status.HTTP_410_GONE,
            )

        return Response({
            "email": reset_record.user.email,
            "token": str(reset_record.token),
        })


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = str(request.data.get("token", "")).strip()
        password = str(request.data.get("password", ""))

        if not token or not password:
            return Response(
                {"detail": "Wachtwoord is verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(password) < 8:
            return Response(
                {"detail": "Wachtwoord moet minimaal 8 tekens bevatten."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if SPECIAL_CHAR_REGEX.search(password) is None:
            return Response(
                {"detail": "Wachtwoord moet minimaal 1 speciaal teken bevatten."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_record = PasswordResetToken.objects.filter(token=token).select_related("user").first()
        if reset_record is None:
            return Response({"detail": "Ongeldige resetlink."}, status=status.HTTP_404_NOT_FOUND)
        if reset_record.used_at is not None:
            return Response({"detail": "Deze resetlink is al gebruikt."}, status=status.HTTP_410_GONE)
        if reset_record.expires_at <= timezone.now():
            return Response({"detail": "Deze resetlink is verlopen."}, status=status.HTTP_410_GONE)

        user = reset_record.user
        user.set_password(password)
        user.save(update_fields=["password"])

        reset_record.used_at = timezone.now()
        reset_record.save(update_fields=["used_at"])

        return Response({"detail": "Wachtwoord is gereset. Je kunt nu opnieuw inloggen."})
