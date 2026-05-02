from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import Challenge, ChallengeCategory, ChallengeFlag, ChallengeInstance, ChallengeTag, UserChallengeProgress, UserChallengeSubmit
from api.serializers import (
    ChallengeCategorySerializer,
    ChallengeDetailSerializer,
    ChallengeFlagSerializer,
    ChallengeFlagSubmitSerializer,
    ChallengeFlagWriteSerializer,
    ChallengeInstanceSerializer,
    ChallengeListSerializer,
    ChallengeTagSerializer,
    ChallengeWriteSerializer,
)
from api.services.challenge_service import ChallengeService


@add_role_granted('Admin', 'Editor', 'Member')
class LearnChallengeViewSet(viewsets.ModelViewSet):
    """Canonical namespaced challenge CRUD API under /api/challenge/challenges/."""

    queryset = Challenge.objects.all().select_related('category').prefetch_related('tag_mappings__tag')
    permission_classes = [IsAuthenticated, HasJWTPermission]
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

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor')
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        requested_slug = self._normalize_slug(request.data)
        if requested_slug and requested_slug != instance.slug:
            return Response(
                {'detail': 'Slug is immutable after creation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = serializer.save()

        detail_serializer = ChallengeDetailSerializer(challenge, context={'request': request})
        return Response(detail_serializer.data)

    @add_role_granted('Admin', 'Editor')
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor')
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

    @add_role_granted('Admin', 'Editor', 'Member')
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

    @add_role_granted('Admin', 'Editor', 'Member')
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

    @add_role_granted('Admin', 'Editor', 'Member')
    def instance_stop(self, request, slug=None):
        challenge = self.get_object()
        running = ChallengeService.get_running_instance(challenge, request.user)
        if running is None:
            return Response({'detail': 'No running instance found.'}, status=status.HTTP_404_NOT_FOUND)
        running.stop()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @add_role_granted('Admin', 'Editor', 'Member')
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


@add_role_granted('Admin', 'Editor')
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


@add_role_granted('Admin')
class ChallengeInstanceKillView(APIView):
    """Admin-only force-kill for a specific instance."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def post(self, request, pk=None):
        instance = get_object_or_404(ChallengeInstance, pk=pk)
        if instance.status == ChallengeInstance.InstanceStatus.TERMINATED:
            return Response({'detail': 'Instance already terminated.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.terminate()
        return Response(status=status.HTTP_204_NO_CONTENT)


@add_role_granted('Admin', 'Editor', 'Member')
class ChallengeProgressView(APIView):
    """Aggregate challenge progress for the requesting user."""

    permission_classes = [IsAuthenticated, HasJWTPermission]

    def get(self, request):
        solved_count = UserChallengeProgress.objects.filter(
            user=request.user, completed_at__isnull=False
        ).count()
        total_attempts = UserChallengeSubmit.objects.filter(user=request.user).count()
        return Response({'solved_count': solved_count, 'total_attempts': total_attempts})


@add_role_granted('Admin', 'Editor', 'Member')
class LearnChallengeCategoryViewSet(viewsets.ModelViewSet):
    """Canonical namespaced category CRUD API under /api/challenge/categories/."""

    queryset = ChallengeCategory.objects.all().order_by('name')
    serializer_class = ChallengeCategorySerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

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


@add_role_granted('Admin', 'Editor', 'Member')
class LearnChallengeTagViewSet(viewsets.ModelViewSet):
    """Canonical namespaced tag CRUD API under /api/challenge/tags/."""

    queryset = ChallengeTag.objects.all().order_by('name')
    serializer_class = ChallengeTagSerializer
    permission_classes = [IsAuthenticated, HasJWTPermission]

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
