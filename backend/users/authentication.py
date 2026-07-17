from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session authentication that skips CSRF checks.

    CSRF protection is not needed for API endpoints that use
    session cookies with SameSite and CORS restrictions.
    """

    def enforce_csrf(self, request):
        return
