"""Public same-origin gateway for the JAH answer engine."""

import json
import re

import requests
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .throttling import ChatBurstThrottle, ChatDailyThrottle


GEMEENTE_RE = re.compile(r"^GM\d{4}$")
CONNECT_TIMEOUT = 5
READ_TIMEOUT = 120


def _detail(upstream: requests.Response, fallback: str) -> str:
    try:
        body = upstream.json()
        detail = body.get("detail") if isinstance(body, dict) else None
        if isinstance(detail, str) and detail:
            return detail
    except (ValueError, requests.RequestException):
        pass
    return fallback


def _validate_request(data):
    question = data.get("question")
    if not isinstance(question, str) or not question.strip():
        return None, "Voer een vraag in."
    question = question.strip()
    if len(question) > 2000:
        return None, "De vraag is te lang (maximaal 2000 tekens)."

    dashboard = data.get("dashboard")
    if dashboard is not None and not isinstance(dashboard, dict):
        return None, "Ongeldige dashboardcontext."
    gemeente = dashboard.get("gemeente") if dashboard else None
    if gemeente is not None and (
        not isinstance(gemeente, str) or not GEMEENTE_RE.fullmatch(gemeente)
    ):
        return None, "Ongeldige gemeentecode."

    payload = {
        "question": question,
        "language": "nl",
        "pack": settings.ANSWER_ENGINE_PACK,
        "asking_entity": gemeente,
    }
    resolved_context = data.get("resolved_context")
    if resolved_context is not None:
        if not isinstance(resolved_context, dict):
            return None, "Ongeldige gesprekscontext."
        payload["resolved_context"] = resolved_context
    for key in ("answer_ref", "alternative"):
        value = data.get(key)
        if value is not None:
            if not isinstance(value, str) or not value or len(value) > 20000:
                return None, "Ongeldige gesprekstoken."
            payload[key] = value
    return payload, None


class ChatCompletionView(APIView):
    """Validate a browser turn and stream the answer engine's SSE response."""

    permission_classes = [AllowAny]
    throttle_classes = [ChatBurstThrottle, ChatDailyThrottle]

    def post(self, request):
        payload, error = _validate_request(request.data)
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.ANSWER_ENGINE_BASE_URL:
            return Response(
                {"detail": "De assistent is niet geconfigureerd."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            upstream = requests.post(
                f"{settings.ANSWER_ENGINE_BASE_URL}/ask/stream",
                json=payload,
                headers={"Accept": "text/event-stream"},
                stream=True,
                timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
            )
        except requests.Timeout:
            return Response(
                {"detail": "De assistent reageerde niet op tijd."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.RequestException:
            return Response(
                {"detail": "De assistent is tijdelijk niet bereikbaar."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if upstream.status_code != status.HTTP_200_OK:
            detail = _detail(upstream, "De assistent heeft het verzoek geweigerd.")
            upstream.close()
            client_status = (
                status.HTTP_400_BAD_REQUEST
                if upstream.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
                else status.HTTP_502_BAD_GATEWAY
            )
            return Response({"detail": detail}, status=client_status)

        content_type = upstream.headers.get("Content-Type", "")
        if "text/event-stream" not in content_type:
            upstream.close()
            return Response(
                {"detail": "De assistent gaf een ongeldig antwoord."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        def stream():
            try:
                yield from upstream.iter_content(chunk_size=8192)
            except requests.RequestException:
                detail = json.dumps(
                    {"detail": "De verbinding met de assistent werd verbroken."},
                    ensure_ascii=False,
                ).encode("utf-8")
                yield b"event: error\ndata: " + detail + b"\n\n"
            finally:
                upstream.close()

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class CapabilitiesView(APIView):
    """Return compile-verified starter questions for the selected municipality."""

    permission_classes = [AllowAny]

    def get(self, request):
        gemeente = request.query_params.get("gemeente")
        if not gemeente or not GEMEENTE_RE.fullmatch(gemeente):
            return Response(
                {"detail": "Ongeldige gemeentecode."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not settings.ANSWER_ENGINE_BASE_URL:
            return Response(
                {"detail": "De assistent is niet geconfigureerd."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            upstream = requests.get(
                f"{settings.ANSWER_ENGINE_BASE_URL}/capabilities",
                params={"pack": settings.ANSWER_ENGINE_PACK, "asking_entity": gemeente},
                timeout=(CONNECT_TIMEOUT, 30),
            )
        except requests.Timeout:
            return Response(
                {"detail": "Suggesties konden niet op tijd worden geladen."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.RequestException:
            return Response(
                {"detail": "Suggesties zijn tijdelijk niet beschikbaar."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if upstream.status_code != status.HTTP_200_OK:
            detail = _detail(upstream, "Suggesties konden niet worden geladen.")
            upstream.close()
            return Response(
                {"detail": detail},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        try:
            body = upstream.json()
        except ValueError:
            upstream.close()
            return Response(
                {"detail": "De assistent gaf een ongeldig antwoord."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        upstream.close()
        if not isinstance(body, dict) or not isinstance(body.get("starters"), list):
            return Response(
                {"detail": "De assistent gaf een ongeldig antwoord."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(body)
