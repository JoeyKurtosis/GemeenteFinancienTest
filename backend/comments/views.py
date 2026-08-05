from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChartComment
from .serializers import ChartCommentSerializer


class ChartCommentBatchView(APIView):
    """
    Fetch the authenticated user's comments.

    A page asks for the charts it draws (`?charts=a,b,c`); the account overview asks for
    everything by leaving the parameter off. An empty `?charts=` is a page with no charts to
    ask about, which is not the same question — that still answers with nothing.
    """

    def get(self, request):
        raw = request.query_params.get("charts")

        if raw is None:
            # Meta.ordering puts the most recently edited note first.
            comments = ChartComment.objects.filter(user=request.user)
        else:
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
