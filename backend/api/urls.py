"""
API URL Configuration
Maps URL patterns to views
"""
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminStatsViewSet,
    AdminNotificationViewSet,
    AdminUserViewSet,
    UserViewSet,
    CourseViewSet, LessonViewSet,
    LearnCourseCategoryViewSet,
    LearnLessonQuestionViewSet,
    LearnLessonViewSet,
    LearnCourseNodeViewSet,
    LearnCourseTagViewSet,
    LearnCourseViewSet,
    LearnChallengeViewSet,
    LearnChallengeCategoryViewSet,
    LearnChallengeTagViewSet,
    ChallengeNodeViewSet,
    ChallengeInstanceAdminView,
    ChallengeInstanceKillView,
    ChallengeProgressView,
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
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'stats/leaderboard', LeaderboardViewSet, basename='stats-leaderboard')
router.register(r'admin/stats', AdminStatsViewSet, basename='admin-stats')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
router.register(r'admin/notifications', AdminNotificationViewSet, basename='admin-notification')
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
admin_stats_user_detail_url = re_path(
    r'^admin/stats/users/(?P<user_id>\d+)/$',
    AdminStatsViewSet.as_view({'get': 'user_detail'}),
    name='admin-stats-user-detail',
)

urlpatterns = [
    # API routes
    path('', include(router.urls)),
    # Canonical namespaced learn routes (Slice 5)
    re_path(
        r'^learn/courses/$',
        LearnCourseViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='learn-course-list',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/$',
        LearnCourseViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}),
        name='learn-course-detail',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/progress/$',
        LearnCourseViewSet.as_view({'get': 'progress'}),
        name='learn-course-progress',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/nodes/$',
        LearnCourseNodeViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='learn-course-node-list',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/nodes/reorder/$',
        LearnCourseNodeViewSet.as_view({'post': 'reorder'}),
        name='learn-course-node-reorder',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/nodes/(?P<pk>\d+)/$',
        LearnCourseNodeViewSet.as_view({'put': 'update', 'delete': 'destroy'}),
        name='learn-course-node-detail',
    ),
    re_path(
        r'^learn/courses/(?P<slug>[a-z0-9-]+)/nodes/(?P<pk>\d+)/children/$',
        LearnCourseNodeViewSet.as_view({'get': 'children'}),
        name='learn-course-node-children',
    ),
    re_path(
        r'^learn/categories/$',
        LearnCourseCategoryViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='learn-category-list',
    ),
    re_path(
        r'^learn/categories/(?P<pk>\d+)/$',
        LearnCourseCategoryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}),
        name='learn-category-detail',
    ),
    re_path(
        r'^learn/tags/$',
        LearnCourseTagViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='learn-tag-list',
    ),
    re_path(
        r'^learn/tags/(?P<pk>\d+)/$',
        LearnCourseTagViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}),
        name='learn-tag-detail',
    ),

    # Canonical namespaced learn lesson routes (Slice 5 / Task 5.3)
    re_path(
        r'^learn/lessons/(?P<pk>\d+)/$',
        LearnLessonViewSet.as_view({'get': 'retrieve', 'put': 'update'}),
        name='learn-lesson-detail',
    ),
    re_path(
        r'^learn/lessons/(?P<pk>\d+)/progress/start/$',
        LearnLessonViewSet.as_view({'post': 'start_progress'}),
        name='learn-lesson-progress-start',
    ),
    re_path(
        r'^learn/lessons/(?P<pk>\d+)/progress/complete/$',
        LearnLessonViewSet.as_view({'post': 'complete_progress'}),
        name='learn-lesson-progress-complete',
    ),
    re_path(
        r'^learn/lessons/(?P<pk>\d+)/questions/$',
        LearnLessonViewSet.as_view({'get': 'questions', 'post': 'add_question'}),
        name='learn-lesson-questions',
    ),
    re_path(
        r'^learn/lesson-questions/(?P<pk>\d+)/$',
        LearnLessonQuestionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}),
        name='learn-lesson-question-detail',
    ),
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
    # Canonical namespaced challenge routes (Slice 6 / Task 6.1)
    re_path(
        r'^challenge/challenges/$',
        LearnChallengeViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='challenge-list',
    ),
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/$',
        LearnChallengeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='challenge-detail',
    ),
    re_path(
        r'^challenge/categories/$',
        LearnChallengeCategoryViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='challenge-category-list',
    ),
    re_path(
        r'^challenge/categories/(?P<pk>\d+)/$',
        LearnChallengeCategoryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='challenge-category-detail',
    ),
    re_path(
        r'^challenge/tags/$',
        LearnChallengeTagViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='challenge-tag-list',
    ),
    re_path(
        r'^challenge/tags/(?P<pk>\d+)/$',
        LearnChallengeTagViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='challenge-tag-detail',
    ),
    # Challenge flag routes (Slice 6 / Task 6.3)
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/flags/$',
        LearnChallengeViewSet.as_view({'get': 'flags', 'post': 'flags'}),
        name='challenge-flag-list',
    ),
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/flags/(?P<flag_id>\d+)/$',
        LearnChallengeViewSet.as_view({'put': 'flag_detail', 'patch': 'flag_detail', 'delete': 'flag_detail'}),
        name='challenge-flag-detail',
    ),
    re_path(
        r'^challenge/nodes/$',
        ChallengeNodeViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='challenge-node-list',
    ),
    re_path(
        r'^challenge/nodes/(?P<pk>\d+)/$',
        ChallengeNodeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='challenge-node-detail',
    ),
    re_path(
        r'^challenge/nodes/(?P<pk>\d+)/children/$',
        ChallengeNodeViewSet.as_view({'get': 'children'}),
        name='challenge-node-children',
    ),
    re_path(
        r'^challenge/nodes/(?P<pk>\d+)/move/$',
        ChallengeNodeViewSet.as_view({'post': 'move'}),
        name='challenge-node-move',
    ),
    # Challenge flag submission + per-challenge progress (Slice 6 / Task 6.4 + 6.6)
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/submit/$',
        LearnChallengeViewSet.as_view({'post': 'submit'}),
        name='challenge-submit',
    ),
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/progress/$',
        LearnChallengeViewSet.as_view({'get': 'challenge_progress'}),
        name='challenge-challenge-progress',
    ),
    re_path(
        r'^challenge/progress/$',
        ChallengeProgressView.as_view(),
        name='challenge-progress',
    ),
    # Challenge instance endpoints (Slice 6 / Task 6.5)
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/instance/start/$',
        LearnChallengeViewSet.as_view({'post': 'instance_start'}),
        name='challenge-instance-start',
    ),
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/instance/stop/$',
        LearnChallengeViewSet.as_view({'post': 'instance_stop'}),
        name='challenge-instance-stop',
    ),
    re_path(
        r'^challenge/challenges/(?P<slug>[a-z0-9-]+)/instance/status/$',
        LearnChallengeViewSet.as_view({'get': 'instance_status'}),
        name='challenge-instance-status',
    ),
    re_path(
        r'^challenge/instances/$',
        ChallengeInstanceAdminView.as_view(),
        name='challenge-instance-admin-list',
    ),
    re_path(
        r'^challenge/instances/(?P<pk>\d+)/kill/$',
        ChallengeInstanceKillView.as_view(),
        name='challenge-instance-kill',
    ),
    # User roles custom routes
    user_roles_url,
    user_role_detail_url,
    admin_stats_user_detail_url,
]
