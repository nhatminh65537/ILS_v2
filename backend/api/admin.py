"""
Django Admin Configuration
Register all models for admin interface
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    # User models
    User, UserProfile, UserAuthProvider,
    # Authorization models
    Permission, Role, UserRole, RolePermission, UserPermission, UserPermissionCache,
    # Course models
    Course, CourseCategory, CourseTag, CourseTagMap,
    Lesson, CourseNode, LessonQuestion, LessonOutline,
    UserCourseProgress, UserLessonProgress,
    # Challenge models
    Challenge, ChallengeCategory, ChallengeTag, ChallengeTagMap,
    ChallengeNode, ChallengeGitlab, ChallengeFlag,
    ChallengeInstance, ChallengeInstanceLog,
    UserChallengeProgress, UserChallengeSubmit,
    # Quiz models
    Quiz, QuizNode, QuizCategory, QuizTag, QuizTagMap,
    QuizQuestion, QuizQuestionOption, QuizQuestionAnswer,
    UserQuizAttempt, UserQuizAnswer, QuizConfig,
    # System models
    SystemConfig, Notification, AuditLog
)


# ============================================================================
# USER ADMIN
# ============================================================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""
    list_display = ['username', 'email', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['is_staff', 'is_active', 'date_joined']
    search_fields = ['username', 'email']
    ordering = ['-date_joined']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """UserProfile admin"""
    list_display = ['user', 'total_lpoint', 'total_cpoint', 'total_qpoint']
    search_fields = ['user__username']
    readonly_fields = ['total_lpoint', 'total_cpoint', 'total_qpoint',
                      'rank_lpoint', 'rank_cpoint', 'rank_qpoint']


@admin.register(UserAuthProvider)
class UserAuthProviderAdmin(admin.ModelAdmin):
    """UserAuthProvider admin"""
    list_display = ['user', 'provider', 'external_id', 'is_primary', 'is_active', 'created_at']
    list_filter = ['provider']
    search_fields = ['user__username', 'external_id']


# ============================================================================
# AUTHORIZATION ADMIN
# ============================================================================

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """Permission admin"""
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Role admin"""
    list_display = ['name', 'is_system', 'created_at']
    list_filter = ['is_system']
    search_fields = ['name']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    """UserRole admin"""
    list_display = ['user', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['user__username', 'role__name']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    """RolePermission admin"""
    list_display = ['role', 'permission', 'created_at']
    list_filter = ['role']
    search_fields = ['role__name', 'permission__name']


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    """UserPermission admin"""
    list_display = ['user', 'permission', 'created_at']
    search_fields = ['user__username', 'permission__name']


# ============================================================================
# COURSE ADMIN
# ============================================================================

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Course admin"""
    list_display = ['title', 'slug', 'status', 'category', 'learning_point', 'created_at']
    list_filter = ['status', 'category']
    search_fields = ['title', 'slug']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(CourseCategory)
class CourseCategoryAdmin(admin.ModelAdmin):
    """CourseCategory admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(CourseTag)
class CourseTagAdmin(admin.ModelAdmin):
    """CourseTag admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    """Lesson admin"""
    list_display = ['id', 'lesson_type', 'source', 'learning_point', 'learning_time']
    list_filter = ['lesson_type', 'source']


@admin.register(CourseNode)
class CourseNodeAdmin(admin.ModelAdmin):
    """CourseNode admin"""
    list_display = ['title', 'course', 'parent', 'is_item', 'position']
    list_filter = ['course', 'is_item']
    search_fields = ['title']


# ============================================================================
# CHALLENGE ADMIN
# ============================================================================

@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    """Challenge admin"""
    list_display = ['title', 'status', 'difficulty', 'category', 'challenge_point', 'instance_required']
    list_filter = ['status', 'difficulty', 'category', 'instance_required']
    search_fields = ['title']


@admin.register(ChallengeCategory)
class ChallengeCategoryAdmin(admin.ModelAdmin):
    """ChallengeCategory admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(ChallengeTag)
class ChallengeTagAdmin(admin.ModelAdmin):
    """ChallengeTag admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(ChallengeNode)
class ChallengeNodeAdmin(admin.ModelAdmin):
    """ChallengeNode admin"""
    list_display = ['title', 'challenge', 'parent', 'is_item', 'position']
    list_filter = ['is_item']
    search_fields = ['title']


@admin.register(ChallengeFlag)
class ChallengeFlagAdmin(admin.ModelAdmin):
    """ChallengeFlag admin"""
    list_display = ['challenge', 'is_case_sensitive', 'is_regex', 'random_tail_length']
    list_filter = ['is_case_sensitive', 'is_regex']


@admin.register(ChallengeInstance)
class ChallengeInstanceAdmin(admin.ModelAdmin):
    """ChallengeInstance admin"""
    list_display = ['id', 'challenge', 'user', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['user__username', 'challenge__title']


@admin.register(UserChallengeProgress)
class UserChallengeProgressAdmin(admin.ModelAdmin):
    """UserChallengeProgress admin"""
    list_display = ['user', 'challenge', 'completed_at']
    list_filter = ['completed_at']
    search_fields = ['user__username', 'challenge__title']


@admin.register(UserChallengeSubmit)
class UserChallengeSubmitAdmin(admin.ModelAdmin):
    """UserChallengeSubmit admin"""
    list_display = ['user', 'challenge', 'is_correct', 'submitted_at']
    list_filter = ['is_correct', 'submitted_at']
    search_fields = ['user__username', 'challenge__title']


# ============================================================================
# QUIZ ADMIN
# ============================================================================

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    """Quiz admin"""
    list_display = ['title', 'status', 'quiz_point', 'total_questions', 'time_limit_sec']
    list_filter = ['status']
    search_fields = ['title']


@admin.register(QuizCategory)
class QuizCategoryAdmin(admin.ModelAdmin):
    """QuizCategory admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(QuizTag)
class QuizTagAdmin(admin.ModelAdmin):
    """QuizTag admin"""
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    """QuizQuestion admin"""
    list_display = ['id', 'quiz', 'question_type', 'score', 'position']
    list_filter = ['question_type']
    search_fields = ['quiz__title']


@admin.register(QuizQuestionOption)
class QuizQuestionOptionAdmin(admin.ModelAdmin):
    """QuizQuestionOption admin"""
    list_display = ['id', 'question', 'content', 'is_correct', 'position']
    list_filter = ['is_correct']


@admin.register(UserQuizAttempt)
class UserQuizAttemptAdmin(admin.ModelAdmin):
    """UserQuizAttempt admin"""
    list_display = ['id', 'user', 'quiz', 'started_at', 'finished_at', 'total_score']
    list_filter = ['finished_at']
    search_fields = ['user__username', 'quiz__title']


# ============================================================================
# SYSTEM ADMIN
# ============================================================================

@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    """SystemConfig admin"""
    list_display = ['key', 'value_type', 'category', 'is_editable', 'is_runtime', 'updated_at']
    list_filter = ['value_type', 'category', 'is_editable', 'is_runtime']
    search_fields = ['key']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Notification admin"""
    list_display = ['user', 'type', 'title', 'is_read', 'is_broadcast', 'created_at']
    list_filter = ['type', 'is_read', 'is_broadcast']
    search_fields = ['user__username', 'title']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """AuditLog admin"""
    list_display = ['timestamp', 'actor_username', 'action', 'aggregate_type', 'aggregate_id']
    list_filter = ['actor_type', 'aggregate_type', 'action']
    search_fields = ['actor_username']
    readonly_fields = ['timestamp', 'actor_type', 'actor_id', 'actor_username',
                      'aggregate_type', 'aggregate_id', 'action', 'metadata']

