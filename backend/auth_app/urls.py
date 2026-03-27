from django.urls import path

from auth_app.views import LoginView, LogoutAllView, LogoutView, RegisterView, TokenRefreshView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('logout-all/', LogoutAllView.as_view(), name='auth-logout-all'),
]
