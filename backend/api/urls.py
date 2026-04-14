"""
API URL Configuration
Maps URL patterns to views
"""
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminUserViewSet,
    UserViewSet,
    CourseViewSet, LessonViewSet,
    ChallengeViewSet,
    QuizNodeViewSet,
    QuizViewSet,
    NotificationViewSet,
    LeaderboardViewSet,
    PermissionViewSet,
    RoleViewSet,
    SystemConfigViewSet,
    UserRoleViewSet,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'challenges', ChallengeViewSet, basename='challenge')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
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

urlpatterns = [
    # API routes
    path('', include(router.urls)),
    # Canonical namespaced quiz routes (Slice 7)
    re_path(
        r'^quiz/quizzes/$',
        QuizViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='quiz-list',
    ),
    re_path(
        r'^quiz/quizzes/(?P<pk>\d+)/$',
        QuizViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='quiz-detail',
    ),
    re_path(
        r'^quiz/quizzes/(?P<pk>\d+)/progress/$',
        QuizViewSet.as_view({'get': 'progress'}),
        name='quiz-progress',
    ),
    re_path(
        r'^quiz/quizzes/(?P<pk>\d+)/questions/$',
        QuizViewSet.as_view({'get': 'questions', 'post': 'questions'}),
        name='quiz-questions',
    ),
    re_path(
        r'^quiz/quizzes/(?P<pk>\d+)/questions/(?P<qid>\d+)/$',
        QuizViewSet.as_view({'get': 'question_detail', 'put': 'question_detail', 'delete': 'question_detail'}),
        name='quiz-question-detail',
    ),
    re_path(
        r'^quiz/quizzes/(?P<pk>\d+)/config/$',
        QuizViewSet.as_view({'get': 'config', 'put': 'config'}),
        name='quiz-config',
    ),
    re_path(
        r'^quiz/nodes/$',
        QuizNodeViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='quiz-node-list',
    ),
    re_path(
        r'^quiz/nodes/(?P<pk>\d+)/$',
        QuizNodeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='quiz-node-detail',
    ),
    re_path(
        r'^quiz/nodes/(?P<pk>\d+)/children/$',
        QuizNodeViewSet.as_view({'get': 'children'}),
        name='quiz-node-children',
    ),
    re_path(
        r'^quiz/nodes/(?P<pk>\d+)/move/$',
        QuizNodeViewSet.as_view({'post': 'move'}),
        name='quiz-node-move',
    ),
    # User roles custom routes
    user_roles_url,
    user_role_detail_url,
]
