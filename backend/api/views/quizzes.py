from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.constants import BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Quiz, QuizCategory, QuizNode, QuizTag
from api.serializers import (
    QuizCategorySerializer,
    QuizConfigSerializer,
    QuizDetailSerializer,
    QuizExplorerSerializer,
    QuizListSerializer,
    QuizNodeSerializer,
    QuizNodeWriteSerializer,
    QuizQuestionManageSerializer,
    QuizTagSerializer,
    UserQuizProgressSerializer,
)
from api.services.quiz_service import QuizService


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class QuizViewSet(viewsets.ModelViewSet):
    """Quiz management viewset."""

    permission_classes = [IsAuthenticated, HasJWTPermission]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        queryset = Quiz.objects.all().select_related('category').prefetch_related('tag_mappings__tag')
        return QuizService.filter_visible_quizzes_flat(queryset, self.request.user, self.request.query_params)

    def get_serializer_class(self):
        if self.action in {'retrieve', 'create', 'update', 'partial_update'}:
            return QuizDetailSerializer
        if self.action in {'questions', 'question_detail'}:
            return QuizQuestionManageSerializer
        if self.action == 'config':
            return QuizConfigSerializer
        return QuizListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            solved_ids = QuizService.solved_quiz_ids(request.user, [q.id for q in page])
            serializer = QuizListSerializer(
                page, many=True, context={'request': request, 'solved_ids': solved_ids}
            )
            return self.get_paginated_response(serializer.data)

        solved_ids = QuizService.solved_quiz_ids(request.user)
        serializer = QuizListSerializer(
            queryset, many=True, context={'request': request, 'solved_ids': solved_ids}
        )
        return Response(serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
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

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
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


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class QuizCategoryViewSet(viewsets.ModelViewSet):
    """Canonical namespaced category CRUD API under /api/quiz/categories/."""

    queryset = QuizCategory.objects.all().order_by('name')
    serializer_class = QuizCategorySerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class QuizTagViewSet(viewsets.ModelViewSet):
    """Canonical namespaced tag CRUD API under /api/quiz/tags/."""

    queryset = QuizTag.objects.all().order_by('name')
    serializer_class = QuizTagSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class QuizNodeViewSet(viewsets.ModelViewSet):
    """QuizNode tree CRUD API.

    The quiz tree is a single global file-explorer hierarchy (folder = node,
    quiz = leaf item via OneToOne ``quiz``). Like challenges, quiz items are
    independent, so there is NO manual reorder; siblings are sorted folder-first
    then by case-insensitive title (A->Z).
    """

    # Folder-first (is_item=False before True), then case-insensitive title.
    queryset = (
        QuizNode.objects.all()
        .select_related('parent', 'quiz')
        .order_by('is_item', Lower('title'), 'id')
    )
    serializer_class = QuizNodeSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            return queryset.filter(parent__isnull=True)
        return queryset

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        serializer = QuizNodeWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            node = QuizService.create_quiz_node_atomic(serializer.validated_data, request.user)
        except QuizNode.DoesNotExist:
            raise ValidationError({'parent_id': 'Invalid parent_id'})
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_serializer = QuizNodeSerializer(node, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        node = self.get_object()
        children = node.children.select_related('quiz').order_by('is_item', Lower('title'), 'id')
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        node = self.get_object()
        parent_id = request.data.get('parent_id')

        if parent_id in (None, ''):
            new_parent = None
        else:
            new_parent = get_object_or_404(QuizNode, id=parent_id)

        if new_parent and new_parent.is_item:
            return Response(
                {'detail': 'Item nodes cannot have children.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            QuizService.move_quiz_node_bulk(node, new_parent)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(node)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    @action(detail=False, methods=['get'], url_path='explorer')
    def explorer_root(self, request):
        """File-explorer contents at the root (folders + visible quiz items)."""
        return self._explorer_response(request, parent=None)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    @action(detail=True, methods=['get'], url_path='explorer')
    def explorer_folder(self, request, pk=None):
        """File-explorer contents inside folder ``pk``."""
        node = self.get_object()
        if node.is_item:
            return Response({'folder': None, 'breadcrumb': [], 'nodes': []})
        return self._explorer_response(request, parent=node)

    def _explorer_response(self, request, parent):
        nodes = QuizService.list_explorer_children(parent, request.user)
        solved_ids = QuizService.solved_quiz_ids(
            request.user, [n.quiz_id for n in nodes if n.quiz_id]
        )
        breadcrumb = QuizService.build_breadcrumb(parent)
        serializer = QuizExplorerSerializer(
            nodes,
            many=True,
            context={'request': request, 'solved_ids': solved_ids},
        )
        folder_payload = None
        if parent is not None:
            folder_payload = {'id': parent.id, 'title': parent.title, 'path': parent.path}
        return Response(
            {
                'folder': folder_payload,
                'breadcrumb': breadcrumb,
                'nodes': serializer.data,
            }
        )
