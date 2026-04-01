"""Public API view exports for router wiring."""

from .auth import CustomTokenObtainPairView
from .challenges import ChallengeViewSet
from .courses import CourseViewSet, LessonViewSet
from .leaderboard import LeaderboardViewSet
from .notifications import NotificationViewSet
from .quizzes import QuizViewSet
from .users import UserViewSet

__all__ = [
    'ChallengeViewSet',
    'CourseViewSet',
    'CustomTokenObtainPairView',
    'LeaderboardViewSet',
    'LessonViewSet',
    'NotificationViewSet',
    'QuizViewSet',
    'UserViewSet',
]
