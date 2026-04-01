from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Challenge, ChallengeInstance, Notification, UserChallengeProgress, UserChallengeSubmit
from api.serializers import (
    ChallengeDetailSerializer,
    ChallengeFlagSubmitSerializer,
    ChallengeInstanceSerializer,
    ChallengeListSerializer,
)


@add_role_granted('Admin', 'Editor', 'Member')
class ChallengeViewSet(viewsets.ModelViewSet):
    """Challenge management viewset."""

    def get_queryset(self):
        queryset = Challenge.objects.all()

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status=Challenge.Status.PUBLISHED)

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChallengeDetailSerializer
        return ChallengeListSerializer

    @action(detail=True, methods=['post'])
    def submit_flag(self, request, pk=None):
        challenge = self.get_object()
        serializer = ChallengeFlagSubmitSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        submitted_flag = serializer.validated_data['flag']

        instance_flag_hash = None
        if challenge.instance_required:
            try:
                instance = ChallengeInstance.objects.get(
                    user=request.user,
                    challenge=challenge,
                    status=ChallengeInstance.InstanceStatus.RUNNING,
                )
                instance_flag_hash = instance.flag_value
            except ChallengeInstance.DoesNotExist:
                return Response(
                    {'error': 'No running instance found for this challenge'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        challenge_flag = challenge.flags.first()
        if not challenge_flag:
            return Response(
                {'error': 'No flag configured for this challenge'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_correct = challenge_flag.validate_submission(submitted_flag, instance_flag_hash)

        UserChallengeSubmit.objects.create(
            user=request.user,
            challenge=challenge,
            submitted_flag=submitted_flag,
            is_correct=is_correct,
        )

        if is_correct:
            progress, _ = UserChallengeProgress.objects.get_or_create(user=request.user, challenge=challenge)
            if not progress.completed_at:
                progress.completed_at = timezone.now()
                progress.save()

                profile = request.user.profile
                profile.total_challenge_point += challenge.challenge_point
                profile.save()
                profile.update_leaderboard_rank()

                Notification.objects.create(
                    user=request.user,
                    type=Notification.NotificationType.CHALLENGE,
                    title='Challenge Solved!',
                    message=f'You solved: {challenge.title}',
                    metadata={'challenge_id': challenge.id},
                )

        return Response(
            {
                'correct': is_correct,
                'message': 'Correct! Challenge solved!' if is_correct else 'Incorrect flag',
            }
        )

    @action(detail=True, methods=['post'])
    def create_instance(self, request, pk=None):
        challenge = self.get_object()

        if not challenge.instance_required:
            return Response(
                {'error': 'This challenge does not require an instance'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = ChallengeInstance.objects.filter(
            user=request.user,
            challenge=challenge,
            status=ChallengeInstance.InstanceStatus.RUNNING,
        ).first()

        if existing:
            serializer = ChallengeInstanceSerializer(existing)
            return Response(serializer.data)

        instance = ChallengeInstance.objects.create(user=request.user, challenge=challenge)

        try:
            instance.start()
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = ChallengeInstanceSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
