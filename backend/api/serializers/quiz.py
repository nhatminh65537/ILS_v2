from rest_framework import serializers

from api.models import Quiz, QuizCategory, QuizConfig, QuizNode, QuizQuestion, QuizQuestionAnswer, QuizQuestionOption, QuizTag, UserQuizProgress


class QuizCategorySerializer(serializers.ModelSerializer):
    """Quiz category serializer"""

    class Meta:
        model = QuizCategory
        fields = ['id', 'name', 'description']


class QuizTagSerializer(serializers.ModelSerializer):
    """Quiz tag serializer"""

    class Meta:
        model = QuizTag
        fields = ['id', 'name', 'description']


class QuizNodeSerializer(serializers.ModelSerializer):
    """Quiz node serializer for tree CRUD endpoints (folder-only in MVP)."""

    has_children = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuizNode
        fields = ['id', 'parent', 'is_item', 'title', 'position', 'path', 'quiz', 'has_children']
        read_only_fields = ['id', 'path', 'has_children']

    def validate_is_item(self, value):
        if value:
            raise serializers.ValidationError('QuizNode item mode is not supported in MVP. Use folder nodes only.')
        return value

    def validate_quiz(self, value):
        if value is not None:
            raise serializers.ValidationError('Quiz linkage is not supported in Task 7.2. Use folder nodes only.')
        return value

    def validate(self, attrs):
        parent = attrs.get('parent')
        instance = getattr(self, 'instance', None)

        if parent and instance and parent.id == instance.id:
            raise serializers.ValidationError({'parent': 'Node cannot be parent of itself.'})

        return attrs

    def create(self, validated_data):
        validated_data['is_item'] = False
        validated_data['quiz'] = None
        node = super().create(validated_data)
        node.rebuild_path()
        return node

    def update(self, instance, validated_data):
        new_parent = validated_data.pop('parent', instance.parent)
        validated_data['is_item'] = False
        validated_data['quiz'] = None

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
    quiz_point = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'status', 'tags', 'quiz_point', 'total_questions', 'time_limit_sec', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def get_tags(self, obj):
        return QuizTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


class QuizDetailSerializer(serializers.ModelSerializer):
    """Quiz detail serializer with questions"""

    questions = QuizQuestionSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    category = QuizCategorySerializer(read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id',
            'title',
            'description',
            'status',
            'category',
            'tags',
            'quiz_point',
            'total_questions',
            'time_limit_sec',
            'updated_at',
            'questions',
        ]
        read_only_fields = ['id', 'updated_at']

    def get_tags(self, obj):
        return QuizTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


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
