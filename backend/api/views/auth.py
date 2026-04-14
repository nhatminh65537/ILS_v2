from rest_framework_simplejwt.views import TokenObtainPairView

from api.services.auth_service import AuthService


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view that includes user info in token response."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return AuthService.attach_user_payload(response, request.data.get('username'))
