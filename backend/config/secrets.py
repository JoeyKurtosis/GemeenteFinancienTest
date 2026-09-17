import json
import os

from django.core.exceptions import ImproperlyConfigured


_DEFAULT_REGION = "eu-central-1"


def read_secret(secret_id: str) -> dict:
    """The JSON body of an AWS Secrets Manager secret.

    Every caller treats a failure here as fatal, so the only thing this adds over a bare
    boto3 call is a message that says which secret and which region were tried — the two
    things a botocore ResourceNotFoundException does not tell you.

    Which keys a secret must carry is the caller's business, not this function's: see
    _postgres() in database.py and _credentials() in email.py.
    """
    import boto3

    region = (
        os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or _DEFAULT_REGION
    )
    client = boto3.client("secretsmanager", region_name=region)

    try:
        payload = client.get_secret_value(SecretId=secret_id)["SecretString"]
    except Exception as exc:
        raise ImproperlyConfigured(
            f"Could not read the AWS secret {secret_id!r} in region {region!r}: {exc}. "
            f"Check the secret name, the region, and that the instance/task role holds "
            f"secretsmanager:GetSecretValue on it."
        ) from exc

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ImproperlyConfigured(
            f"The AWS secret {secret_id!r} is not JSON. It must be a key/value secret."
        ) from exc
