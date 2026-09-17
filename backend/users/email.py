import logging

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from config.email import from_address

logger = logging.getLogger(__name__)


def _send_email(*, subject, to, html_template, txt_template, context):
    """Send a multipart email with both plain text and HTML."""
    if not to:
        return

    plain_text = render_to_string(txt_template, context)
    html_body = render_to_string(html_template, context)

    email = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=from_address(),
        to=to,
    )
    email.attach_alternative(html_body, "text/html")

    # Never fatal to the request: every caller is a login, signup or reset endpoint whose own
    # work has already succeeded, and none of them says anything about the mail in its response
    # anyway (password reset deliberately answers 200 for unknown addresses). But the failure
    # has to be visible somewhere — a bad secret, an unverified From domain or an SMTP auth
    # error used to be discarded here, leaving no trace of mail that never left.
    try:
        email.send()
    except Exception:
        logger.exception("Kon e-mail %r niet versturen naar %s", subject, ", ".join(to))


def send_password_reset_email(recipient_email, reset_url):
    _send_email(
        subject="Wachtwoord resetten",
        to=[recipient_email],
        html_template="emails/password-reset.html",
        txt_template="emails/password-reset.txt",
        context={"reset_url": reset_url},
    )


def send_two_factor_code_email(recipient_email, code):
    _send_email(
        subject="Je verificatiecode",
        to=[recipient_email],
        html_template="emails/two-factor-code.html",
        txt_template="emails/two-factor-code.txt",
        context={"code": code},
    )


def send_account_deleted_email(recipient_email, name):
    _send_email(
        subject="Je account is verwijderd",
        to=[recipient_email],
        html_template="emails/account-deleted.html",
        txt_template="emails/account-deleted.txt",
        context={"name": name},
    )


def send_welcome_email(recipient_email, name, login_url):
    _send_email(
        subject="Welkom bij Gemeentefinanciën",
        to=[recipient_email],
        html_template="emails/welcome.html",
        txt_template="emails/welcome.txt",
        context={"name": name, "login_url": login_url},
    )
