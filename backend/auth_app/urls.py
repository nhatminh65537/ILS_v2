from django.urls import path

from auth_app.views import (
    IdentityLinkView,
    LoginView,
    LogoutAllView,
    LogoutView,
    PasswordChangeView,
    RegisterView,
    SessionListView,
    SessionRevokeView,
    SSOCallbackView,
    SSORedirectView,
    TokenRefreshView,
)


urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('logout-all/', LogoutAllView.as_view(), name='auth-logout-all'),
    path('password/change/', PasswordChangeView.as_view(), name='auth-password-change'),
    path('sessions/', SessionListView.as_view(), name='auth-sessions'),
    path('sessions/<int:session_id>/', SessionRevokeView.as_view(), name='auth-session-revoke'),
    path('sso/redirect/', SSORedirectView.as_view(), name='auth-sso-redirect'),
    path('sso/callback/', SSOCallbackView.as_view(), name='auth-sso-callback'),
    path('identity/link/', IdentityLinkView.as_view(), name='auth-identity-link'),
]
