# ai/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .serializers import AIRequestSerializer
from .models import AIRequest
from .services.context_loader import load_context
from .services.prompt_builder import build_prompt
from .services.llm_client import call_llm

class AIAskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AIRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        context = load_context(
            data.get("context_type"),
            data.get("context_id")
        )

        prompt = build_prompt(
            data["mode"],
            data["question"],
            context
        )

        response_text = call_llm(prompt)

        AIRequest.objects.create(
            user=request.user,
            mode=data["mode"],
            input_text=data["question"],
            context_type=data.get("context_type"),
            context_id=data.get("context_id"),
            response_text=response_text
        )

        return Response({"answer": response_text})
