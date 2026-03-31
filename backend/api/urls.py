"""
API URL Configuration
Maps URL patterns to views
"""
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet,
    CourseViewSet, LessonViewSet,
    ChallengeViewSet,
    QuizViewSet,
    NotificationViewSet,
    LeaderboardViewSet,
    SystemConfigViewSet,
    PermissionViewSet, RoleViewSet, UserRoleViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'challenges', ChallengeViewSet, basename='challenge')
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'admin/config', SystemConfigViewSet, basename='admin-config')
router.register(r'admin/permissions', PermissionViewSet, basename='permission')
router.register(r'admin/roles', RoleViewSet, basename='role')

# Custom user roles routes
user_roles_url = re_path(
    r'^users/(?P<user_id>\d+)/roles/$',
    UserRoleViewSet.as_view({'get': 'list', 'post': 'create'}),
    name='user-roles-list'
)
user_role_detail_url = re_path(
    r'^users/(?P<user_id>\d+)/roles/(?P<role_id>\d+)/$',
    UserRoleViewSet.as_view({'delete': 'destroy'}),
    name='user-roles-detail'
)

# Custom role permissions routes
role_permissions_url = re_path(
    r'^admin/roles/(?P<pk>\d+)/permissions/$',
    RoleViewSet.as_view({'get': 'permissions', 'post': 'assign_permission'}),
    name='role-permissions'
)
role_permission_revoke_url = re_path(
    r'^admin/roles/(?P<pk>\d+)/permissions/(?P<perm_id>\d+)/$',
    RoleViewSet.as_view({'delete': 'revoke_permission'}),
    name='role-permissions-revoke'
)

urlpatterns = [
    # API routes
    path('', include(router.urls)),
    # User roles custom routes
    user_roles_url,
    user_role_detail_url,
    # Role permissions custom routes
    role_permissions_url,
    role_permission_revoke_url,
]
