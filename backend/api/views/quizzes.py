from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Quiz, QuizNode
from api.serializers import (
    QuizConfigSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    QuizNodeSerializer,
    QuizQuestionManageSerializer,
    UserQuizProgressSerializer,
)
from api.services.quiz_service import QuizService


@add_role_granted('Admin', 'Editor', 'Member')
class QuizViewSet(viewsets.ModelViewSet):
    """Quiz management viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = Quiz.objects.all().select_related('category')

        status_param = self.request.query_params.get('status')
        queryset = QuizService.filter_visible_quizzes(queryset, self.request.user, status_param)
        return queryset.order_by('id')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        if self.action in {'questions', 'question_detail'}:
            return QuizQuestionManageSerializer
        if self.action == 'config':
            return QuizConfigSerializer
        return QuizListSerializer

    @add_role_granted('Admin', 'Editor')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    @action(detail=True, methods=['get', 'post'], url_path='questions')
    def questions(self, request, pk=None):
        quiz = self.get_object()

        if request.method.lower() == 'get':
            serializer = QuizQuestionManageSerializer(
                quiz.questions.order_by('position').prefetch_related('options', 'answers'),
                many=True,
            )
            return Response(serializer.data)

        serializer = QuizQuestionManageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(quiz=quiz)
        QuizService.sync_total_questions(quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted('Admin', 'Editor')
    @action(detail=True, methods=['get', 'put', 'delete'], url_path=r'questions/(?P<qid>\d+)')
    def question_detail(self, request, pk=None, qid=None):
        quiz = self.get_object()
        question = QuizService.get_quiz_question(quiz, qid)

        if request.method.lower() == 'get':
            serializer = QuizQuestionManageSerializer(question)
            return Response(serializer.data)

        if request.method.lower() == 'delete':
            question.delete()
            QuizService.sync_total_questions(quiz)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = QuizQuestionManageSerializer(question, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'put'])
    def config(self, request, pk=None):
        quiz = self.get_object()
        config, _ = QuizService.get_or_create_user_config(quiz, request.user)

        if request.method.lower() == 'get':
            serializer = QuizConfigSerializer(config)
            return Response(serializer.data)

        serializer = QuizConfigSerializer(config, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(quiz=quiz, user=request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        quiz = self.get_object()
        prog = QuizService.get_user_progress(quiz, request.user)
        if prog is not None:
            return Response(UserQuizProgressSerializer(prog).data)
        return Response(QuizService.build_default_progress_payload(quiz.id, request.user.id))


@add_role_granted('Admin', 'Editor', 'Member')
class QuizNodeViewSet(viewsets.ModelViewSet):
    """QuizNode tree CRUD API."""

    queryset = QuizNode.objects.all().select_related('parent', 'quiz').order_by('position', 'id')
    serializer_class = QuizNodeSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.filter(parent__isnull=True)
        return queryset

    @add_role_granted('Admin', 'Editor')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        node = self.get_object()
        serializer = self.get_serializer(node.children.order_by('position', 'id'), many=True)
        return Response(serializer.data)

    @add_role_granted('Admin', 'Editor')
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        node = self.get_object()
        parent_id = request.data.get('parent_id')

        if parent_id in (None, ''):
            new_parent = None
        else:
            new_parent = get_object_or_404(QuizNode, id=parent_id)

        try:
            node.move_to(new_parent)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(node)
        return Response(serializer.data, status=status.HTTP_200_OK)
