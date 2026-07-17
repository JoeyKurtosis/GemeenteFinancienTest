from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportRequestAttachment
from .serializers import SupportRequestCreateSerializer


class SupportRequestCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SupportRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        support_request = serializer.save()

        for f in request.FILES.getlist("attachments"):
            SupportRequestAttachment.objects.create(
                support_request=support_request, file=f
            )

        return Response(
            {
                "id": support_request.id,
                "ticket_number": support_request.ticket_number,
                "name": support_request.name,
                "email": support_request.email,
                "subject": support_request.subject,
                "message": support_request.message,
            },
            status=status.HTTP_201_CREATED,
        )
