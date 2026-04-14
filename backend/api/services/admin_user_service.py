from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from api.models import Role, UserRole
from api.services.permission_service import PermissionService


class AdminUserService:
    """Domain operations for admin user and role management."""

    @staticmethod
    def get_user(user_id):
        user_model = get_user_model()
        return user_model.objects.get(id=user_id)

    @staticmethod
    def parse_joined_filter(value, *, end_of_day=False):
        if not value:
            return None

        parsed_datetime = parse_datetime(value)
        if parsed_datetime is not None:
            candidate = parsed_datetime
        else:
            parsed_date = parse_date(value)
            if parsed_date is None:
                raise ValidationError({'date_joined': 'Use YYYY-MM-DD or an ISO datetime string.'})
            candidate = datetime.combine(parsed_date, time.max if end_of_day else time.min)

        if timezone.is_naive(candidate):
            candidate = timezone.make_aware(candidate, timezone.get_current_timezone())

        return candidate

    @classmethod
    def apply_filters(cls, queryset, query_params):
        is_active = query_params.get('is_active')
        if is_active is not None and is_active != '':
            normalized = is_active.strip().lower()
            if normalized not in {'true', 'false', '1', '0'}:
                raise ValidationError({'is_active': 'Use true or false.'})
            queryset = queryset.filter(is_active=normalized in {'true', '1'})

        date_joined_from = cls.parse_joined_filter(query_params.get('date_joined_from'))
        date_joined_to = cls.parse_joined_filter(query_params.get('date_joined_to'), end_of_day=True)

        if date_joined_from is not None:
            queryset = queryset.filter(date_joined__gte=date_joined_from)
        if date_joined_to is not None:
            queryset = queryset.filter(date_joined__lte=date_joined_to)

        return queryset

    @staticmethod
    def assign_role(user, role_id):
        role = Role.objects.get(id=role_id)
        user_role, created = UserRole.objects.get_or_create(user=user, role=role)
        if created:
            PermissionService.invalidate_cache(user)
        return user_role, created

    @staticmethod
    def remove_role(user, role_id):
        user_role = UserRole.objects.get(user=user, role_id=role_id)
        user_role.delete()
        PermissionService.invalidate_cache(user)
