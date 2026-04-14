from django.utils import timezone

from api.models import Challenge, ChallengeInstance, Notification, UserChallengeProgress, UserChallengeSubmit


class ChallengeService:
    """Domain operations for challenge flows."""

    @staticmethod
    def filter_visible_challenges(queryset, user, query_params):
        status_param = query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not user.is_staff:
            queryset = queryset.filter(status=Challenge.Status.PUBLISHED)

        difficulty = query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        category = query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category')

    @staticmethod
    def resolve_instance_flag_hash(challenge, user):
        if not challenge.instance_required:
            return None

        try:
            instance = ChallengeInstance.objects.get(
                user=user,
                challenge=challenge,
                status=ChallengeInstance.InstanceStatus.RUNNING,
            )
            return instance.flag_value
        except ChallengeInstance.DoesNotExist as exc:
            raise LookupError('No running instance found for this challenge') from exc

    @staticmethod
    def get_primary_flag(challenge):
        return challenge.flags.first()

    @staticmethod
    def record_submission(user, challenge, submitted_flag, is_correct):
        UserChallengeSubmit.objects.create(
            user=user,
            challenge=challenge,
            submitted_flag=submitted_flag,
            is_correct=is_correct,
        )

    @staticmethod
    def handle_correct_submission(user, challenge):
        progress, _ = UserChallengeProgress.objects.get_or_create(user=user, challenge=challenge)
        if progress.completed_at:
            return

        progress.completed_at = timezone.now()
        progress.save()

        profile = user.profile
        profile.total_challenge_point += challenge.challenge_point
        profile.save()
        profile.update_leaderboard_rank()

        Notification.objects.create(
            user=user,
            type=Notification.NotificationType.CHALLENGE,
            title='Challenge Solved!',
            message=f'You solved: {challenge.title}',
            metadata={'challenge_id': challenge.id},
        )

    @staticmethod
    def get_running_instance(challenge, user):
        return ChallengeInstance.objects.filter(
            user=user,
            challenge=challenge,
            status=ChallengeInstance.InstanceStatus.RUNNING,
        ).first()

    @staticmethod
    def create_instance(challenge, user):
        return ChallengeInstance.objects.create(user=user, challenge=challenge)

    @staticmethod
    def start_instance(instance):
        try:
            instance.start()
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc
