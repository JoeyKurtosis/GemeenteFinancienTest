from django.urls import path

from . import views

urlpatterns = [
    path("support-requests/", views.SupportRequestCreateView.as_view(), name="support-requests-create"),
]
