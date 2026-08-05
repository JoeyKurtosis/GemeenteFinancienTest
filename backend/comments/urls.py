from django.urls import path

from . import views

urlpatterns = [
    path("", views.ChartCommentBatchView.as_view(), name="comments-batch"),
    path("<path:chart_id>/", views.ChartCommentDetailView.as_view(), name="comment-detail"),
]
