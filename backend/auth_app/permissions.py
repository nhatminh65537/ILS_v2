ROLE_GRANTED_ATTR = '__role_granted__'


def add_role_granted(*roles: str):
    """Attach built-in role grants metadata to a class-based view."""
    normalized_roles = tuple(role for role in roles if isinstance(role, str) and role.strip())

    def decorator(view_class):
        setattr(view_class, ROLE_GRANTED_ATTR, normalized_roles)
        return view_class

    return decorator
