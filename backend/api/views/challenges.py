from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_app.permissions import add_role_granted

from api.models import Challenge
from api.serializers import (
    ChallengeDetailSerializer,
    ChallengeFlagSubmitSerializer,
    ChallengeInstanceSerializer,
    ChallengeListSerializer,
)
from api.services.challenge_service import ChallengeService


@add_role_granted('Admin', 'Editor', 'Member')
class ChallengeViewSet(viewsets.ModelViewSet):
    """Challenge management viewset."""

    def get_queryset(self):
        queryset = Challenge.objects.all()
        return ChallengeService.filter_visible_challenges(queryset, self.request.user, self.request.query_params)

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

        try:
            instance_flag_hash = ChallengeService.resolve_instance_flag_hash(challenge, request.user)
        except LookupError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        challenge_flag = ChallengeService.get_primary_flag(challenge)
        if not challenge_flag:
            return Response(
                {'error': 'No flag configured for this challenge'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_correct = challenge_flag.validate_submission(submitted_flag, instance_flag_hash)

        ChallengeService.record_submission(request.user, challenge, submitted_flag, is_correct)

        if is_correct:
            ChallengeService.handle_correct_submission(request.user, challenge)

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

        existing = ChallengeService.get_running_instance(challenge, request.user)

        if existing:
            serializer = ChallengeInstanceSerializer(existing)
            return Response(serializer.data)

        instance = ChallengeService.create_instance(challenge, request.user)

        try:
            ChallengeService.start_instance(instance)
        except RuntimeError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = ChallengeInstanceSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
