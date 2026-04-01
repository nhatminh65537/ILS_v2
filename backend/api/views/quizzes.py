from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.mixins.rbac_action_permission import RBACActionPermissionMixin
from api.models import Quiz, QuizConfig, QuizNode, QuizQuestion, UserQuizAttempt
from api.serializers import (
    QuizAnswerSubmitSerializer,
    QuizConfigSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    QuizNodeSerializer,
    QuizQuestionManageSerializer,
    UserQuizAttemptSerializer,
)


class QuizActionPermission(permissions.BasePermission):
    """Role-aware guard for quiz APIs when JWT permission claims are absent."""

    editor_actions = {
        'create',
        'update',
        'partial_update',
        'destroy',
        'questions',
        'question_detail',
    }

    def _has_role(self, user, role_names):
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.user_roles.filter(role__name__in=role_names).exists()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if view.action in self.editor_actions:
            return self._has_role(user, ('Admin', 'Editor'))

        return True


@add_role_granted('Admin', 'Editor', 'Member')
class QuizViewSet(RBACActionPermissionMixin, viewsets.ModelViewSet):
    """Quiz management viewset."""

    base_permission_classes = (IsAuthenticated, QuizActionPermission)
    permission_classes = [IsAuthenticated, QuizActionPermission]

    action_permission_map = {
        'list': 'api.quiz.list',
        'retrieve': 'api.quiz.retrieve',
        'create': 'api.quiz.create',
        'update': 'api.quiz.update',
        'partial_update': 'api.quiz.partial_update',
        'destroy': 'api.quiz.destroy',
        'questions': 'api.quiz.questions',
        'question_detail': 'api.quiz.question_detail',
        'config': 'api.quiz.config',
    }

    def get_queryset(self):
        queryset = Quiz.objects.all().select_related('category')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self._is_editor_or_admin(self.request.user):
            queryset = queryset.filter(status=Quiz.Status.PUBLISHED)

        return queryset.order_by('id')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        if self.action in {'questions', 'question_detail'}:
            return QuizQuestionManageSerializer
        if self.action == 'config':
            return QuizConfigSerializer
        return QuizListSerializer

    def _is_editor_or_admin(self, user):
        if user.is_superuser:
            return True
        return user.user_roles.filter(role__name__in=['Admin', 'Editor']).exists()

    def _get_quiz_question(self, quiz, qid):
        return get_object_or_404(QuizQuestion, id=qid, quiz=quiz)

    def _sync_total_questions(self, quiz):
        total = quiz.questions.count()
        if quiz.total_questions != total:
            quiz.total_questions = total
            quiz.save(update_fields=['total_questions', 'updated_at'])

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
        self._sync_total_questions(quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted('Admin', 'Editor')
    @action(detail=True, methods=['get', 'put', 'delete'], url_path=r'questions/(?P<qid>\d+)')
    def question_detail(self, request, pk=None, qid=None):
        quiz = self.get_object()
        question = self._get_quiz_question(quiz, qid)

        if request.method.lower() == 'get':
            serializer = QuizQuestionManageSerializer(question)
            return Response(serializer.data)

        if request.method.lower() == 'delete':
            question.delete()
            self._sync_total_questions(quiz)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = QuizQuestionManageSerializer(question, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'put'])
    def config(self, request, pk=None):
        quiz = self.get_object()
        config, _ = QuizConfig.objects.get_or_create(quiz=quiz, user=request.user)

        if request.method.lower() == 'get':
            serializer = QuizConfigSerializer(config)
            return Response(serializer.data)

        serializer = QuizConfigSerializer(config, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(quiz=quiz, user=request.user)
        return Response(serializer.data)

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


@add_role_granted('Admin', 'Editor', 'Member')
class QuizNodeViewSet(RBACActionPermissionMixin, viewsets.ModelViewSet):
    """QuizNode tree CRUD API."""

    queryset = QuizNode.objects.all().select_related('parent', 'quiz').order_by('position', 'id')
    serializer_class = QuizNodeSerializer
    base_permission_classes = (IsAuthenticated, QuizActionPermission)
    permission_classes = [IsAuthenticated, QuizActionPermission]

    action_permission_map = {
        'list': 'api.quiznode.list',
        'retrieve': 'api.quiznode.retrieve',
        'create': 'api.quiznode.create',
        'update': 'api.quiznode.update',
        'partial_update': 'api.quiznode.partial_update',
        'destroy': 'api.quiznode.destroy',
        'children': 'api.quiznode.children',
        'move': 'api.quiznode.move',
    }

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
