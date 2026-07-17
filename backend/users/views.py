from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PasswordResetToken, UserProfile


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
        "avatar_url": avatar_url,
    }


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

        # Look up user by email
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

        login(request, user)
        return Response(serialize_user(user))


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

            # Login looks users up by email, and signup sets username = email,
            # so keep the username in sync when the email changes.
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

        # Keep the current session authenticated after the password change.
        update_session_auth_hash(request, request.user)

        return Response(status=status.HTTP_200_OK)


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

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Er bestaat al een account met dit e-mailadres."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate password
        try:
            validate_password(password)
        except ValidationError as e:
            return Response(
                {"detail": e.messages[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Split name into first/last
        parts = name.split(maxsplit=1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        # Create profile
        UserProfile.objects.create(user=user)

        login(request, user)
        return Response(serialize_user(user), status=status.HTTP_201_CREATED)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"detail": "E-mailadres is verplicht."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Always return 200 to prevent email enumeration
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(status=status.HTTP_200_OK)

        token = PasswordResetToken.objects.create(
            user=user,
            expires_at=timezone.now() + timezone.timedelta(hours=1),
        )

        reset_url = f"{request.META.get('HTTP_ORIGIN', 'http://localhost:5173')}/reset-password?token={token.token}"

        send_mail(
            subject="Wachtwoord resetten",
            message=f"Klik op de volgende link om je wachtwoord te resetten:\n\n{reset_url}\n\nDeze link is 1 uur geldig.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

        return Response(status=status.HTTP_200_OK)
