from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase


class FakeUpstream:
    def __init__(
        self,
        *,
        status_code=200,
        content_type="text/event-stream",
        chunks=(),
        body=None,
    ):
        self.status_code = status_code
        self.headers = {"Content-Type": content_type}
        self._chunks = chunks
        self._body = body
        self.closed = False

    def iter_content(self, chunk_size):
        yield from self._chunks

    def json(self):
        if isinstance(self._body, Exception):
            raise self._body
        return self._body

    def close(self):
        self.closed = True


@override_settings(
    ANSWER_ENGINE_BASE_URL="https://answer.example",
    ANSWER_ENGINE_PACK="kurtosis-gf",
)
class ChatGatewayTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="chat-user", password="password"
        )
        self.client.force_authenticate(self.user)

    @patch("chat.views.requests.post")
    def test_streams_upstream_and_maps_request(self, post):
        upstream = FakeUpstream(
            chunks=(
                b'event: token\ndata: {"text":"Hallo"}\n\n',
                b'event: response\ndata: {"type":"answer"}\n\n',
            )
        )
        post.return_value = upstream
        context = {"period": {"from": 2024, "to": 2024}, "custom": ["opaque"]}

        response = self.client.post(
            "/api/chat/",
            {
                "question": "  Wat zijn de lasten?  ",
                "dashboard": {"gemeente": "GM0363"},
                "resolved_context": context,
                "answer_ref": "answer-token",
                "alternative": "alternative-token",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            b"".join(response.streaming_content),
            b'event: token\ndata: {"text":"Hallo"}\n\n'
            b'event: response\ndata: {"type":"answer"}\n\n',
        )
        post.assert_called_once_with(
            "https://answer.example/ask/stream",
            json={
                "question": "Wat zijn de lasten?",
                "language": "nl",
                "pack": "kurtosis-gf",
                "asking_entity": "GM0363",
                "resolved_context": context,
                "answer_ref": "answer-token",
                "alternative": "alternative-token",
            },
            headers={"Accept": "text/event-stream"},
            stream=True,
            timeout=(5, 120),
        )
        self.assertTrue(upstream.closed)
        self.assertEqual(response["X-Accel-Buffering"], "no")

    @patch("chat.views.requests.post")
    def test_chat_is_available_anonymously(self, post):
        post.return_value = FakeUpstream(
            chunks=(b'event: response\ndata: {"type":"answer"}\n\n',)
        )
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/chat/",
            {"question": "Vraag", "dashboard": {"gemeente": "GM0363"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        b"".join(response.streaming_content)

    @patch("chat.views.requests.post")
    def test_rejects_invalid_input_before_calling_upstream(self, post):
        response = self.client.post(
            "/api/chat/",
            {"question": "Vraag", "dashboard": {"gemeente": "Amsterdam"}},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        post.assert_not_called()

    @patch("chat.views.requests.post")
    def test_rejects_non_opaque_state_shapes(self, post):
        response = self.client.post(
            "/api/chat/",
            {
                "question": "Vraag",
                "dashboard": {"gemeente": "GM0363"},
                "resolved_context": ["not", "an", "object"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        post.assert_not_called()

    @patch("chat.views.requests.post", side_effect=requests.Timeout)
    def test_reports_upstream_timeout(self, _post):
        response = self.client.post(
            "/api/chat/",
            {"question": "Vraag", "dashboard": {"gemeente": "GM0363"}},
            format="json",
        )
        self.assertEqual(response.status_code, 504)
        self.assertIn("niet op tijd", response.json()["detail"])

    @patch("chat.views.requests.post")
    def test_rejects_non_sse_upstream_response(self, post):
        upstream = FakeUpstream(content_type="application/json")
        post.return_value = upstream
        response = self.client.post(
            "/api/chat/",
            {"question": "Vraag", "dashboard": {"gemeente": "GM0363"}},
            format="json",
        )
        self.assertEqual(response.status_code, 502)
        self.assertTrue(upstream.closed)

    @patch("chat.views.requests.get")
    def test_capabilities_are_proxied_for_municipality(self, get):
        body = {
            "pack": "kurtosis-gf",
            "pack_version": "pack@0.2",
            "starters": [{"question": "Voorbeeld"}],
        }
        get.return_value = FakeUpstream(content_type="application/json", body=body)
        response = self.client.get("/api/chat/capabilities/?gemeente=GM0363")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), body)
        self.assertTrue(get.return_value.closed)
        get.assert_called_once_with(
            "https://answer.example/capabilities",
            params={"pack": "kurtosis-gf", "asking_entity": "GM0363"},
            timeout=(5, 30),
        )

    @patch("chat.views.requests.get")
    def test_capabilities_are_available_anonymously(self, get):
        get.return_value = FakeUpstream(
            content_type="application/json",
            body={"pack": "kurtosis-gf", "pack_version": "pack@0.2", "starters": []},
        )
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/chat/capabilities/?gemeente=GM0363")
        self.assertEqual(response.status_code, 200)

    def test_capabilities_require_valid_municipality(self):
        response = self.client.get("/api/chat/capabilities/?gemeente=0363")
        self.assertEqual(response.status_code, 400)
