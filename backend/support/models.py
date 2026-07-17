import datetime
import random

from django.db import models


class SupportRequest(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    ticket_number = models.CharField(max_length=32, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} ({self.email})"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            today = datetime.date.today().strftime("%Y%m%d")
            self.ticket_number = f"SR-{today}-{random.randint(1000, 9999)}"
        super().save(*args, **kwargs)


class SupportRequestAttachment(models.Model):
    support_request = models.ForeignKey(
        SupportRequest, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="support/%Y/%m/%d/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.support_request.ticket_number} — {self.file.name}"
