from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def _send_email(*, subject, to, html_template, txt_template, context):
    """Send a multipart email with both plain text and HTML."""
    if not to:
        return

    plain_text = render_to_string(txt_template, context)
    html_body = render_to_string(html_template, context)

    email = EmailMultiAlternatives(
        subject=subject,
        body=plain_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)


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


def send_welcome_email(recipient_email, name, login_url):
    _send_email(
        subject="Welkom bij Gemeentefinanciën",
        to=[recipient_email],
        html_template="emails/welcome.html",
        txt_template="emails/welcome.txt",
        context={"name": name, "login_url": login_url},
    )
