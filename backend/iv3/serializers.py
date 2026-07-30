from rest_framework import serializers

from iv3.expression_eval import ALLOWED_FIELDS, FIELD_DESCRIPTIONS, validate_expression
from iv3.models import DashboardSettings, Measure


class DashboardSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardSettings
        fields = [
            "cpi_per_jaar",
            "cao_lonen_per_jaar",
            "inwonergroepen",
            "aggregation_method",
            "taakveld_label_overrides",
        ]


class MeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measure
        fields = ["key", "name", "expression", "description", "page"]

    def validate_expression(self, value):
        errors = validate_expression(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value


class FieldInfoSerializer(serializers.Serializer):
    """Read-only serializer for the available expression fields."""

    fields_list = serializers.SerializerMethodField()

    def get_fields_list(self, obj):
        return [
            {"name": name, "description": FIELD_DESCRIPTIONS.get(name, "")}
            for name in sorted(ALLOWED_FIELDS)
        ]
