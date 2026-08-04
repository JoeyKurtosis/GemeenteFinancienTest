from django.conf import settings
from django.db import models


class ChartComment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chart_comments",
    )
    chart_id = models.CharField(max_length=255)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "chart_id"],
                name="unique_comment_per_user_chart",
            ),
        ]

    def __str__(self):
        return f"{self.user} — {self.chart_id}"
