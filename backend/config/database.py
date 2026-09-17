import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from config.secrets import read_secret

BASE_DIR = Path(__file__).resolve().parent.parent

# The keys a secret must carry. dbname is deliberately absent: RDS-managed secrets usually
# omit it, and _postgres() falls back to <prefix>_NAME for exactly that reason.
_REQUIRED_SECRET_KEYS = ("username", "password", "host")


def _postgres(prefix: str, default_name: str, *, resolve_secret: bool = True) -> dict:
    """Postgres config for `prefix`.

    Credentials come from <prefix>_USER/_PASSWORD/_HOST/_PORT/_NAME when _HOST and _USER
    are both set, and from an AWS Secrets Manager secret otherwise, named by
    <prefix>_SECRET_ARN (or <prefix>_SECRET_NAME) — boto3 resolves the AWS credentials from
    the instance/task IAM role. A failed secret fetch is left to raise: crashing at startup
    beats silently falling back to a half-configured database.

    `resolve_secret=False` skips the fetch entirely and takes the plaintext branch. It is
    for callers that only need a well-formed entry in DATABASES and will never connect on
    it — see get_iv3_database().
    """
    secret_id = os.getenv(f"{prefix}_SECRET_ARN") or os.getenv(f"{prefix}_SECRET_NAME")

    # Plaintext credentials beat the secret. Secrets Manager is not reachable from a laptop —
    # there is no instance role behind boto3's default chain — so <prefix>_HOST plus
    # <prefix>_USER in .env is how local work connects, and it has to win over a
    # <prefix>_SECRET_NAME sitting in the same file for the deployed run. Both halves are
    # required: a lone _HOST is not credentials, and silently connecting as an empty user
    # would turn a typo into a confusing authentication failure.
    plaintext = bool(os.getenv(f"{prefix}_HOST") and os.getenv(f"{prefix}_USER"))

    if secret_id and resolve_secret and not plaintext:
        secret = read_secret(secret_id)
        missing = [key for key in _REQUIRED_SECRET_KEYS if not secret.get(key)]
        if missing:
            # sorted(secret) — key names only. This message reaches the logs, so the values
            # themselves must never appear in it.
            raise ImproperlyConfigured(
                f"The AWS secret {secret_id!r} is missing {', '.join(missing)}. "
                f"It carries: {', '.join(sorted(secret)) or '(nothing)'}. A standard RDS "
                f"secret has username, password, host, port and dbname."
            )
        # RDS-managed secrets usually omit dbname, so fall back to the env var.
        name = secret.get("dbname") or os.getenv(f"{prefix}_NAME", default_name)
        user = secret["username"]
        password = secret["password"]
        host = secret["host"]
        port = str(secret.get("port", 5432))
    else:
        name = os.getenv(f"{prefix}_NAME", default_name)
        user = os.getenv(f"{prefix}_USER", "")
        password = os.getenv(f"{prefix}_PASSWORD", "")
        host = os.getenv(f"{prefix}_HOST", "localhost")
        port = os.getenv(f"{prefix}_PORT", "5432")

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": name,
        "USER": user,
        "PASSWORD": password,
        "HOST": host,
        "PORT": port,
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"sslmode": os.getenv(f"{prefix}_SSLMODE", "prefer")},
    }


def get_default_database() -> dict:
    """Django's own tables (auth, sessions, users, support).

    SQLite locally; Postgres in production, where APP_DB_SECRET_ARN points at the
    AWS secret. These tables cannot live in the iv3 warehouse — that database is
    owned by another team and this app only holds SELECT on it.
    """
    configured = any(
        os.getenv(var)
        for var in ("APP_DB_SECRET_ARN", "APP_DB_SECRET_NAME", "APP_DB_HOST")
    )
    if configured:
        return _postgres("APP_DB", "gemeentefinancien")

    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }


def get_iv3_database(*, resolve_secret: bool = False) -> dict:
    """The read-only IV3 warehouse (municipal finance data).

    Resolving the secret is opt-in, and settings.py does not opt in. Every process that
    imports settings builds DATABASES, so fetching IV3_DB_SECRET_ARN eagerly would put a
    Secrets Manager call — and a startup crash when the role lacks GetSecretValue — in
    front of every gunicorn worker, for a connection the web app never opens. Only
    sync_iv3_summary passes resolve_secret=True, and it is the only thing that connects.
    Unresolved, this is an inert entry pointing at a localhost that is never dialled.

    The connection is opened read-only at the Postgres level. Iv3Router already stops
    migrations from creating app tables here, but it cannot stop Django's migration
    recorder, which creates django_migrations before any router is consulted — running
    `migrate --database=iv3` would otherwise litter another team's warehouse. With this
    set, every write on this connection fails instead.
    """
    config = _postgres("IV3_DB", "iv3", resolve_secret=resolve_secret)
    config["OPTIONS"]["options"] = "-c default_transaction_read_only=on"
    return config
