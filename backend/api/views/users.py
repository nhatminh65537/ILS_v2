from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import User, UserChallengeProgress, UserLessonProgress, UserProfile, UserQuizProgress
from api.serializers import (
    ActivityEventSerializer,
    MeAccountUpdateSerializer,
    MeProfileUpdateSerializer,
    MeSettingsUpdateSerializer,
    PublicUserProfileSerializer,
    UserCreateSerializer,
    UserProfileSerializer,
    UserSerializer,
)


@add_role_granted('Admin', 'Editor', 'Member')
class UserViewSet(viewsets.ModelViewSet):
    """User management viewset."""

    queryset = User.objects.all()
    activity_limit = 30

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in {'create', 'public_profile', 'public_activity'}:
            return [AllowAny()]
        return [IsAuthenticated(), HasJWTPermission()]

    @staticmethod
    def _get_or_create_profile(user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    def _build_user_activity(self, user):
        events = []

        lesson_events = UserLessonProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('lesson').order_by('-completed_at')[: self.activity_limit]
        for progress in lesson_events:
            events.append({
                'type': 'lesson_complete',
                'timestamp': progress.completed_at,
                'item_title': progress.lesson.title,
                'source_id': progress.lesson_id,
            })

        challenge_events = UserChallengeProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('challenge').order_by('-completed_at')[: self.activity_limit]
        for progress in challenge_events:
            events.append({
                'type': 'challenge_solve',
                'timestamp': progress.completed_at,
                'item_title': progress.challenge.title,
                'source_id': progress.challenge_id,
            })

        quiz_events = UserQuizProgress.objects.filter(
            user=user,
            completed_at__isnull=False,
        ).select_related('quiz').order_by('-completed_at')[: self.activity_limit]
        for progress in quiz_events:
            events.append({
                'type': 'quiz_complete',
                'timestamp': progress.completed_at,
                'item_title': progress.quiz.title,
                'source_id': progress.quiz_id,
            })

        events.sort(key=lambda item: item['timestamp'], reverse=True)
        return events[: self.activity_limit]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='me/profile')
    def me_profile(self, request):
        profile = self._get_or_create_profile(request.user)
        if request.method.lower() == 'get':
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)

        serializer = MeProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)

    @action(detail=False, methods=['patch'], url_path='me/settings')
    def me_settings(self, request):
        profile = self._get_or_create_profile(request.user)
        serializer = MeSettingsUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)

    @action(detail=False, methods=['patch'], url_path='me/account')
    def me_account(self, request):
        serializer = MeAccountUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'], url_path='me/activity')
    def me_activity(self, request):
        activities = self._build_user_activity(request.user)
        return Response(ActivityEventSerializer(activities, many=True).data)

    @action(detail=False, methods=['get'], url_path=r'(?P<username>[^/.]+)/profile')
    def public_profile(self, request, username=None):
        user = get_object_or_404(User.objects.select_related('profile'), username=username)
        profile = self._get_or_create_profile(user)
        return Response(PublicUserProfileSerializer(profile).data)

    @action(detail=False, methods=['get'], url_path=r'(?P<username>[^/.]+)/activity')
    def public_activity(self, request, username=None):
        user = get_object_or_404(User, username=username)
        activities = self._build_user_activity(user)
        return Response(ActivityEventSerializer(activities, many=True).data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        return self.me_profile(request)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        return self.me_profile(request)
