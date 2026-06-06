"""Public API view exports for router wiring."""

from .admin_users import AdminUserViewSet, UserRoleViewSet
from .admin_stats import AdminStatsViewSet
from .auth import CustomTokenObtainPairView
from .challenges import (
    LearnChallengeViewSet,
    LearnChallengeCategoryViewSet,
    LearnChallengeTagViewSet,
    ChallengeGitlabViewSet,
    ChallengeInstanceAdminView,
    ChallengeInstanceKillView,
    ChallengeProgressView,
)
from .challenge_nodes import ChallengeNodeViewSet
from .courses import (
    CourseViewSet,
    LearnCourseCategoryViewSet,
    LearnLessonQuestionViewSet,
    LearnLessonViewSet,
    LearnCourseNodeViewSet,
    LearnCourseTagViewSet,
    LearnCourseViewSet,
    LearnOutlineViewSet,
    LessonViewSet,
)
from .leaderboard import LeaderboardViewSet
from .notifications import AdminNotificationViewSet, NotificationViewSet
from .permissions import PermissionViewSet
from .quizzes import QuizCategoryViewSet, QuizNodeViewSet, QuizTagViewSet, QuizViewSet
from .roles import RoleViewSet
from .system_config import SystemConfigViewSet
from .users import UserViewSet

__all__ = [
    'AdminUserViewSet',
    'AdminStatsViewSet',
    'LearnChallengeViewSet',
    'LearnChallengeCategoryViewSet',
    'LearnChallengeTagViewSet',
    'ChallengeGitlabViewSet',
    'ChallengeInstanceAdminView',
    'ChallengeInstanceKillView',
    'ChallengeProgressView',
    'ChallengeNodeViewSet',
    'CourseViewSet',
    'CustomTokenObtainPairView',
    'LeaderboardViewSet',
    'LearnCourseCategoryViewSet',
    'LearnLessonQuestionViewSet',
    'LearnLessonViewSet',
    'LearnCourseNodeViewSet',
    'LearnCourseTagViewSet',
    'LearnCourseViewSet',
    'LearnOutlineViewSet',
    'LessonViewSet',
    'AdminNotificationViewSet',
    'NotificationViewSet',
    'PermissionViewSet',
    'QuizCategoryViewSet',
    'QuizNodeViewSet',
    'QuizTagViewSet',
    'QuizViewSet',
    'RoleViewSet',
    'SystemConfigViewSet',
    'UserRoleViewSet',
    'UserViewSet',
]
