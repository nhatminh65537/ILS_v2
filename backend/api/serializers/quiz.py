from rest_framework import serializers

from api.models import Quiz, QuizCategory, QuizConfig, QuizNode, QuizQuestion, QuizQuestionAnswer, QuizQuestionOption, QuizTag, UserQuizProgress


class QuizCategorySerializer(serializers.ModelSerializer):
    """Quiz category serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = QuizCategory.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Category name already exists.')
        return normalized

    class Meta:
        model = QuizCategory
        fields = ['id', 'name', 'description']


class QuizTagSerializer(serializers.ModelSerializer):
    """Quiz tag serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = QuizTag.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Tag name already exists.')
        return normalized

    class Meta:
        model = QuizTag
        fields = ['id', 'name', 'description']


class QuizNodeSerializer(serializers.ModelSerializer):
    """Quiz node serializer for tree CRUD endpoints (folders + quiz items)."""

    has_children = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuizNode
        fields = ['id', 'parent', 'is_item', 'title', 'position', 'path', 'quiz', 'has_children']
        read_only_fields = ['id', 'path', 'quiz', 'has_children']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        parent = attrs.get('parent', instance.parent if instance else None)

        if parent and instance and parent.id == instance.id:
            raise serializers.ValidationError({'parent': 'Node cannot be parent of itself.'})

        if parent and parent.is_item:
            raise serializers.ValidationError({'parent': 'Item nodes cannot have children.'})

        return attrs

    def update(self, instance, validated_data):
        new_parent = validated_data.pop('parent', instance.parent)
        # is_item / quiz linkage are immutable after creation (set by the service).
        validated_data.pop('is_item', None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if new_parent != instance.parent:
            instance.move_to(new_parent)
        else:
            instance.rebuild_path()

        return instance

    def get_has_children(self, obj):
        return obj.children.exists()


class QuizNodeWriteSerializer(serializers.Serializer):
    """Write serializer for atomic quiz node creation.

    For folders (``is_item=false``) only ``title`` + ``parent_id`` are used.
    For items (``is_item=true``) the backend auto-creates a draft Quiz from
    ``title``; the client never supplies ``quiz`` or ``position``.
    """

    title = serializers.CharField()
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    is_item = serializers.BooleanField(required=False, default=False)

    def validate_title(self, value):
        normalized = (value or '').strip()
        if not normalized:
            raise serializers.ValidationError('title is required.')
        return normalized


class QuizExplorerSerializer(serializers.ModelSerializer):
    """Node serializer for the user/admin file-explorer (folders + quiz items)."""

    quiz = serializers.SerializerMethodField()

    class Meta:
        model = QuizNode
        fields = ['id', 'is_item', 'title', 'path', 'quiz']
        read_only_fields = fields

    def get_quiz(self, obj):
        if not obj.is_item or obj.quiz is None:
            return None
        quiz = obj.quiz
        solved_ids = self.context.get('solved_ids') or set()
        return {
            'id': quiz.id,
            'title': quiz.title,
            'status': quiz.status,
            'quiz_point': quiz.quiz_point,
            'total_questions': quiz.total_questions,
            'time_limit_sec': quiz.time_limit_sec,
            'category_name': quiz.category.name if quiz.category else None,
            'tags': QuizTagSerializer(
                [tm.tag for tm in quiz.tag_mappings.all()],
                many=True,
            ).data,
            'is_solved': quiz.id in solved_ids,
        }


class QuizQuestionOptionSerializer(serializers.ModelSerializer):
    """Quiz question option serializer"""

    class Meta:
        model = QuizQuestionOption
        fields = ['id', 'content', 'position']


class QuizQuestionOptionManageSerializer(serializers.ModelSerializer):
    """Quiz question option serializer for authoring endpoints."""

    class Meta:
        model = QuizQuestionOption
        fields = ['id', 'content', 'position', 'is_correct']
        read_only_fields = ['id']


class QuizQuestionAnswerManageSerializer(serializers.ModelSerializer):
    """Accepted answer serializer for fill_blank questions."""

    class Meta:
        model = QuizQuestionAnswer
        fields = ['id', 'answer']
        read_only_fields = ['id']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Quiz question serializer"""

    options = QuizQuestionOptionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_type', 'content', 'explanation', 'score', 'position', 'options']
        read_only_fields = ['id']


class QuizQuestionManageSerializer(serializers.ModelSerializer):
    """Quiz question serializer with nested option/answer writes for editor/admin."""

    options = QuizQuestionOptionManageSerializer(many=True, required=False)
    answers = QuizQuestionAnswerManageSerializer(many=True, required=False)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'status',
            'question_type',
            'content',
            'explanation',
            'case_sensitive',
            'score',
            'position',
            'options',
            'answers',
        ]
        read_only_fields = ['id']

    def validate_content(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('content must be a JSON object.')
        if not value.get('text'):
            raise serializers.ValidationError('content.text is required.')
        return value

    def validate(self, attrs):
        question_type = attrs.get('question_type', getattr(self.instance, 'question_type', None))
        options = attrs.get('options', None)
        answers = attrs.get('answers', None)

        if question_type in {QuizQuestion.QuestionType.SINGLE_CHOICE, QuizQuestion.QuestionType.MULTI_CHOICE}:
            if options is None and self.instance is None:
                raise serializers.ValidationError({'options': 'options are required for choice questions.'})

            if options is not None:
                if len(options) < 2:
                    raise serializers.ValidationError({'options': 'At least 2 options are required.'})
                correct_count = sum(1 for option in options if option.get('is_correct'))
                if question_type == QuizQuestion.QuestionType.SINGLE_CHOICE and correct_count != 1:
                    raise serializers.ValidationError({'options': 'single_choice requires exactly 1 correct option.'})
                if question_type == QuizQuestion.QuestionType.MULTI_CHOICE and correct_count < 1:
                    raise serializers.ValidationError({'options': 'multi_choice requires at least 1 correct option.'})

        if question_type == QuizQuestion.QuestionType.FILL_BLANK:
            if answers is None and self.instance is None:
                raise serializers.ValidationError({'answers': 'answers are required for fill_blank questions.'})
            if answers is not None and len([item for item in answers if item.get('answer')]) == 0:
                raise serializers.ValidationError({'answers': 'Provide at least 1 accepted answer.'})

        return attrs

    def create(self, validated_data):
        options = validated_data.pop('options', [])
        answers = validated_data.pop('answers', [])
        question = QuizQuestion.objects.create(**validated_data)
        self._replace_options(question, options)
        self._replace_answers(question, answers)
        return question

    def update(self, instance, validated_data):
        options = validated_data.pop('options', None)
        answers = validated_data.pop('answers', None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if options is not None:
            self._replace_options(instance, options)
        if answers is not None:
            self._replace_answers(instance, answers)

        return instance

    def _replace_options(self, question, options):
        if question.question_type not in {QuizQuestion.QuestionType.SINGLE_CHOICE, QuizQuestion.QuestionType.MULTI_CHOICE}:
            question.options.all().delete()
            return

        question.options.all().delete()
        QuizQuestionOption.objects.bulk_create(
            [
                QuizQuestionOption(
                    question=question,
                    content=option['content'],
                    position=option.get('position', index),
                    is_correct=bool(option.get('is_correct', False)),
                )
                for index, option in enumerate(options)
            ]
        )

    def _replace_answers(self, question, answers):
        if question.question_type != QuizQuestion.QuestionType.FILL_BLANK:
            question.answers.all().delete()
            return

        question.answers.all().delete()
        QuizQuestionAnswer.objects.bulk_create(
            [QuizQuestionAnswer(question=question, answer=item['answer']) for item in answers if item.get('answer')]
        )


class QuizListSerializer(serializers.ModelSerializer):
    """Quiz list serializer"""

    tags = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    is_solved = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'description',
            'status',
            'category',
            'category_name',
            'tags',
            'quiz_point',
            'total_questions',
            'time_limit_sec',
            'is_solved',
            'updated_at',
        ]
        # quiz_point is derived (sum of question scores) — never client-writable.
        read_only_fields = ['id', 'quiz_point', 'updated_at']

    def get_tags(self, obj):
        return QuizTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data

    def get_is_solved(self, obj):
        # ``solved_ids`` is injected once by the view to avoid per-row queries.
        solved_ids = self.context.get('solved_ids')
        if solved_ids is None:
            return False
        return obj.id in solved_ids


class QuizDetailSerializer(serializers.ModelSerializer):
    """Quiz detail serializer with questions + taxonomy writes."""

    questions = QuizQuestionSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    category = QuizCategorySerializer(read_only=True)
    category_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'description',
            'status',
            'category',
            'category_id',
            'tags',
            'tag_ids',
            'quiz_point',
            'total_questions',
            'time_limit_sec',
            'updated_at',
            'questions',
        ]
        # quiz_point is derived (sum of question scores) — never client-writable.
        read_only_fields = ['id', 'quiz_point', 'total_questions', 'updated_at']

    def get_tags(self, obj):
        return QuizTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data

    def validate_category_id(self, value):
        if value is None:
            return value
        if not QuizCategory.objects.filter(id=value).exists():
            raise serializers.ValidationError('Invalid category_id.')
        return value

    def validate_tag_ids(self, value):
        tag_ids = sorted(set(value or []))
        if not tag_ids:
            return tag_ids
        found_ids = set(QuizTag.objects.filter(id__in=tag_ids).values_list('id', flat=True))
        missing = [tid for tid in tag_ids if tid not in found_ids]
        if missing:
            raise serializers.ValidationError(f'Invalid tag_ids: {missing}')
        return tag_ids

    def create(self, validated_data):
        from api.services.quiz_service import QuizService

        category_id = validated_data.pop('category_id', None)
        tag_ids = validated_data.pop('tag_ids', [])

        if category_id is not None:
            validated_data['category'] = QuizCategory.objects.get(id=category_id)

        quiz = Quiz.objects.create(**validated_data)
        QuizService.upsert_quiz_tags(quiz, tag_ids)
        return quiz

    def update(self, instance, validated_data):
        from api.services.quiz_service import QuizService

        category_id = validated_data.pop('category_id', serializers.empty)
        tag_ids = validated_data.pop('tag_ids', serializers.empty)

        if category_id is not serializers.empty:
            instance.category = (
                QuizCategory.objects.get(id=category_id) if category_id else None
            )

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if tag_ids is not serializers.empty:
            QuizService.upsert_quiz_tags(instance, tag_ids)

        return instance


class QuizConfigSerializer(serializers.ModelSerializer):
    """Per-user quiz config serializer for Task 7.1 endpoint contract."""

    class Meta:
        model = QuizConfig
        fields = [
            'id',
            'quiz',
            'user',
            'total_questions',
            'time_limit_sec',
            'random_question',
            'random_option',
            'question_filter',
            'immediate_feedback',
            'allow_review',
            'allow_retry',
            'max_attempt',
            'is_default',
            'is_active',
        ]
        read_only_fields = ['id', 'quiz', 'user', 'is_default']

    def validate_total_questions(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('total_questions must be > 0 when provided.')
        return value

    def validate_time_limit_sec(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('time_limit_sec must be > 0 when provided.')
        return value

    def validate_max_attempt(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('max_attempt must be > 0 when provided.')
        return value


class UserQuizProgressSerializer(serializers.ModelSerializer):
    """User quiz progress serializer for GET /api/quiz/quizzes/{id}/progress/."""

    user_id = serializers.IntegerField(read_only=True)
    quiz_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = UserQuizProgress
        fields = ['id', 'user_id', 'quiz_id', 'best_score', 'attempt_count', 'first_attempted_at', 'last_attempted_at']
        read_only_fields = fields
