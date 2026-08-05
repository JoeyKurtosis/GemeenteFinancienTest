from rest_framework import serializers

from .models import ChartComment


class ChartCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartComment
        fields = ["id", "chart_id", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
