from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChartComment
from .serializers import ChartCommentSerializer


class ChartCommentBatchView(APIView):
    """Batch-fetch the authenticated user's comments for multiple charts."""

    def get(self, request):
        raw = request.query_params.get("charts", "")
        chart_ids = [cid.strip() for cid in raw.split(",") if cid.strip()]
        if not chart_ids:
            return Response([])

        comments = ChartComment.objects.filter(
            user=request.user, chart_id__in=chart_ids
        )
        serializer = ChartCommentSerializer(comments, many=True)
        return Response(serializer.data)


class ChartCommentDetailView(APIView):
    """Create, update, or delete a single chart comment for the authenticated user."""

    def put(self, request, chart_id):
        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"detail": "Text mag niet leeg zijn."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment, _created = ChartComment.objects.update_or_create(
            user=request.user,
            chart_id=chart_id,
            defaults={"text": text},
        )
        serializer = ChartCommentSerializer(comment)
        return Response(serializer.data)

    def delete(self, request, chart_id):
        deleted, _ = ChartComment.objects.filter(
            user=request.user, chart_id=chart_id
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
