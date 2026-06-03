import re

from rest_framework import serializers

from api.models import Challenge, ChallengeCategory, ChallengeFlag, ChallengeInstance, ChallengeNode, ChallengeTag, UserChallengeProgress, UserChallengeSubmit
from api.services.challenge_service import ChallengeService


class ChallengeCategorySerializer(serializers.ModelSerializer):
    """Challenge category serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = ChallengeCategory.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Category name already exists.')
        return normalized

    class Meta:
        model = ChallengeCategory
        fields = ['id', 'name', 'description']


class ChallengeTagSerializer(serializers.ModelSerializer):
    """Challenge tag serializer"""

    def validate_name(self, value):
        normalized = value.strip()
        queryset = ChallengeTag.objects.filter(name__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('Tag name already exists.')
        return normalized

    class Meta:
        model = ChallengeTag
        fields = ['id', 'name', 'description']


class ChallengeNodeSerializer(serializers.ModelSerializer):
    """Challenge node serializer for tree CRUD endpoints."""

    has_children = serializers.SerializerMethodField(read_only=True)
    challenge_slug = serializers.CharField(source='challenge.slug', read_only=True, default=None)

    class Meta:
        model = ChallengeNode
        fields = ['id', 'parent', 'is_item', 'title', 'position', 'path', 'challenge', 'challenge_slug', 'has_children']
        read_only_fields = ['id', 'path', 'challenge_slug', 'has_children']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        parent = attrs.get('parent', instance.parent if instance else None)
        is_item = attrs.get('is_item', instance.is_item if instance else False)
        challenge = attrs.get('challenge', instance.challenge if instance else None)

        if parent and instance and parent.id == instance.id:
            raise serializers.ValidationError({'parent': 'Node cannot be parent of itself.'})

        if parent and parent.is_item:
            raise serializers.ValidationError({'parent': 'Item nodes cannot have children.'})

        if is_item and challenge is None:
            raise serializers.ValidationError({'challenge': 'Challenge is required when is_item=true.'})

        if not is_item and challenge is not None:
            raise serializers.ValidationError({'challenge': 'Challenge must be null when is_item=false.'})

        if is_item and instance and instance.children.exists():
            raise serializers.ValidationError({'is_item': 'Item nodes cannot have children.'})

        if challenge is not None:
            queryset = ChallengeNode.objects.filter(challenge=challenge)
            if instance:
                queryset = queryset.exclude(id=instance.id)
            if queryset.exists():
                raise serializers.ValidationError({'challenge': 'Challenge is already linked to a node.'})

        return attrs

    def create(self, validated_data):
        node = super().create(validated_data)
        node.rebuild_path()
        return node

    def update(self, instance, validated_data):
        new_parent = validated_data.pop('parent', instance.parent)

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


class ChallengeNodeWriteSerializer(serializers.Serializer):
    """Write serializer for atomic challenge node creation.

    For folders (``is_item=false``) only ``title`` + ``parent_id`` are used.
    For items (``is_item=true``) the backend auto-creates a draft Challenge from
    ``title``; the client never supplies ``challenge_id`` or ``position``.
    """

    title = serializers.CharField()
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    is_item = serializers.BooleanField(required=False, default=False)

    def validate_title(self, value):
        normalized = (value or '').strip()
        if not normalized:
            raise serializers.ValidationError('title is required.')
        return normalized


class ChallengeListSerializer(serializers.ModelSerializer):
    """Challenge list serializer (minimal fields)"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    tags = serializers.SerializerMethodField()
    is_solved = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'difficulty',
            'category',
            'category_name',
            'tags',
            'challenge_point',
            'instance_required',
            'is_solved',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True,
        ).data

    def get_is_solved(self, obj):
        # ``solved_ids`` is injected once by the view to avoid per-row queries.
        solved_ids = self.context.get('solved_ids')
        if solved_ids is None:
            return False
        return obj.id in solved_ids


class ChallengeExplorerSerializer(serializers.ModelSerializer):
    """Node serializer for the user/admin file-explorer (folders + challenge items)."""

    challenge = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeNode
        fields = ['id', 'is_item', 'title', 'path', 'challenge']
        read_only_fields = fields

    def get_challenge(self, obj):
        if not obj.is_item or obj.challenge is None:
            return None
        challenge = obj.challenge
        solved_ids = self.context.get('solved_ids') or set()
        return {
            'id': challenge.id,
            'slug': challenge.slug,
            'title': challenge.title,
            'difficulty': challenge.difficulty,
            'status': challenge.status,
            'challenge_point': challenge.challenge_point,
            'instance_required': challenge.instance_required,
            'category_name': challenge.category.name if challenge.category else None,
            'tags': ChallengeTagSerializer(
                [tm.tag for tm in challenge.tag_mappings.all()],
                many=True,
            ).data,
            'is_solved': challenge.id in solved_ids,
        }


class ChallengeDetailSerializer(serializers.ModelSerializer):
    """Challenge detail serializer"""

    category = ChallengeCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'difficulty',
            'category',
            'tags',
            'source',
            'storage_path',
            'gitlab_path',
            'challenge_point',
            'instance_required',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True,
        ).data


class ChallengeWriteSerializer(serializers.ModelSerializer):
    """Write serializer for canonical /api/challenge/challenges/ endpoints."""

    category_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )
    # storage_path is NOT NULL in the model, but manual challenges authored via the
    # admin form have no real file path. Make it optional here and default it from
    # the slug in create() so the form does not have to collect it.
    storage_path = serializers.CharField(required=False, allow_blank=True)
    category = ChallengeCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'status',
            'difficulty',
            'category_id',
            'category',
            'tag_ids',
            'tags',
            'source',
            'storage_path',
            'gitlab_path',
            'challenge_point',
            'instance_required',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category', 'tags']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True,
        ).data

    def validate_slug(self, value):
        normalized = (value or '').strip().lower()
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', normalized):
            raise serializers.ValidationError(
                'Slug must contain only lowercase letters, numbers, and hyphens.'
            )
        return normalized

    def validate_category_id(self, value):
        if value is None:
            return value
        if not ChallengeCategory.objects.filter(id=value).exists():
            raise serializers.ValidationError('Invalid category_id.')
        return value

    def validate_tag_ids(self, value):
        tag_ids = sorted(set(value or []))
        if not tag_ids:
            return tag_ids
        found_ids = set(ChallengeTag.objects.filter(id__in=tag_ids).values_list('id', flat=True))
        missing = [tid for tid in tag_ids if tid not in found_ids]
        if missing:
            raise serializers.ValidationError(f'Invalid tag_ids: {missing}')
        return tag_ids

    def validate(self, attrs):
        if self.instance and 'slug' in attrs and attrs['slug'] != self.instance.slug:
            raise serializers.ValidationError({'slug': 'Slug is immutable after creation.'})
        return attrs

    def create(self, validated_data):
        category_id = validated_data.pop('category_id', None)
        tag_ids = validated_data.pop('tag_ids', [])

        if category_id is not None:
            validated_data['category'] = ChallengeCategory.objects.get(id=category_id)

        # Default storage_path for manual challenges that don't supply one.
        if not validated_data.get('storage_path'):
            validated_data['storage_path'] = f"challenges/{validated_data['slug']}"

        challenge = Challenge.objects.create(**validated_data)
        ChallengeService.upsert_challenge_tags(challenge, tag_ids)
        return challenge

    def update(self, instance, validated_data):
        category_id = validated_data.pop('category_id', serializers.empty)
        tag_ids = validated_data.pop('tag_ids', serializers.empty)

        if category_id is not serializers.empty:
            instance.category = (
                ChallengeCategory.objects.get(id=category_id) if category_id else None
            )

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if tag_ids is not serializers.empty:
            ChallengeService.upsert_challenge_tags(instance, tag_ids)

        return instance


class ChallengeFlagSerializer(serializers.ModelSerializer):
    """Read serializer for ChallengeFlag. Omits flag_value for non-Admin/Editor users."""

    class Meta:
        model = ChallengeFlag
        fields = ['id', 'challenge', 'flag_value', 'is_regex', 'is_case_sensitive', 'random_tail_length', 'created_at', 'updated_at']
        read_only_fields = ['id', 'challenge', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        can_view_flag = bool(
            user
            and user.is_authenticated
            and user.has_permission('api.learn_challenge.flags')
        )
        if not can_view_flag:
            data.pop('flag_value', None)
        return data


class ChallengeFlagWriteSerializer(serializers.ModelSerializer):
    """Write serializer for ChallengeFlag. Stores flag_value as plaintext."""

    class Meta:
        model = ChallengeFlag
        fields = ['flag_value', 'is_regex', 'is_case_sensitive', 'random_tail_length']

    def validate_flag_value(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Flag value cannot be empty.')
        return value

    def validate_random_tail_length(self, value):
        if value < 0:
            raise serializers.ValidationError('random_tail_length must be >= 0.')
        return value

    def validate(self, attrs):
        is_regex = attrs.get('is_regex', getattr(self.instance, 'is_regex', False))
        flag_value = attrs.get('flag_value', '')
        if is_regex and flag_value:
            try:
                re.compile(flag_value)
            except re.error as exc:
                raise serializers.ValidationError({'flag_value': f'Invalid regex pattern: {exc}'})
        return attrs

    def create(self, validated_data):
        return ChallengeFlag.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class ChallengeFlagSubmitSerializer(serializers.Serializer):
    """Serializer for flag submission"""

    flag = serializers.CharField(required=True)

    def validate_flag(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Flag cannot be empty')
        return value.strip()


class ChallengeInstanceSerializer(serializers.ModelSerializer):
    """Challenge instance serializer. flag_value is never exposed."""

    challenge_title = serializers.CharField(source='challenge.title', read_only=True)

    class Meta:
        model = ChallengeInstance
        fields = [
            'id',
            'challenge',
            'challenge_title',
            'user',
            'challenge_flag',
            'instance_info',
            'status',
            'expires_at',
            'created_at',
            'terminated_at',
        ]
        read_only_fields = ['id', 'instance_info', 'created_at', 'terminated_at', 'expires_at']


class UserChallengeProgressSerializer(serializers.ModelSerializer):
    """User challenge progress serializer"""

    challenge_title = serializers.CharField(source='challenge.title', read_only=True)

    class Meta:
        model = UserChallengeProgress
        fields = ['id', 'user', 'challenge', 'challenge_title', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']


class UserChallengeProgressDetailSerializer(serializers.Serializer):
    """Per-challenge progress for the requesting user: solved status + attempt count."""

    is_solved = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()

    def __init__(self, challenge, user, **kwargs):
        super().__init__(challenge, **kwargs)
        self._challenge = challenge
        self._user = user
        self._progress = UserChallengeProgress.objects.filter(user=user, challenge=challenge).first()
        self._attempt_count = UserChallengeSubmit.objects.filter(user=user, challenge=challenge).count()

    def get_is_solved(self, obj):
        return self._progress is not None and self._progress.completed_at is not None

    def get_attempt_count(self, obj):
        return self._attempt_count

    def get_completed_at(self, obj):
        if self._progress and self._progress.completed_at:
            return self._progress.completed_at.isoformat()
        return None
