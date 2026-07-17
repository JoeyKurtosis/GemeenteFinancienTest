from rest_framework import serializers

from .models import SupportRequest


class SupportRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportRequest
        fields = ["name", "email", "subject", "message"]
