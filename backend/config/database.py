import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _secret(secret_id: str) -> dict:
    import boto3

    client = boto3.client(
        "secretsmanager", region_name=os.getenv("AWS_REGION", "eu-west-1")
    )
    return json.loads(client.get_secret_value(SecretId=secret_id)["SecretString"])


def _postgres(prefix: str, default_name: str) -> dict:
    """Postgres config for `prefix`.

    Credentials come from an AWS Secrets Manager secret when <prefix>_SECRET_ARN (or
    <prefix>_SECRET_NAME) is set — boto3 resolves the AWS credentials from the
    instance/task IAM role — and from <prefix>_USER/_PASSWORD/_HOST/... otherwise.
    A failed secret fetch is left to raise: crashing at startup beats silently
    falling back to a half-configured database.
    """
    secret_id = os.getenv(f"{prefix}_SECRET_ARN") or os.getenv(f"{prefix}_SECRET_NAME")

    if secret_id:
        secret = _secret(secret_id)
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


def get_iv3_database() -> dict:
    """The read-only IV3 warehouse (municipal finance data).

    The connection is opened read-only at the Postgres level. Iv3Router already stops
    migrations from creating app tables here, but it cannot stop Django's migration
    recorder, which creates django_migrations before any router is consulted — running
    `migrate --database=iv3` would otherwise litter another team's warehouse. With this
    set, every write on this connection fails instead.
    """
    config = _postgres("IV3_DB", "iv3")
    config["OPTIONS"]["options"] = "-c default_transaction_read_only=on"
    return config
