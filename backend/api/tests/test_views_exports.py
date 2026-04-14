def test_views_package_exports_router_viewsets():
    """Protect package-level exports used by api.urls router wiring."""
    from api import views

    assert hasattr(views, 'UserViewSet')
    assert hasattr(views, 'CourseViewSet')
    assert hasattr(views, 'LessonViewSet')
    assert hasattr(views, 'ChallengeViewSet')
    assert hasattr(views, 'QuizViewSet')
    assert hasattr(views, 'NotificationViewSet')
    assert hasattr(views, 'LeaderboardViewSet')
