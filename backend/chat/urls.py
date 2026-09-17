from django.urls import path

from . import views

urlpatterns = [
    path("", views.ChatCompletionView.as_view(), name="chat-completion"),
    path("capabilities/", views.CapabilitiesView.as_view(), name="chat-capabilities"),
]
