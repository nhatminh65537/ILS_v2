from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import hashlib
import hmac
import re

# ABSTRACT BASE MODELS 

class CreateAudit(models.Model):
    """
    Abstract model cho audit thông tin tạo (created_at, created_by)
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
        db_column='created_by'
    )

    class Meta:
        abstract = True


class UpdateAudit(models.Model):
    """
    Abstract model cho audit thông tin cập nhật (updated_at, updated_by)
    """
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
        db_column='updated_by'
    )

    class Meta:
        abstract = True


class FullAudit(CreateAudit, UpdateAudit):
    """
    Abstract model kết hợp cả CreateAudit và UpdateAudit
    Dùng cho hầu hết các models cần audit đầy đủ
    """
    class Meta:
        abstract = True


class SoftDeleteAudit(models.Model):
    """
    Abstract model cho soft delete
    """
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_deleted",
        db_column='deleted_by'
    )

    class Meta:
        abstract = True

    @property
    def is_deleted(self):
        return self.deleted_at is not None


class BaseNode(FullAudit):
    """
    Abstract model cho cấu trúc cây (dùng cho challenge_node, course_node, quiz_node)
    Sử dụng Materialized Path pattern để tránh N+1 query
    OOP: Encapsulate tree operations and invariants
    """
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        db_column='parent_id'
    )
    is_item = models.BooleanField(
        default=False,
        help_text="True nếu là item (challenge/lesson/quiz), False nếu là folder"
    )
    title = models.TextField()
    pre_path = models.TextField(
        db_index=True,
        help_text="Materialized path để query nhanh (ví dụ: /1/3/10/)"
    )
    position = models.IntegerField(
        default=0,
        help_text="Thứ tự hiển thị trong cùng parent"
    )

    class Meta:
        abstract = True
        ordering = ['position', 'id']

    def __str__(self):
        return self.title
    
    # Domain methods - OOP: Tree operations with invariant enforcement
    def rebuild_path(self):
        """
        Rebuild materialized path for this node and all descendants
        Per OOP feedback: Encapsulate path calculation logic
        """
        if self.parent:
            self.pre_path = f"{self.parent.pre_path}{self.parent.id}/"
        else:
            self.pre_path = "/"
        self.save(update_fields=['pre_path'])
        
        # Recursively update children
        for child in self.children.all():
            child.rebuild_path()
    
    def move_to(self, new_parent):
        """
        Move this node to a new parent
        Per OOP feedback: Ensure acyclic invariant
        """
        if new_parent:
            # Check for cycle
            if self.would_create_cycle(new_parent):
                raise ValueError("Moving to this parent would create a cycle")
        
        self.parent = new_parent
        self.save()
        self.rebuild_path()
    
    def would_create_cycle(self, potential_parent):
        """Check if setting potential_parent would create a cycle"""
        current = potential_parent
        while current:
            if current.id == self.id:
                return True
            current = current.parent
        return False
    
    def validate_acyclic(self):
        """Validate that the tree structure is acyclic"""
        visited = set()
        current = self
        while current:
            if current.id in visited:
                raise ValueError("Cycle detected in tree structure")
            visited.add(current.id)
            current = current.parent
    
    def get_descendants(self):
        """Get all descendant nodes using materialized path"""
        # This is efficient using the path index
        return self.__class__.objects.filter(
            pre_path__startswith=f"{self.pre_path}{self.id}/"
        )
    
    def get_ancestors(self):
        """Get all ancestor nodes"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors


class BaseCategory(FullAudit):
    """
    Abstract model cho category (challenge_category, course_category, quiz_category)
    """
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class BaseTag(FullAudit):
    """
    Abstract model cho tag (challenge_tag, course_tag, quiz_tag)
    """
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name


# ============================================================================
# CHALLENGE MODELS
# ============================================================================

class ChallengeCategory(BaseCategory):
    """
    Danh mục challenge (Web, Crypto, Reverse, etc.)
    """
    class Meta:
        db_table = 'challenge_category'
        verbose_name = 'Challenge Category'
        verbose_name_plural = 'Challenge Categories'


class Challenge(FullAudit):
    """
    Model chính cho Challenge (bài thử thách)
    """
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        ARCHIVED = 'archived', 'Archived'

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'
        INSANE = 'insane', 'Insane'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        GITLAB = 'gitlab', 'GitLab'

    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        null=True,
        blank=True,
        db_index=True
    )
    category = models.ForeignKey(
        ChallengeCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='challenges',
        db_column='category_id'
    )
    
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL
    )
    storage_path = models.TextField(
        help_text="Đường dẫn lưu trữ file challenge"
    )
    gitlab_path = models.TextField(
        blank=True,
        null=True,
        help_text="Đường dẫn GitLab nếu source là gitlab"
    )
    
    challenge_point = models.IntegerField(default=0)
    instance_required = models.BooleanField(
        default=False,
        help_text="Challenge có cần instance để chạy không"
    )

    class Meta:
        db_table = 'challenge'
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['difficulty']),
        ]

    def __str__(self):
        return self.title


class ChallengeGitlab(FullAudit):
    """
    Thông tin GitLab cho challenge sync từ GitLab
    """
    challenge = models.OneToOneField(
        Challenge,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='gitlab_info',
        db_column='challenge_id'
    )
    project_id = models.BigIntegerField()
    project_url = models.TextField()
    default_branch = models.TextField(default='main')
    last_commit_sha = models.TextField(blank=True, null=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'challenge_gitlab'

    def __str__(self):
        return f"GitLab: {self.challenge.title}"


class ChallengeTag(BaseTag):
    """
    Tag cho challenge (CTF, Security, Network, etc.)
    """
    class Meta:
        db_table = 'challenge_tag'
        verbose_name = 'Challenge Tag'
        verbose_name_plural = 'Challenge Tags'


class ChallengeTagMap(FullAudit):
    """
    Many-to-Many relationship giữa Challenge và Tag
    """
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='tag_mappings',
        db_column='challenge_id'
    )
    tag = models.ForeignKey(
        ChallengeTag,
        on_delete=models.CASCADE,
        related_name='challenge_mappings',
        db_column='tag_id'
    )

    class Meta:
        db_table = 'challenge_tag_map'
        unique_together = [['challenge', 'tag']]
        indexes = [
            models.Index(fields=['challenge']),
            models.Index(fields=['tag']),
        ]

    def __str__(self):
        return f"{self.challenge.title} - {self.tag.name}"


class ChallengeNode(BaseNode):
    """
    Cấu trúc cây cho challenge (folder và challenge items)
    Sử dụng Materialized Path để tránh N+1 query
    """
    challenge = models.OneToOneField(
        Challenge,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='node',
        db_column='challenge_id'
    )

    class Meta:
        db_table = 'challenge_node'
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['challenge']),
            models.Index(fields=['pre_path'], opclasses=['text_pattern_ops']),
        ]

    def __str__(self):
        return self.title


class ChallengeInstance(FullAudit):
    """
    Instance của challenge cho user (container/VM đang chạy)
    """
    class InstanceStatus(models.TextChoices):
        RUNNING = 'running', 'Running'
        STOPPED = 'stopped', 'Stopped'
        TERMINATED = 'terminated', 'Terminated'

    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='instances',
        db_column='challenge_id'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='challenge_instances',
        db_column='user_id'
    )
    
    instance_info = models.JSONField(
        null=True,
        blank=True,
        help_text="Thông tin instance (IP, port, etc.)"
    )
    flag_value = models.TextField(
        blank=True,
        null=True,
        help_text="Hashed flag value cho instance này (nếu random)"
    )
    
    status = models.CharField(
        max_length=20,
        choices=InstanceStatus.choices,
        default=InstanceStatus.RUNNING
    )
    terminated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'challenge_instance'
        indexes = [
            models.Index(fields=['challenge']),
            models.Index(fields=['user']),
            models.Index(fields=['user', 'challenge']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.challenge.title} ({self.status})"
    
    # Domain methods - OOP: Lifecycle management with proper encapsulation
    def start(self):
        """Start the instance (domain logic + infrastructure call)"""
        if self.status == self.InstanceStatus.TERMINATED:
            raise ValueError("Cannot start terminated instance")
        
        from .services.instance_service import InstanceService
        result = InstanceService.start_instance(self)
        
        self.status = self.InstanceStatus.RUNNING
        self.instance_info = result
        self.save()
        
        self.log("Instance started")
        return result
    
    def stop(self):
        """Stop the instance"""
        if self.status == self.InstanceStatus.TERMINATED:
            raise ValueError("Cannot stop terminated instance")
        
        from .services.instance_service import InstanceService
        InstanceService.stop_instance(self)
        
        self.status = self.InstanceStatus.STOPPED
        self.save()
        
        self.log("Instance stopped")
    
    def terminate(self):
        """Terminate the instance (cannot be restarted)"""
        from .services.instance_service import InstanceService
        InstanceService.terminate_instance(self)
        
        self.status = self.InstanceStatus.TERMINATED
        self.terminated_at = timezone.now()
        self.save()
        
        self.log("Instance terminated")
    
    def log(self, message):
        """Add log entry for this instance"""
        ChallengeInstanceLog.objects.create(
            challenge_instance=self,
            log_message=message
        )


class ChallengeInstanceLog(FullAudit):
    """
    Log cho challenge instance
    """
    challenge_instance = models.ForeignKey(
        ChallengeInstance,
        on_delete=models.CASCADE,
        related_name='logs',
        db_column='challenge_instance_id'
    )
    log_time = models.DateTimeField(auto_now_add=True)
    log_message = models.TextField()

    class Meta:
        db_table = 'challenge_instance_log'
        indexes = [
            models.Index(fields=['challenge_instance']),
        ]
        ordering = ['-log_time']

    def __str__(self):
        return f"Log for {self.challenge_instance} at {self.log_time}"


class ChallengeFlag(FullAudit):
    """
    Flag (đáp án) cho challenge
    """
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='flags',
        db_column='challenge_id'
    )
    flag_value = models.TextField(help_text="Hashed flag value for security")
    is_case_sensitive = models.BooleanField(default=True)
    is_regex = models.BooleanField(default=False)
    random_tail_length = models.IntegerField(
        default=0,
        help_text="Độ dài phần random cho instance-specific flags"
    )

    class Meta:
        db_table = 'challenge_flag'
        indexes = [
            models.Index(fields=['challenge']),
        ]

    def __str__(self):
        return f"Flag for {self.challenge.title}"
    
    # Domain methods - OOP: Polymorphic flag validation (Strategy pattern)
    def validate_submission(self, submitted_value, instance_flag=None):
        """
        Validate submitted flag using appropriate strategy
        Per OOP feedback: Encapsulate validation logic, use polymorphism
        """
        from .services.flag_validation_service import FlagValidationService
        return FlagValidationService.validate(
            self, 
            submitted_value, 
            instance_flag
        )
    
    def hash_flag(self, plain_flag):
        """Hash flag value for secure storage"""
        salt = settings.SECRET_KEY.encode()
        return hmac.new(salt, plain_flag.encode(), hashlib.sha256).hexdigest()
    
    def set_flag(self, plain_flag):
        """Set flag with automatic hashing"""
        self.flag_value = self.hash_flag(plain_flag)
        self.save()


class UserChallengeProgress(FullAudit):
    """
    Tiến độ của user cho mỗi challenge
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='challenge_progresses',
        db_column='user_id'
    )
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='user_progresses',
        db_column='challenge_id'
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_challenge_progress'
        unique_together = [['user', 'challenge']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['challenge']),
        ]

    def __str__(self):
        status = "Completed" if self.completed_at else "In Progress"
        return f"{self.user.username} - {self.challenge.title} ({status})"

    @property
    def is_completed(self):
        return self.completed_at is not None


class UserChallengeSubmit(FullAudit):
    """
    Lịch sử submit flag của user
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='challenge_submits',
        db_column='user_id'
    )
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='user_submits',
        db_column='challenge_id'
    )
    submitted_flag = models.TextField()
    is_correct = models.BooleanField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_challenge_submit'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['challenge']),
            models.Index(fields=['user', 'challenge']),
        ]
        ordering = ['-submitted_at']

    def __str__(self):
        status = "Correct" if self.is_correct else "Wrong"
        return f"{self.user.username} - {self.challenge.title} ({status})"


# ============================================================================
# COURSE MODELS
# ============================================================================

class CourseCategory(BaseCategory):
    """
    Danh mục khóa học (Programming, Security, Data Science, etc.)
    """
    class Meta:
        db_table = 'course_category'
        verbose_name = 'Course Category'
        verbose_name_plural = 'Course Categories'


class Course(FullAudit):
    """
    Model chính cho Course (khóa học)
    """
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        ARCHIVED = 'archived', 'Archived'

    slug = models.TextField(unique=True)
    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    
    category = models.ForeignKey(
        CourseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
        db_column='category_id'
    )
    
    estimated_time = models.IntegerField(
        null=True,
        blank=True,
        help_text="Thời gian ước lượng (phút)"
    )
    learning_point = models.IntegerField(default=0)

    class Meta:
        db_table = 'course'
        indexes = [
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return self.title


class CourseTag(BaseTag):
    """
    Tag cho course (Python, Web, DevOps, etc.)
    """
    class Meta:
        db_table = 'course_tag'
        verbose_name = 'Course Tag'
        verbose_name_plural = 'Course Tags'


class CourseTagMap(FullAudit):
    """
    Many-to-Many relationship giữa Course và Tag
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='tag_mappings',
        db_column='course_id'
    )
    tag = models.ForeignKey(
        CourseTag,
        on_delete=models.CASCADE,
        related_name='course_mappings',
        db_column='tag_id'
    )

    class Meta:
        db_table = 'course_tag_map'
        unique_together = [['course', 'tag']]
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['tag']),
        ]

    def __str__(self):
        return f"{self.course.title} - {self.tag.name}"


class Lesson(FullAudit):
    """
    Bài học trong course
    OOP: Polymorphic behavior based on lesson_type (Strategy pattern)
    """
    class LessonType(models.TextChoices):
        MARKDOWN = 'markdown', 'Markdown'
        VIDEO = 'video', 'Video'
        MINIQUIZ = 'miniquiz', 'Mini Quiz'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        OUTLINE = 'outline', 'Outline'

    lesson_type = models.CharField(
        max_length=20,
        choices=LessonType.choices
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL
    )
    
    content_md = models.TextField(
        blank=True,
        null=True,
        help_text="Nội dung markdown"
    )
    video_url = models.TextField(
        blank=True,
        null=True,
        help_text="URL video"
    )
    video_duration = models.IntegerField(
        null=True,
        blank=True,
        help_text="Video duration in seconds"
    )
    
    learning_point = models.IntegerField(default=0)
    learning_time = models.IntegerField(
        null=True,
        blank=True,
        help_text="Thời gian học (phút)"
    )

    class Meta:
        db_table = 'lesson'

    def __str__(self):
        return f"Lesson ({self.lesson_type})"
    
    # Domain methods - OOP: Polymorphic behavior via Strategy pattern
    def render(self):
        """
        Render lesson content based on type
        Per OOP feedback: Polymorphic render behavior
        """
        if self.lesson_type == self.LessonType.MARKDOWN:
            return self._render_markdown()
        elif self.lesson_type == self.LessonType.VIDEO:
            return self._render_video()
        elif self.lesson_type == self.LessonType.MINIQUIZ:
            return self._render_miniquiz()
        raise ValueError(f"Unknown lesson type: {self.lesson_type}")
    
    def _render_markdown(self):
        """Render markdown content"""
        import markdown
        return markdown.markdown(self.content_md or '')
    
    def _render_video(self):
        """Render video content"""
        return {
            'url': self.video_url,
            'duration': self.video_duration,
            'type': 'video'
        }
    
    def _render_miniquiz(self):
        """Render mini quiz content"""
        questions = self.question_mappings.select_related('question').all()
        return {
            'questions': [q.question for q in questions],
            'type': 'miniquiz'
        }
    
    def validate_metadata(self):
        """
        Validate lesson metadata based on type
        Per OOP feedback: Type-specific validation
        """
        if self.lesson_type == self.LessonType.MARKDOWN:
            if not self.content_md:
                raise ValueError("Markdown lesson must have content_md")
        elif self.lesson_type == self.LessonType.VIDEO:
            if not self.video_url:
                raise ValueError("Video lesson must have video_url")
        elif self.lesson_type == self.LessonType.MINIQUIZ:
            if not self.question_mappings.exists():
                raise ValueError("Mini quiz lesson must have questions")
    
    def attach_quiz(self, question):
        """Attach a quiz question to this lesson (for miniquiz type)"""
        if self.lesson_type != self.LessonType.MINIQUIZ:
            raise ValueError("Can only attach quiz to miniquiz type lesson")
        
        LessonQuestion.objects.create(lesson=self, question=question)
    
    def detach_quiz(self, question):
        """Detach a quiz question from this lesson"""
        LessonQuestion.objects.filter(lesson=self, question=question).delete()
    
    def mark_completed(self, user):
        """Mark this lesson as completed by user"""
        progress, created = UserLessonProgress.objects.get_or_create(
            user=user,
            lesson=self
        )
        if not progress.completed_at:
            progress.completed_at = timezone.now()
            if not progress.started_at:
                progress.started_at = timezone.now()
            progress.save()
            
            # Award learning points
            user.profile.total_lpoint += self.learning_point
            user.profile.save()
            
            # Create notification
            Notification.objects.create(
                user=user,
                type=Notification.NotificationType.COURSE,
                title="Lesson Completed",
                message=f"You completed: {self.node.title}",
                metadata={'lesson_id': self.id}
            )


class CourseNode(BaseNode):
    """
    Cấu trúc cây cho course (folder và lesson items)
    Sử dụng Materialized Path để tránh N+1 query
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='nodes',
        db_column='course_id'
    )
    lesson = models.OneToOneField(
        Lesson,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='node',
        db_column='lesson_id'
    )

    class Meta:
        db_table = 'course_node'
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['parent']),
            models.Index(fields=['lesson']),
            models.Index(fields=['is_item']),
            models.Index(fields=['pre_path'], opclasses=['text_pattern_ops']),
        ]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class LessonQuestion(FullAudit):
    """
    Many-to-Many relationship giữa Lesson và QuizQuestion (cho miniquiz)
    """
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='question_mappings',
        db_column='lesson_id'
    )
    question = models.ForeignKey(
        'QuizQuestion',  # Forward reference vì QuizQuestion chưa định nghĩa
        on_delete=models.CASCADE,
        related_name='lesson_mappings',
        db_column='question_id'
    )

    class Meta:
        db_table = 'lesson_question'
        unique_together = [['lesson', 'question']]
        indexes = [
            models.Index(fields=['lesson']),
            models.Index(fields=['question']),
        ]

    def __str__(self):
        return f"Lesson {self.lesson.id} - Question {self.question.id}"


class LessonOutline(FullAudit):
    """
    Thông tin Outline cho lesson sync từ Outline
    """
    lesson = models.OneToOneField(
        Lesson,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='outline_info',
        db_column='lesson_id'
    )
    outline_doc_id = models.TextField(unique=True)
    outline_url = models.TextField()
    last_synced_at = models.DateTimeField(null=True, blank=True)
    revision = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'lesson_outline'

    def __str__(self):
        return f"Outline: Lesson {self.lesson.id}"


class UserCourseProgress(FullAudit):
    """
    Tiến độ của user cho mỗi course
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progresses',
        db_column='user_id'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='user_progresses',
        db_column='course_id'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_course_progress'
        unique_together = [['user', 'course']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['course']),
        ]

    def __str__(self):
        status = "Completed" if self.completed_at else "In Progress" if self.started_at else "Not Started"
        return f"{self.user.username} - {self.course.title} ({status})"

    @property
    def is_completed(self):
        return self.completed_at is not None


class UserLessonProgress(FullAudit):
    """
    Tiến độ của user cho mỗi lesson
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_progresses',
        db_column='user_id'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='user_progresses',
        db_column='lesson_id'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_lesson_progress'
        unique_together = [['user', 'lesson']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['lesson']),
        ]

    def __str__(self):
        status = "Completed" if self.completed_at else "In Progress" if self.started_at else "Not Started"
        return f"{self.user.username} - Lesson {self.lesson.id} ({status})"

    @property
    def is_completed(self):
        return self.completed_at is not None


# ============================================================================
# QUIZ MODELS
# ============================================================================

class QuizCategory(BaseCategory):
    """
    Danh mục quiz (Algorithm, Database, Security, etc.)
    """
    class Meta:
        db_table = 'quiz_category'
        verbose_name = 'Quiz Category'
        verbose_name_plural = 'Quiz Categories'


class QuizNode(BaseNode):
    """
    Cấu trúc cây cho quiz (folder và quiz items)
    Sử dụng Materialized Path để tránh N+1 query
    """
    quiz = models.OneToOneField(
        'Quiz',  # Forward reference
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='node',
        db_column='quiz_id'
    )

    class Meta:
        db_table = 'quiz_node'
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['quiz']),
            models.Index(fields=['pre_path'], opclasses=['text_pattern_ops']),
        ]

    def __str__(self):
        return self.title


class Quiz(FullAudit):
    """
    Model chính cho Quiz
    """
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        ARCHIVED = 'archived', 'Archived'

    node = models.OneToOneField(
        QuizNode,
        on_delete=models.CASCADE,
        unique=True,
        related_name='quiz_detail',
        db_column='node_id'
    )
    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    
    quiz_point = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    time_limit_sec = models.IntegerField(
        null=True,
        blank=True,
        help_text="Giới hạn thời gian (giây)"
    )

    class Meta:
        db_table = 'quiz'
        indexes = [
            models.Index(fields=['node']),
            models.Index(fields=['status']),
            models.Index(fields=['title']),
        ]

    def __str__(self):
        return self.title


class QuizTag(BaseTag):
    """
    Tag cho quiz (Algorithm, Logic, Math, etc.)
    """
    class Meta:
        db_table = 'quiz_tag'
        verbose_name = 'Quiz Tag'
        verbose_name_plural = 'Quiz Tags'


class QuizTagMap(FullAudit):
    """
    Many-to-Many relationship giữa Quiz và Tag
    """
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='tag_mappings',
        db_column='quiz_id'
    )
    tag = models.ForeignKey(
        QuizTag,
        on_delete=models.CASCADE,
        related_name='quiz_mappings',
        db_column='tag_id'
    )

    class Meta:
        db_table = 'quiz_tag_map'
        unique_together = [['quiz', 'tag']]
        indexes = [
            models.Index(fields=['quiz']),
            models.Index(fields=['tag']),
        ]

    def __str__(self):
        return f"{self.quiz.title} - {self.tag.name}"


class QuizQuestion(FullAudit):
    """
    Câu hỏi trong quiz
    OOP: Polymorphic validation and scoring based on question_type
    """
    class QuestionType(models.TextChoices):
        SINGLE_CHOICE = 'single_choice', 'Single Choice'
        MULTI_CHOICE = 'multi_choice', 'Multiple Choice'
        FILL_BLANK = 'fill_blank', 'Fill in the Blank'

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions',
        db_column='quiz_id'
    )
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices
    )
    content = models.JSONField(
        help_text="Nội dung câu hỏi (JSON)"
    )
    explanation = models.TextField(
        blank=True,
        null=True,
        help_text="Giải thích đáp án"
    )
    case_sensitive = models.BooleanField(default=False)
    score = models.IntegerField(default=1)
    position = models.IntegerField()

    class Meta:
        db_table = 'quiz_question'
        indexes = [
            models.Index(fields=['quiz']),
        ]
        ordering = ['position']

    def __str__(self):
        return f"Question {self.position} - {self.quiz.title}"
    
    # Domain methods - OOP: Polymorphic validation and scoring
    def validate_answer(self, answer_payload):
        """
        Validate answer based on question type
        Per OOP feedback: Polymorphic behavior
        Returns: bool - True if answer is correct
        """
        if self.question_type == self.QuestionType.SINGLE_CHOICE:
            return self._validate_single_choice(answer_payload)
        elif self.question_type == self.QuestionType.MULTI_CHOICE:
            return self._validate_multi_choice(answer_payload)
        elif self.question_type == self.QuestionType.FILL_BLANK:
            return self._validate_fill_blank(answer_payload)
        raise ValueError(f"Unknown question type: {self.question_type}")
    
    def score_answer(self, answer_payload):
        """
        Score the answer
        Per OOP feedback: Polymorphic scoring
        Returns: int - score obtained (0 to self.score)
        """
        is_correct = self.validate_answer(answer_payload)
        return self.score if is_correct else 0
    
    def _validate_single_choice(self, answer_payload):
        """Validate single choice answer"""
        try:
            selected_id = int(answer_payload.get('option_id'))
            correct_option = self.options.filter(is_correct=True).first()
            return correct_option and correct_option.id == selected_id
        except (ValueError, TypeError):
            return False
    
    def _validate_multi_choice(self, answer_payload):
        """
        Validate multiple choice answer
        Per teacher feedback: Must select ALL correct options to get points
        """
        try:
            selected_ids = set(answer_payload.get('option_ids', []))
            correct_ids = set(
                self.options.filter(is_correct=True).values_list('id', flat=True)
            )
            return selected_ids == correct_ids
        except (ValueError, TypeError):
            return False
    
    def _validate_fill_blank(self, answer_payload):
        """Validate fill in the blank answer"""
        try:
            submitted_answer = answer_payload.get('answer', '').strip()
            
            # Check against all possible answers
            for ans in self.answers.all():
                if ans.is_case_sensitive:
                    if submitted_answer == ans.answer:
                        return True
                else:
                    if submitted_answer.lower() == ans.answer.lower():
                        return True
            return False
        except (AttributeError, TypeError):
            return False


class QuizQuestionOption(FullAudit):
    """
    Lựa chọn cho câu hỏi single_choice hoặc multi_choice
    """
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='options',
        db_column='question_id'
    )
    content = models.TextField()
    is_correct = models.BooleanField(default=False)
    position = models.IntegerField()

    class Meta:
        db_table = 'quiz_question_option'
        indexes = [
            models.Index(fields=['question']),
        ]
        ordering = ['position']

    def __str__(self):
        return f"Option {self.position} for Question {self.question.id}"


class QuizQuestionAnswer(FullAudit):
    """
    Đáp án cho câu hỏi fill_blank
    """
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='answers',
        db_column='question_id'
    )
    answer = models.TextField()
    is_case_sensitive = models.BooleanField(default=True)

    class Meta:
        db_table = 'quiz_question_answer'
        indexes = [
            models.Index(fields=['question']),
        ]

    def __str__(self):
        return f"Answer for Question {self.question.id}"


class UserQuizAttempt(FullAudit):
    """
    Lần làm quiz của user
    """
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='user_attempts',
        db_column='quiz_id'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        db_column='user_id'
    )
    config = models.JSONField(
        null=True,
        blank=True,
        help_text="Cấu hình quiz (số câu, random, thời gian/câu...)"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    total_score = models.IntegerField(default=0)

    class Meta:
        db_table = 'user_quiz_attempt'
        indexes = [
            models.Index(fields=['quiz']),
            models.Index(fields=['user']),
            models.Index(fields=['user', 'quiz', '-started_at']),
        ]
        ordering = ['-started_at']

    def __str__(self):
        status = "Finished" if self.finished_at else "In Progress"
        return f"{self.user.username} - {self.quiz.title} ({status})"

    @property
    def is_finished(self):
        return self.finished_at is not None


class UserQuizAnswer(FullAudit):
    """
    Câu trả lời của user cho từng câu hỏi trong attempt
    """
    attempt = models.ForeignKey(
        UserQuizAttempt,
        on_delete=models.CASCADE,
        related_name='answers',
        db_column='attempt_id'
    )
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='user_answers',
        db_column='question_id'
    )
    answer_data = models.JSONField(
        help_text="Dữ liệu câu trả lời (option id, text...)"
    )
    score_obtained = models.IntegerField(default=0)

    class Meta:
        db_table = 'user_quiz_answer'
        indexes = [
            models.Index(fields=['attempt']),
            models.Index(fields=['question']),
        ]

    def __str__(self):
        return f"Answer for Question {self.question.id} in Attempt {self.attempt.id}"


class QuizConfig(FullAudit):
    """
    Cấu hình quiz cho từng user (hoặc default)
    """
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='configs',
        db_column='quiz_id'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_configs',
        db_column='user_id'
    )
    
    total_questions = models.IntegerField(
        null=True,
        blank=True,
        help_text="Số câu lấy ra"
    )
    time_limit_sec = models.IntegerField(
        null=True,
        blank=True,
        help_text="Thời gian làm bài (giây)"
    )
    random_question = models.BooleanField(default=True)
    random_option = models.BooleanField(default=True)
    
    allow_review = models.BooleanField(default=True)
    allow_retry = models.BooleanField(default=True)
    max_attempt = models.IntegerField(
        null=True,
        blank=True,
        help_text="Số lần làm tối đa (NULL = unlimited)"
    )
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'quiz_config'

    def __str__(self):
        config_type = "Default" if self.is_default else "Custom"
        return f"{config_type} Config for {self.quiz.title} - {self.user.username}"


# ============================================================================
# USER & AUTHENTICATION MODELS
# ============================================================================

class UserManager(BaseUserManager):
    """Custom user manager"""
    
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError('Username field is required')
        email = self.normalize_email(email) if email else None
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractUser, CreateAudit, UpdateAudit):
    """
    Custom User model extending Django's AbstractUser
    """
    email = models.EmailField(unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    objects = UserManager()
    
    class Meta:
        db_table = 'user'
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return self.username
    
    # Domain methods per OOP feedback
    def compute_effective_permissions(self):
        """
        Compute effective permissions for user combining role-based and direct permissions
        Direct permissions override role permissions
        """
        from .services.permission_service import PermissionService
        return PermissionService.compute_user_permissions(self)
    
    def grant_permission(self, permission):
        """Grant a permission directly to user"""
        UserPermission.objects.get_or_create(
            user=self,
            permission=permission,
            defaults={'is_allowed': True}
        )
        # Invalidate cache
        self.invalidate_permission_cache()
    
    def revoke_permission(self, permission):
        """Revoke a permission from user"""
        UserPermission.objects.filter(user=self, permission=permission).delete()
        # Invalidate cache
        self.invalidate_permission_cache()
    
    def add_role(self, role):
        """Add user to a role"""
        UserRole.objects.get_or_create(user=self, role=role)
        self.invalidate_permission_cache()
    
    def remove_role(self, role):
        """Remove user from a role"""
        UserRole.objects.filter(user=self, role=role).delete()
        self.invalidate_permission_cache()
    
    def invalidate_permission_cache(self):
        """Invalidate cached permissions"""
        UserPermissionCache.objects.filter(user=self).update(is_valid=False)
    
    def has_permission(self, permission_code):
        """Check if user has a specific permission"""
        from .services.permission_service import PermissionService
        return PermissionService.check_permission(self, permission_code)


class UserProfile(FullAudit):
    """
    Extended user profile information
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='profile',
        db_column='user_id'
    )
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)
    
    total_lpoint = models.IntegerField(default=0, help_text="Total learning points")
    total_cpoint = models.IntegerField(default=0, help_text="Total challenge points")
    total_qpoint = models.IntegerField(default=0, help_text="Total quiz points")
    
    rank_lpoint = models.IntegerField(null=True, blank=True)
    rank_cpoint = models.IntegerField(null=True, blank=True)
    rank_qpoint = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_profile'
    
    def __str__(self):
        return f"Profile: {self.user.username}"
    
    def update_leaderboard_rank(self):
        """Update user's rank on leaderboard"""
        from .services.leaderboard_service import LeaderboardService
        LeaderboardService.update_user_rank(self.user)


class UserAuthProvider(FullAudit):
    """
    SSO / OAuth provider information for user
    """
    class Provider(models.TextChoices):
        AUTHENTIK = 'authentik', 'Authentik'
        GOOGLE = 'google', 'Google'
        GITHUB = 'github', 'GitHub'
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='auth_providers',
        db_column='user_id'
    )
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices
    )
    provider_user_id = models.TextField()
    provider_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional data from provider"
    )
    
    class Meta:
        db_table = 'user_auth_provider'
        unique_together = [['provider', 'provider_user_id']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['provider', 'provider_user_id']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.provider}"


# ============================================================================
# AUTHORIZATION MODELS
# ============================================================================

class Permission(FullAudit, SoftDeleteAudit):
    """
    Permission model with hierarchical structure
    Each permission corresponds to an API endpoint or group of endpoints
    """
    code = models.TextField(unique=True, help_text="Permission code (e.g., 'course.view')")
    name = models.TextField(help_text="Human-readable name")
    description = models.TextField(blank=True, null=True)
    
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        db_column='parent_id'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="If parent is disabled, children are also disabled"
    )
    
    # For automatic sync from endpoints
    endpoint_path = models.TextField(blank=True, null=True)
    http_method = models.CharField(max_length=10, blank=True, null=True)
    last_scanned = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'permission'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['parent']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    # Domain methods per OOP feedback
    def is_effective_active(self):
        """
        Check if permission is effectively active (considering parent hierarchy)
        """
        if not self.is_active:
            return False
        if self.parent:
            return self.parent.is_effective_active()
        return True
    
    def get_all_children(self):
        """Get all descendant permissions"""
        children = list(self.children.all())
        for child in list(children):
            children.extend(child.get_all_children())
        return children
    
    def enable(self):
        """Enable this permission"""
        self.is_active = True
        self.save()
    
    def disable(self):
        """Disable this permission (children will be effectively disabled too)"""
        self.is_active = False
        self.save()


class Role(FullAudit):
    """
    Role model - collection of permissions
    """
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, null=True)
    is_system = models.BooleanField(
        default=False,
        help_text="System roles cannot be deleted"
    )
    
    class Meta:
        db_table = 'role'
        indexes = [
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
    
    # Domain methods per OOP feedback
    def grant(self, permission):
        """Grant a permission to this role"""
        RolePermission.objects.get_or_create(
            role=self,
            permission=permission
        )
        # Invalidate cache for all users with this role
        self.invalidate_users_cache()
    
    def revoke(self, permission):
        """Revoke a permission from this role"""
        RolePermission.objects.filter(role=self, permission=permission).delete()
        self.invalidate_users_cache()
    
    def invalidate_users_cache(self):
        """Invalidate permission cache for all users with this role"""
        user_ids = self.users.values_list('user_id', flat=True)
        UserPermissionCache.objects.filter(user_id__in=user_ids).update(is_valid=False)
    
    def get_all_permissions(self):
        """Get all permissions for this role"""
        return Permission.objects.filter(
            role_permissions__role=self,
            is_deleted=False
        ).distinct()


class RolePermission(FullAudit):
    """
    Many-to-Many relationship between Role and Permission
    """
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='role_permissions',
        db_column='role_id'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_permissions',
        db_column='permission_id'
    )
    
    class Meta:
        db_table = 'role_permission'
        unique_together = [['role', 'permission']]
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['permission']),
        ]
    
    def __str__(self):
        return f"{self.role.name} - {self.permission.code}"


class UserRole(FullAudit):
    """
    Many-to-Many relationship between User and Role
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles',
        db_column='user_id'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='users',
        db_column='role_id'
    )
    
    class Meta:
        db_table = 'user_role'
        unique_together = [['user', 'role']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"


class UserPermission(FullAudit):
    """
    Direct permission assignment to user (overrides role permissions)
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_permissions',
        db_column='user_id'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='user_permissions',
        db_column='permission_id'
    )
    is_allowed = models.BooleanField(
        default=True,
        help_text="True = allow, False = deny (deny takes precedence)"
    )
    
    class Meta:
        db_table = 'user_permission'
        unique_together = [['user', 'permission']]
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['permission']),
        ]
    
    def __str__(self):
        access = "Allow" if self.is_allowed else "Deny"
        return f"{self.user.username} - {self.permission.code} ({access})"


class UserPermissionCache(CreateAudit):
    """
    Cached encoded permissions for user (used in JWT token)
    Speeds up token generation/revocation
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='permission_cache',
        db_column='user_id'
    )
    encoded_permissions = models.JSONField(
        help_text="Pre-encoded permissions with hierarchy"
    )
    is_valid = models.BooleanField(
        default=True,
        help_text="Set to False when permissions change"
    )
    last_computed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_permission_cache'
    
    def __str__(self):
        status = "Valid" if self.is_valid else "Invalid"
        return f"Cache for {self.user.username} ({status})"


# ============================================================================
# SYSTEM CONFIGURATION MODELS
# ============================================================================

class SystemConfig(FullAudit):
    """
    System-wide configuration key-value store
    """
    class ConfigType(models.TextChoices):
        BOOLEAN = 'boolean', 'Boolean'
        INTEGER = 'integer', 'Integer'
        STRING = 'string', 'String'
        JSON = 'json', 'JSON'
    
    key = models.TextField(unique=True)
    value = models.TextField()
    value_type = models.CharField(
        max_length=20,
        choices=ConfigType.choices,
        default=ConfigType.STRING
    )
    description = models.TextField(blank=True, null=True)
    is_public = models.BooleanField(
        default=False,
        help_text="If True, can be accessed without authentication"
    )
    
    class Meta:
        db_table = 'system_config'
        indexes = [
            models.Index(fields=['key']),
        ]
    
    def __str__(self):
        return f"{self.key} = {self.value}"
    
    def get_typed_value(self):
        """Return value with correct type"""
        if self.value_type == self.ConfigType.BOOLEAN:
            return self.value.lower() in ('true', '1', 'yes')
        elif self.value_type == self.ConfigType.INTEGER:
            return int(self.value)
        elif self.value_type == self.ConfigType.JSON:
            import json
            return json.loads(self.value)
        return self.value


# ============================================================================
# NOTIFICATION MODELS
# ============================================================================

class Notification(FullAudit):
    """
    Notification model for user notifications
    """
    class NotificationType(models.TextChoices):
        SYSTEM = 'system', 'System'
        ACHIEVEMENT = 'achievement', 'Achievement'
        COURSE = 'course', 'Course'
        CHALLENGE = 'challenge', 'Challenge'
        QUIZ = 'quiz', 'Quiz'
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='user_id',
        null=True,
        blank=True,
        help_text="NULL for broadcast notifications"
    )
    
    type = models.CharField(
        max_length=20,
        choices=NotificationType.choices
    )
    title = models.TextField()
    message = models.TextField()
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional data (links, ids, etc.)"
    )
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    is_broadcast = models.BooleanField(
        default=False,
        help_text="If True, sent to all users"
    )
    
    class Meta:
        db_table = 'notification'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read']),
            models.Index(fields=['is_broadcast']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        target = "Broadcast" if self.is_broadcast else self.user.username
        return f"{target} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save()


# ============================================================================
# AUDIT LOG MODELS
# ============================================================================

class AuditLog(models.Model):
    """
    System-wide audit log for tracking important actions
    """
    class ActorType(models.TextChoices):
        USER = 'user', 'User'
        SYSTEM = 'system', 'System'
        API = 'api', 'API'
    
    class AggregateType(models.TextChoices):
        USER = 'user', 'User'
        COURSE = 'course', 'Course'
        LESSON = 'lesson', 'Lesson'
        CHALLENGE = 'challenge', 'Challenge'
        QUIZ = 'quiz', 'Quiz'
        PERMISSION = 'permission', 'Permission'
        ROLE = 'role', 'Role'
        SYSTEM = 'system', 'System'
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    actor_type = models.CharField(max_length=20, choices=ActorType.choices)
    actor_id = models.BigIntegerField(null=True, blank=True)
    actor_username = models.TextField(null=True, blank=True)
    
    aggregate_type = models.CharField(max_length=20, choices=AggregateType.choices)
    aggregate_id = models.BigIntegerField()
    
    action = models.TextField(help_text="Action performed (e.g., 'create', 'update', 'delete')")
    
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional context (changed fields, old/new values, etc.)"
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['actor_type', 'actor_id']),
            models.Index(fields=['aggregate_type', 'aggregate_id']),
            models.Index(fields=['action']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        actor = self.actor_username or f"{self.actor_type}:{self.actor_id}"
        return f"{actor} - {self.action} {self.aggregate_type}:{self.aggregate_id}"
