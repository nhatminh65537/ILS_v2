from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from auth_app.permissions import HasJWTPermission, add_role_granted

from api.models import User
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
from api.services.user_service import UserService


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

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='me/profile')
    def me_profile(self, request):
        profile = UserService.get_or_create_profile(request.user)
        if request.method.lower() == 'get':
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)

        serializer = MeProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)

    @action(detail=False, methods=['patch'], url_path='me/settings')
    def me_settings(self, request):
        profile = UserService.get_or_create_profile(request.user)
        serializer = MeSettingsUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)

    @action(detail=False, methods=['patch'], url_path='me/account')
    def me_account(self, request):
        serializer = MeAccountUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        UserService.update_account(request.user, serializer)
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'], url_path='me/activity')
    def me_activity(self, request):
        activities = UserService.build_user_activity(request.user, self.activity_limit)
        return Response(ActivityEventSerializer(activities, many=True).data)

    @action(detail=False, methods=['get'], url_path=r'(?P<username>[^/.]+)/profile')
    def public_profile(self, request, username=None):
        user = get_object_or_404(User.objects.select_related('profile'), username=username)
        profile = UserService.get_or_create_profile(user)
        return Response(PublicUserProfileSerializer(profile).data)

    @action(detail=False, methods=['get'], url_path=r'(?P<username>[^/.]+)/activity')
    def public_activity(self, request, username=None):
        user = get_object_or_404(User, username=username)
        activities = UserService.build_user_activity(user, self.activity_limit)
        return Response(ActivityEventSerializer(activities, many=True).data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        return self.me_profile(request)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        return self.me_profile(request)
