"""Public API view exports for router wiring."""

from .admin_users import AdminUserViewSet, UserRoleViewSet
from .admin_stats import AdminStatsViewSet
from .auth import CustomTokenObtainPairView
from .challenges import ChallengeViewSet
from .courses import (
    CourseViewSet,
    LearnCourseCategoryViewSet,
    LearnLessonQuestionViewSet,
    LearnLessonViewSet,
    LearnCourseNodeViewSet,
    LearnCourseTagViewSet,
    LearnCourseViewSet,
    LessonViewSet,
)
from .leaderboard import LeaderboardViewSet
from .notifications import AdminNotificationViewSet, NotificationViewSet
from .permissions import PermissionViewSet
from .quizzes import QuizNodeViewSet, QuizViewSet
from .roles import RoleViewSet
from .system_config import SystemConfigViewSet
from .users import UserViewSet

__all__ = [
    'AdminUserViewSet',
    'AdminStatsViewSet',
    'ChallengeViewSet',
    'CourseViewSet',
    'CustomTokenObtainPairView',
    'LeaderboardViewSet',
    'LearnCourseCategoryViewSet',
    'LearnLessonQuestionViewSet',
    'LearnLessonViewSet',
    'LearnCourseNodeViewSet',
    'LearnCourseTagViewSet',
    'LearnCourseViewSet',
    'LessonViewSet',
    'AdminNotificationViewSet',
    'NotificationViewSet',
    'PermissionViewSet',
    'QuizNodeViewSet',
    'QuizViewSet',
    'RoleViewSet',
    'SystemConfigViewSet',
    'UserRoleViewSet',
    'UserViewSet',
]
