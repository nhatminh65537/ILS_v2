from api.models import User


class AuthService:
    """Domain operations for auth response enrichment."""

    @staticmethod
    def attach_user_payload(response, username):
        if not username:
            return response

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return response

        response.data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }
        return response