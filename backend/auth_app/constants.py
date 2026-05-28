BUILTIN_ROLE_ADMIN = 'Admin'
BUILTIN_ROLE_EDITOR = 'Editor'
BUILTIN_ROLE_MEMBER = 'Member'

BUILTIN_ROLES = (
    BUILTIN_ROLE_ADMIN,
    BUILTIN_ROLE_EDITOR,
    BUILTIN_ROLE_MEMBER,
)

LOGIN_FAIL_CACHE_KEY_TEMPLATE = 'login_fail:{username}'
REFRESH_RATE_CACHE_KEY_TEMPLATE = 'refresh_rate:{user_id}'

DEFAULT_LOGIN_MAX_FAILURES = 5
DEFAULT_LOGIN_FAILURE_TTL_SECONDS = 300
DEFAULT_REFRESH_RATE_LIMIT_PER_MINUTE = 10
DEFAULT_REFRESH_RATE_LIMIT_WINDOW_SECONDS = 60

REFRESH_TTL_CONFIG_KEY = 'auth.token.refresh_ttl'
DEFAULT_REFRESH_TTL_MINUTES = 60 * 24 * 7

PERM_ADMIN_PORTAL_ACCESS = 'system.admin_portal.access'
PERM_MATERIAL_READ_DRAFT = 'system.material.read_draft'
PERM_MATERIAL_READ_ARCHIVE = 'system.material.read_archive'
PERM_MATERIAL_PURGE = 'system.material.purge'

PERM_ADMIN_SECTION_DASHBOARD = 'system.admin_portal.dashboard'
PERM_ADMIN_SECTION_CONFIG = 'system.admin_portal.config'
PERM_ADMIN_SECTION_RBAC = 'system.admin_portal.rbac'
PERM_ADMIN_SECTION_USERS = 'system.admin_portal.users'
PERM_ADMIN_SECTION_STATISTICS = 'system.admin_portal.statistics'
PERM_ADMIN_SECTION_NOTIFICATIONS = 'system.admin_portal.notifications'
PERM_ADMIN_SECTION_LEARN = 'system.admin_portal.learn'
PERM_ADMIN_SECTION_CHALLENGES = 'system.admin_portal.challenges'
PERM_ADMIN_SECTION_QUIZZES = 'system.admin_portal.quizzes'

ADMIN_SECTIONS = {
    'dashboard': PERM_ADMIN_SECTION_DASHBOARD,
    'config': PERM_ADMIN_SECTION_CONFIG,
    'rbac': PERM_ADMIN_SECTION_RBAC,
    'users': PERM_ADMIN_SECTION_USERS,
    'statistics': PERM_ADMIN_SECTION_STATISTICS,
    'notifications': PERM_ADMIN_SECTION_NOTIFICATIONS,
    'learn': PERM_ADMIN_SECTION_LEARN,
    'challenges': PERM_ADMIN_SECTION_CHALLENGES,
    'quizzes': PERM_ADMIN_SECTION_QUIZZES,
}
