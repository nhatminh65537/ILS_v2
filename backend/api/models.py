from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser

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
        settings.AUTH_USER_MODEL,
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
        help_text="Flag value cho instance này (nếu random)"
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
    flag_value = models.TextField()
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
