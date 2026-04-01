from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Quiz, QuizQuestion, UserQuizAttempt
from api.serializers import QuizAnswerSubmitSerializer, QuizDetailSerializer, QuizListSerializer, UserQuizAttemptSerializer


@add_role_granted('Admin', 'Editor', 'Member')
class QuizViewSet(viewsets.ModelViewSet):
    """Quiz management viewset."""

    def get_queryset(self):
        queryset = Quiz.objects.all()

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status=Quiz.Status.PUBLISHED)

        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizListSerializer

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        quiz = self.get_object()
        attempt = UserQuizAttempt.objects.create(user=request.user, quiz=quiz, config=request.data.get('config', {}))
        serializer = UserQuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        quiz = self.get_object()
        serializer = QuizAnswerSubmitSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question_id = serializer.validated_data['question_id']
        answer_data = serializer.validated_data['answer_data']

        question = get_object_or_404(QuizQuestion, id=question_id, quiz=quiz)
        score_obtained = question.score_answer(answer_data)
        is_correct = score_obtained > 0

        return Response(
            {
                'correct': is_correct,
                'score': score_obtained,
                'explanation': question.explanation if is_correct else None,
            }
        )
