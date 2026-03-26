from rest_framework_simplejwt.tokens import RefreshToken


class TokenService:
    def issue_tokens(self, user) -> dict:
        permissions = self.get_or_refresh_permission_cache(user)
        refresh = RefreshToken.for_user(user)
        refresh['permissions'] = permissions
        refresh['permission_version'] = user.permission_version

        access = refresh.access_token
        access['permissions'] = permissions
        access['permission_version'] = user.permission_version

        return {
            'access': str(access),
            'refresh': str(refresh),
        }

    def get_or_refresh_permission_cache(self, user) -> list[str]:
        # Slice 1 stub: full permission cache logic is implemented in Slice 2.
        return []
