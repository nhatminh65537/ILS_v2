from rest_framework_simplejwt.views import TokenObtainPairView

from api.models import User


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view that includes user info in token response."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        user = User.objects.get(username=request.data.get('username'))
        response.data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }
        return response
