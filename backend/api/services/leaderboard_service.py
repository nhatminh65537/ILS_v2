"""Leaderboard service.

Handles ranking calculations and leaderboard payload assembly.
"""

from django.db.models import F, IntegerField, Value
from django.db.models.expressions import ExpressionWrapper
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from api.models import UserProfile


class LeaderboardService:
    """Service for computing and managing leaderboard payloads."""

    DEFAULT_PAGE_SIZE = 10

    CANONICAL_TYPE_MAP = {
        'overall': 'overall',
        'challenge': 'challenge',
        'quiz': 'quiz',
        'course': 'course',
    }

    LEGACY_TYPE_MAP = {
        'learning': 'course',
        'lpoint': 'course',
        'cpoint': 'challenge',
        'qpoint': 'quiz',
        'total': 'overall',
        'sort_by_total': 'overall',
        'sort_by_learning': 'course',
        'sort_by_challenge': 'challenge',
        'sort_by_quiz': 'quiz',
    }

    FIELD_MAP = {
        'overall': ('total_learning_point', 'total_challenge_point', 'total_quiz_point'),
        'course': ('total_learning_point',),
        'challenge': ('total_challenge_point',),
        'quiz': ('total_quiz_point',),
    }

    COMPLETED_FIELD_MAP = {
        'overall': ('course_completed', 'challenge_completed', 'quiz_completed'),
        'course': ('course_completed',),
        'challenge': ('challenge_completed',),
        'quiz': ('quiz_completed',),
    }

    @classmethod
    def normalize_board_type(cls, board_type):
        value = str(board_type or 'overall').strip().lower()
        if value in cls.CANONICAL_TYPE_MAP:
            return cls.CANONICAL_TYPE_MAP[value]
        if value in cls.LEGACY_TYPE_MAP:
            return cls.LEGACY_TYPE_MAP[value]
        raise ValidationError({'type': 'Invalid leaderboard type.'})

    @staticmethod
    def _safe_int(raw_value, field_name, minimum=0):
        if raw_value is None or raw_value == '':
            return None

        try:
            value = int(str(raw_value).strip())
        except (TypeError, ValueError) as exc:
            raise ValidationError({field_name: 'Must be an integer.'}) from exc

        if value < minimum:
            raise ValidationError({field_name: f'Must be greater than or equal to {minimum}.'})

        return value

    @classmethod
    def _score_expression(cls, board_type):
        if board_type == 'overall':
            return ExpressionWrapper(
                Coalesce(F('total_learning_point'), Value(0))
                + Coalesce(F('total_challenge_point'), Value(0))
                + Coalesce(F('total_quiz_point'), Value(0)),
                output_field=IntegerField(),
            )

        field_name = cls.FIELD_MAP[board_type][0]
        return Coalesce(F(field_name), Value(0))

    @classmethod
    def _base_queryset(cls, board_type):
        score_expression = cls._score_expression(board_type)
        return (
            UserProfile.objects.select_related('user')
            .filter(user__is_active=True)
            .annotate(score=score_expression)
            .order_by('-score', 'user_id')
        )

    @classmethod
    def _rank_rows(cls, profiles):
        ranked_rows = []
        last_score = None
        current_rank = 0

        for index, profile in enumerate(profiles, start=1):
            score = int(profile.score or 0)
            if score != last_score:
                current_rank += 1
                last_score = score

            ranked_rows.append(
                {
                    'profile': profile,
                    'rank': current_rank,
                    'score': score,
                }
            )

        return ranked_rows

    @staticmethod
    def _resolve_display_name(profile):
        return profile.display_name or profile.user.username

    @staticmethod
    def _resolve_avatar_url(profile):
        return profile.avatar_url

    @classmethod
    def _resolve_completed(cls, profile, board_type):
        fields = cls.COMPLETED_FIELD_MAP.get(board_type, ())
        return sum(int(getattr(profile, field, 0) or 0) for field in fields)

    @classmethod
    def _serialize_entry(cls, row, board_type, next_score=None):
        profile = row['profile']
        avatar_url = cls._resolve_avatar_url(profile)
        score = row['score']
        delta = 0 if next_score is None else max(score - next_score, 0)

        return {
            'rank': row['rank'],
            'user': {
                'id': profile.user_id,
                'username': profile.user.username,
                'display_name': cls._resolve_display_name(profile),
                'avatar_url': avatar_url,
                'avatar': avatar_url,
            },
            'score': score,
            'delta': delta,
            'completed': cls._resolve_completed(profile, board_type),
        }

    @staticmethod
    def _resolve_page_window(total_count, page, page_size, offset=None):
        if offset is not None:
            start = min(offset, total_count)
            end = min(start + page_size, total_count)
            page_number = (start // page_size) + 1 if page_size else 1
            return page_number, start, end

        start = max(page - 1, 0) * page_size
        end = min(start + page_size, total_count)
        return page, start, end

    @classmethod
    def _resolve_rank_for_user(cls, ranked_rows, user_id):
        if user_id is None:
            return None

        for row in ranked_rows:
            if row['profile'].user_id == user_id:
                return row['rank']
        return None

    @classmethod
    def build_leaderboard(cls, board_type, user=None, page=1, limit=None, offset=None):
        canonical_type = cls.normalize_board_type(board_type)
        page_number = cls._safe_int(page, 'page', minimum=1) or 1
        page_size = cls._safe_int(limit, 'limit', minimum=1) or cls.DEFAULT_PAGE_SIZE
        offset_value = cls._safe_int(offset, 'offset', minimum=0)

        profiles = list(cls._base_queryset(canonical_type))
        ranked_rows = cls._rank_rows(profiles)
        total_users = len(ranked_rows)
        resolved_page, start, end = cls._resolve_page_window(total_users, page_number, page_size, offset_value)
        current_page_rows = ranked_rows[start:end]

        results = []
        for index, row in enumerate(current_page_rows):
            next_score = current_page_rows[index + 1]['score'] if index + 1 < len(current_page_rows) else None
            results.append(cls._serialize_entry(row, canonical_type, next_score=next_score))

        user_id = getattr(user, 'id', None)
        my_rank = cls._resolve_rank_for_user(ranked_rows, user_id)

        return {
            'type': canonical_type,
            'my_rank': my_rank,
            'total_users': total_users,
            'total_count': total_users,
            'page': resolved_page,
            'page_size': page_size,
            'results': results,
            'entries': results,
        }

    @classmethod
    def update_user_rank(cls, user):
        """Update user's rank on all tracked leaderboards."""
        return {
            'learning_rank': cls.get_user_rank_by_lpoint(user),
            'challenge_rank': cls.get_user_rank_by_cpoint(user),
            'quiz_rank': cls.get_user_rank_by_qpoint(user),
        }

    @classmethod
    def _get_user_rank(cls, board_type, user):
        profile = getattr(user, 'profile', None)
        if profile is None:
            return None

        ranked_rows = cls._rank_rows(list(cls._base_queryset(board_type)))
        return cls._resolve_rank_for_user(ranked_rows, profile.user_id)

    @classmethod
    def get_user_rank_by_lpoint(cls, user):
        return cls._get_user_rank('course', user)

    @classmethod
    def get_user_rank_by_cpoint(cls, user):
        return cls._get_user_rank('challenge', user)

    @classmethod
    def get_user_rank_by_qpoint(cls, user):
        return cls._get_user_rank('quiz', user)

    @classmethod
    def update_all_ranks(cls):
        from api.models import User

        for user in User.objects.all():
            cls.update_user_rank(user)
