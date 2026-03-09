"""
API URL Configuration
Maps URL patterns to views
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    UserViewSet,
    CourseViewSet, LessonViewSet,
    ChallengeViewSet,
    QuizViewSet,
    NotificationViewSet,
    LeaderboardViewSet,
    SystemConfigViewSet
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
router.register(r'system-config', SystemConfigViewSet, basename='systemconfig')

urlpatterns = [
    # JWT Authentication
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API routes
    path('', include(router.urls)),
]
