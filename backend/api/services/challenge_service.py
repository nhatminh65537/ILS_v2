from django.utils import timezone

from api.models import (
    Challenge,
    ChallengeInstance,
    ChallengeTagMap,
    UserChallengeProgress,
    UserChallengeSubmit,
    UserProfile,
)
from auth_app.constants import PERM_MATERIAL_READ_ARCHIVE, PERM_MATERIAL_READ_DRAFT


class ChallengeService:
    """Domain operations for challenge flows."""

    @staticmethod
    def _can_read_draft(user) -> bool:
        if not user or not user.is_authenticated:
            return False
        return user.has_permission(PERM_MATERIAL_READ_DRAFT)

    @staticmethod
    def _can_read_archive(user) -> bool:
        if not user or not user.is_authenticated:
            return False
        return user.has_permission(PERM_MATERIAL_READ_ARCHIVE)

    @classmethod
    def _allowed_statuses(cls, user) -> set:
        allowed = {Challenge.Status.PUBLISHED}
        if cls._can_read_draft(user):
            allowed.add(Challenge.Status.DRAFT)
        if cls._can_read_archive(user):
            allowed.add(Challenge.Status.ARCHIVED)
        return allowed

    @classmethod
    def filter_visible_learn_challenges(cls, queryset, user, query_params):
        allowed = cls._allowed_statuses(user)
        status_param = query_params.get('status')
        if status_param:
            if status_param in allowed:
                queryset = queryset.filter(status=status_param)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.filter(status__in=allowed)

        difficulty = query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        category = query_params.get('category') or query_params.get('category_id')
        if category:
            queryset = queryset.filter(category_id=category)

        search = query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.select_related('category').prefetch_related('tag_mappings__tag').order_by('id')

    @classmethod
    def filter_visible_challenges(cls, queryset, user, query_params):
        return cls.filter_visible_learn_challenges(queryset, user, query_params)

    @staticmethod
    def build_slug_suggestions(base_slug, limit=5):
        normalized = (base_slug or '').strip().lower().strip('-')
        if not normalized:
            normalized = 'challenge'

        existing = set(
            Challenge.objects.filter(slug__startswith=normalized).values_list('slug', flat=True)
        )

        suggestions = []
        if normalized not in existing:
            suggestions.append(normalized)

        index = 2
        while len(suggestions) < limit:
            candidate = f'{normalized}-{index}'
            if candidate not in existing:
                suggestions.append(candidate)
            index += 1

        return suggestions

    @staticmethod
    def upsert_challenge_tags(challenge, tag_ids):
        tag_ids = sorted(set(tag_ids or []))

        existing_mappings = {
            mapping.tag_id: mapping
            for mapping in ChallengeTagMap.objects.filter(challenge=challenge)
        }

        keep_ids = set(tag_ids)
        stale_ids = [tag_id for tag_id in existing_mappings if tag_id not in keep_ids]
        if stale_ids:
            ChallengeTagMap.objects.filter(challenge=challenge, tag_id__in=stale_ids).delete()

        missing_ids = [tag_id for tag_id in tag_ids if tag_id not in existing_mappings]
        if missing_ids:
            ChallengeTagMap.objects.bulk_create(
                [ChallengeTagMap(challenge=challenge, tag_id=tag_id) for tag_id in missing_ids]
            )

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

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.total_challenge_point += challenge.challenge_point
        profile.challenge_completed += 1
        profile.save()
        profile.update_leaderboard_rank()

        from api.models import Notification
        event_key = f'challenge_complete_{user.id}_{challenge.id}'
        Notification.objects.get_or_create(
            event_key=event_key,
            defaults={
                'user': user,
                'type': Notification.NotificationType.CHALLENGE,
                'title': 'Challenge Completed',
                'message': f'You completed "{challenge.title}"!',
            },
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
