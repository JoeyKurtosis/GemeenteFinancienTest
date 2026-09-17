"""Amazon SES over SMTP, configured from one AWS Secrets Manager secret.

EMAIL_SECRET_NAME is the only thing a deployment sets. The secret it names carries the SES
SMTP endpoint and the IAM SMTP credentials:

    {"smtp_server": "email-smtp.eu-central-1.amazonaws.com", "smtp_port": "587",
     "smtp_username": "AKIA...", "smtp_password": "...", "from_email": "..."}

from_email is optional and falls back to settings.DEFAULT_FROM_EMAIL. Whichever address is
used has to sit under a verified SES identity or SES refuses the message, so it belongs with
the credentials it is verified alongside — moving to another identity is then a secret edit
rather than a code change.

The secret is read on the first send and cached for the life of the process, never at settings
import. Same reasoning as get_iv3_database() in database.py: every process that imports
settings would otherwise pay a blocking Secrets Manager call — and crash on a missing IAM
permission — for mail that most of them never send.
"""

from functools import lru_cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.smtp import EmailBackend as SmtpEmailBackend

from config.secrets import read_secret

# What the secret has to carry. from_email and smtp_port are absent on purpose: the first is
# optional, the second defaults to the STARTTLS port every SES endpoint accepts.
_REQUIRED_SECRET_KEYS = ("smtp_server", "smtp_username", "smtp_password")

_DEFAULT_SMTP_PORT = 587


@lru_cache(maxsize=1)
def _credentials() -> dict:
    """The mail secret, validated.

    lru_cache is the whole caching story: one fetch per process, and — because it does not
    memoise exceptions — a transient Secrets Manager failure is retried on the next send
    instead of poisoning the worker for its lifetime.
    """
    if not settings.EMAIL_SECRET_NAME:
        raise ImproperlyConfigured(
            "EMAIL_SECRET_NAME is not set, so there is no SES secret to read. Set it to the "
            "name of the AWS secret holding the SES SMTP credentials, or leave it unset to "
            "keep the console backend."
        )

    secret = read_secret(settings.EMAIL_SECRET_NAME)

    missing = [key for key in _REQUIRED_SECRET_KEYS if not secret.get(key)]
    if missing:
        # sorted(secret) — key names only. This message reaches the logs, so the values
        # themselves must never appear in it.
        raise ImproperlyConfigured(
            f"The AWS secret {settings.EMAIL_SECRET_NAME!r} is missing {', '.join(missing)}. "
            f"It carries: {', '.join(sorted(secret)) or '(nothing)'}. An SES SMTP secret has "
            f"smtp_server, smtp_port, smtp_username, smtp_password and optionally from_email."
        )

    return secret


def from_address() -> str:
    """The From address for outgoing mail.

    The secret's from_email when it has one, so the address follows the SES identity the
    credentials belong to. Without EMAIL_SECRET_NAME this never touches AWS — local runs on
    the console backend stay offline.
    """
    if not settings.EMAIL_SECRET_NAME:
        return settings.DEFAULT_FROM_EMAIL

    return _credentials().get("from_email") or settings.DEFAULT_FROM_EMAIL


class SesSmtpEmailBackend(SmtpEmailBackend):
    """Django's SMTP backend, pointed at SES with credentials out of the secret.

    Django builds a backend per send (see django.core.mail.get_connection), which is what
    makes this the lazy seam: the secret is resolved on the first message rather than at
    import. Everything below __init__ — connection handling, TLS, retries — stays Django's.
    """

    def __init__(self, host=None, port=None, username=None, password=None, **kwargs):
        secret = _credentials()
        super().__init__(
            host=host or secret["smtp_server"],
            port=port or int(secret.get("smtp_port") or _DEFAULT_SMTP_PORT),
            username=username or secret["smtp_username"],
            password=password or secret["smtp_password"],
            **kwargs,
        )
