import os

from django.db import IntegrityError
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.constants import BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER
from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Challenge, ChallengeCategory, ChallengeFile, ChallengeFlag, ChallengeInstance, ChallengeNode, ChallengeTag, UserChallengeProgress, UserChallengeSubmit
from api.serializers import (
    ChallengeCategorySerializer,
    ChallengeDetailSerializer,
    ChallengeFileSerializer,
    ChallengeFlagSerializer,
    ChallengeFlagSubmitSerializer,
    ChallengeFlagWriteSerializer,
    ChallengeInstanceSerializer,
    ChallengeListSerializer,
    ChallengeTagSerializer,
    ChallengeWriteSerializer,
    UserChallengeProgressDetailSerializer,
)
from api.services.challenge_service import ChallengeService
from api.services.gitlab_service import (
    GitlabConfigError,
    GitlabNotFoundError,
    GitlabService,
    GitlabUnavailableError,
)


def _gitlab_error_response(exc):
    """Map a GitlabService exception to a DRF error Response.

    - GitlabConfigError      -> 409 (integration disabled/misconfigured)
    - GitlabNotFoundError    -> 404 (project/file gone)
    - GitlabUnavailableError -> 503 (GitLab unreachable; old content preserved)
    """
    if isinstance(exc, GitlabConfigError):
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
    if isinstance(exc, GitlabNotFoundError):
        return Response({'detail': str(exc)}, status=status.HTTP_404_NOT_FOUND)
    return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnChallengeViewSet(viewsets.ModelViewSet):
    """Canonical namespaced challenge CRUD API under /api/challenge/challenges/."""

    queryset = Challenge.objects.all().select_related('category').prefetch_related('tag_mappings__tag')
    permission_classes = [IsAuthenticated, HasJWTPermission]
    pagination_class = LimitOffsetPagination
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        return ChallengeService.filter_visible_learn_challenges(
            queryset, self.request.user, self.request.query_params
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChallengeDetailSerializer
        if self.action in {'create', 'update', 'partial_update'}:
            return ChallengeWriteSerializer
        return ChallengeListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            solved_ids = ChallengeService.solved_challenge_ids(
                request.user, [c.id for c in page]
            )
            serializer = self.get_serializer(
                page, many=True, context={'request': request, 'solved_ids': solved_ids}
            )
            return self.get_paginated_response(serializer.data)

        solved_ids = ChallengeService.solved_challenge_ids(request.user)
        serializer = self.get_serializer(
            queryset, many=True, context={'request': request, 'solved_ids': solved_ids}
        )
        return Response(serializer.data)

    def _build_slug_conflict_response(self, slug):
        suggestions = ChallengeService.build_slug_suggestions(slug)
        return Response(
            {
                'detail': 'Slug already exists.',
                'slug': slug,
                'suggestions': suggestions,
            },
            status=status.HTTP_409_CONFLICT,
        )

    @staticmethod
    def _normalize_slug(payload):
        raw = payload.get('slug')
        if raw is None:
            return None
        return str(raw).strip().lower()

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def create(self, request, *args, **kwargs):
        requested_slug = self._normalize_slug(request.data)
        if requested_slug and Challenge.objects.filter(slug=requested_slug).exists():
            return self._build_slug_conflict_response(requested_slug)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            challenge = serializer.save()
        except IntegrityError:
            fallback_slug = requested_slug or serializer.validated_data.get('slug')
            if fallback_slug and Challenge.objects.filter(slug=fallback_slug).exists():
                return self._build_slug_conflict_response(fallback_slug)
            raise ValidationError({'detail': 'Invalid payload.'})

        detail_serializer = ChallengeDetailSerializer(challenge, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        requested_slug = self._normalize_slug(request.data)
        if requested_slug and requested_slug != instance.slug:
            return Response(
                {'detail': 'Slug is immutable after creation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Honour partial (PATCH) so the immutable slug is not required on edit.
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        challenge = serializer.save()

        detail_serializer = ChallengeDetailSerializer(challenge, context={'request': request})
        return Response(detail_serializer.data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def destroy(self, request, *args, **kwargs):
        challenge = self.get_object()
        mode = request.query_params.get('mode', 'archive')
        normalized_mode = (mode or 'archive').strip().lower()

        if normalized_mode not in {'archive', 'purge'}:
            return Response(
                {'detail': "mode must be 'archive' or 'purge'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if normalized_mode == 'purge':
            challenge.delete()
        else:
            challenge.status = Challenge.Status.ARCHIVED
            challenge.save(update_fields=['status', 'updated_at'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def flags(self, request, slug=None):
        challenge = self.get_object()
        if request.method == 'GET':
            qs = challenge.flags.all().order_by('id')
            serializer = ChallengeFlagSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        serializer = ChallengeFlagWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        flag = serializer.save(challenge=challenge)
        return Response(
            ChallengeFlagSerializer(flag, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def flag_detail(self, request, slug=None, flag_id=None):
        challenge = self.get_object()
        flag = get_object_or_404(ChallengeFlag, id=flag_id, challenge=challenge)

        if request.method == 'DELETE':
            flag.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        partial = request.method == 'PATCH'
        serializer = ChallengeFlagWriteSerializer(
            flag, data=request.data, partial=partial, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        flag = serializer.save()
        return Response(ChallengeFlagSerializer(flag, context={'request': request}).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def submit(self, request, slug=None):
        challenge = self.get_object()
        serializer = ChallengeFlagSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = serializer.validated_data['flag']

        instance_flag = None
        if challenge.instance_required:
            running = ChallengeService.get_running_instance(challenge, request.user)
            if running is None:
                return Response(
                    {'detail': 'No running instance. Start an instance first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instance_flag = running.flag_value

        is_correct = any(
            flag.validate_submission(submitted, instance_flag)
            for flag in challenge.flags.all()
        )

        ChallengeService.record_submission(request.user, challenge, submitted, is_correct)
        if is_correct:
            ChallengeService.handle_correct_submission(request.user, challenge)

        return Response({'correct': is_correct})

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def instance_start(self, request, slug=None):
        challenge = self.get_object()
        if not challenge.instance_required:
            return Response(
                {'detail': 'This challenge does not require an instance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = ChallengeService.get_running_instance(challenge, request.user)
        if existing:
            return Response(ChallengeInstanceSerializer(existing, context={'request': request}).data)

        instance = ChallengeService.create_instance(challenge, request.user)
        try:
            instance.start()
        except Exception as exc:
            instance.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            ChallengeInstanceSerializer(instance, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def instance_stop(self, request, slug=None):
        challenge = self.get_object()
        running = ChallengeService.get_running_instance(challenge, request.user)
        if running is None:
            return Response({'detail': 'No running instance found.'}, status=status.HTTP_404_NOT_FOUND)
        running.stop()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def instance_status(self, request, slug=None):
        challenge = self.get_object()
        instance = (
            ChallengeInstance.objects
            .filter(user=request.user, challenge=challenge)
            .order_by('-created_at')
            .first()
        )
        if instance is None:
            return Response({'status': 'none'})
        return Response(ChallengeInstanceSerializer(instance, context={'request': request}).data)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def challenge_progress(self, request, slug=None):
        challenge = self.get_object()
        serializer = UserChallengeProgressDetailSerializer(challenge, request.user)
        return Response(serializer.data)

    # ── Attachment files (Task 6.8 Phase 1) ──────────────────────────────────
    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def files(self, request, slug=None):
        """GET list / POST multipart upload of challenge attachment files."""
        challenge = self.get_object()
        if request.method == 'GET':
            qs = ChallengeService.list_files(challenge)
            serializer = ChallengeFileSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'detail': "A multipart 'file' field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        challenge_file = ChallengeService.save_uploaded_file(
            challenge, upload, actor=request.user
        )
        return Response(
            ChallengeFileSerializer(challenge_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def file_detail(self, request, slug=None, file_id=None):
        """DELETE an attachment file (row + media)."""
        challenge = self.get_object()
        challenge_file = get_object_or_404(ChallengeFile, id=file_id, challenge=challenge)
        ChallengeService.delete_file(challenge_file)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
    def file_download(self, request, slug=None, file_id=None):
        """Stream attachment bytes from media (published-only for Members)."""
        challenge = self.get_object()

        # Members may only download from a published challenge; Admin/Editor (who
        # can read drafts) may download regardless of status.
        if challenge.status != Challenge.Status.PUBLISHED and not ChallengeService._can_read_draft(request.user):
            raise Http404('Challenge not available.')

        challenge_file = get_object_or_404(ChallengeFile, id=file_id, challenge=challenge)
        abs_path = ChallengeService._absolute_media_path(challenge_file.storage_key)
        if not os.path.isfile(abs_path):
            raise Http404('File is no longer available.')

        response = FileResponse(
            open(abs_path, 'rb'),
            as_attachment=True,
            filename=challenge_file.filename,
        )
        if challenge_file.content_type:
            response['Content-Type'] = challenge_file.content_type
        return response

    # ── GitLab sync (Task 6.8 Phase 2) ───────────────────────────────────────
    @add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
    def sync_gitlab(self, request, slug=None):
        """POST .../sync-gitlab/ — re-pull README + files (503 preserves old)."""
        challenge = self.get_object()
        try:
            ChallengeService.sync_gitlab(challenge=challenge, actor=request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (GitlabConfigError, GitlabNotFoundError, GitlabUnavailableError) as exc:
            return _gitlab_error_response(exc)

        challenge.refresh_from_db()
        return Response(ChallengeDetailSerializer(challenge, context={'request': request}).data)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
class ChallengeGitlabViewSet(viewsets.ViewSet):
    """Browse GitLab projects + import as challenges (Task 6.8 Phase 2).

    Read-only browse + import. Server-mediated: the GitLab token never leaves the
    backend; the frontend only sees normalized project/file metadata.
    """

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def projects(self, request):
        """GET /api/challenge/gitlab/projects/?search=&page= — list projects."""
        search = (request.query_params.get('search') or '').strip()
        try:
            page = int(request.query_params.get('page') or 1)
        except (TypeError, ValueError):
            page = 1
        try:
            items = GitlabService.list_projects(search=search, page=page)
        except (GitlabConfigError, GitlabNotFoundError, GitlabUnavailableError) as exc:
            return _gitlab_error_response(exc)
        return Response({'items': items})

    def project_files(self, request, project_id=None):
        """GET /api/challenge/gitlab/projects/{id}/files/ — root-tree files.

        Annotates each file with ``default_checked`` for the import picker
        (``attachment.zip`` + ``README.md`` are pre-selected).
        """
        try:
            project = GitlabService.get_project(project_id)
            tree = GitlabService.list_root_tree(project_id, project['default_branch'])
        except (GitlabConfigError, GitlabNotFoundError, GitlabUnavailableError) as exc:
            return _gitlab_error_response(exc)

        defaults = {name.lower() for name in ChallengeService.DEFAULT_GITLAB_FILES}
        files = [
            {
                'name': entry['name'],
                'path': entry['path'],
                'default_checked': entry['name'].lower() in defaults,
            }
            for entry in tree
            if entry['type'] == 'blob'
        ]
        return Response({'project': project, 'files': files})

    def import_project(self, request):
        """POST /api/challenge/gitlab/import/ — create a gitlab-sourced challenge."""
        project_id = request.data.get('project_id')
        if project_id in (None, ''):
            return Response({'detail': 'project_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        parent_node_id = request.data.get('parent_node_id')
        if parent_node_id in (None, ''):
            parent_node_id = None
        selected_files = request.data.get('selected_files') or []
        if not isinstance(selected_files, list):
            return Response({'detail': 'selected_files must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = ChallengeService.import_from_gitlab(
                project_id=project_id,
                parent_node_id=parent_node_id,
                selected_files=selected_files,
                actor=request.user,
            )
        except ChallengeNode.DoesNotExist:
            return Response({'detail': 'Invalid parent_node_id.'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (GitlabConfigError, GitlabNotFoundError, GitlabUnavailableError) as exc:
            return _gitlab_error_response(exc)

        return Response(
            ChallengeDetailSerializer(challenge, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR)
class ChallengeInstanceAdminView(APIView):
    """Admin view for listing all instances and force-killing them."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get(self, request):
        qs = ChallengeInstance.objects.select_related('challenge', 'user').all()
        challenge_id = request.query_params.get('challenge')
        user_id = request.query_params.get('user')
        instance_status = request.query_params.get('status')
        if challenge_id:
            qs = qs.filter(challenge_id=challenge_id)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if instance_status:
            qs = qs.filter(status=instance_status)
        serializer = ChallengeInstanceSerializer(qs.order_by('-created_at'), many=True, context={'request': request})
        return Response(serializer.data)


@add_role_granted(BUILTIN_ROLE_ADMIN)
class ChallengeInstanceKillView(APIView):
    """Admin-only force-kill for a specific instance."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def post(self, request, pk=None):
        instance = get_object_or_404(ChallengeInstance, pk=pk)
        if instance.status == ChallengeInstance.InstanceStatus.TERMINATED:
            return Response({'detail': 'Instance already terminated.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.terminate()
        return Response(status=status.HTTP_204_NO_CONTENT)


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class ChallengeProgressView(APIView):
    """Aggregate challenge progress for the requesting user."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get(self, request):
        solved_count = UserChallengeProgress.objects.filter(
            user=request.user, completed_at__isnull=False
        ).count()
        total_attempts = UserChallengeSubmit.objects.filter(user=request.user).count()
        return Response({'solved_count': solved_count, 'total_attempts': total_attempts})


@add_role_granted(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR, BUILTIN_ROLE_MEMBER)
class LearnChallengeCategoryViewSet(viewsets.ModelViewSet):
    """Canonical namespaced category CRUD API under /api/challenge/categories/."""

    queryset = ChallengeCategory.objects.all().order_by('name')
    serializer_class = ChallengeCategorySerializer
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
class LearnChallengeTagViewSet(viewsets.ModelViewSet):
    """Canonical namespaced tag CRUD API under /api/challenge/tags/."""

    queryset = ChallengeTag.objects.all().order_by('name')
    serializer_class = ChallengeTagSerializer
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
