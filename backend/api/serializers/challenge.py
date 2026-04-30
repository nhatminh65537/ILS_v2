import re

from rest_framework import serializers

from api.models import Challenge, ChallengeCategory, ChallengeInstance, ChallengeNode, ChallengeTag, UserChallengeProgress
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

    class Meta:
        model = ChallengeNode
        fields = ['id', 'parent', 'is_item', 'title', 'position', 'path', 'challenge', 'has_children']
        read_only_fields = ['id', 'path', 'has_children']

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


class ChallengeListSerializer(serializers.ModelSerializer):
    """Challenge list serializer (minimal fields)"""

    category_name = serializers.CharField(source='category.name', read_only=True)
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
            'category_name',
            'tags',
            'challenge_point',
            'instance_required',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_tags(self, obj):
        return ChallengeTagSerializer(
            [tm.tag for tm in obj.tag_mappings.select_related('tag').all()],
            many=True,
        ).data


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


class ChallengeFlagSubmitSerializer(serializers.Serializer):
    """Serializer for flag submission"""

    flag = serializers.CharField(required=True)

    def validate_flag(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Flag cannot be empty')
        return value.strip()


class ChallengeInstanceSerializer(serializers.ModelSerializer):
    """Challenge instance serializer"""

    challenge_title = serializers.CharField(source='challenge.title', read_only=True)

    class Meta:
        model = ChallengeInstance
        fields = [
            'id',
            'challenge',
            'challenge_title',
            'user',
            'instance_info',
            'status',
            'created_at',
            'terminated_at',
        ]
        read_only_fields = ['id', 'instance_info', 'flag_value', 'created_at', 'terminated_at']


class UserChallengeProgressSerializer(serializers.ModelSerializer):
    """User challenge progress serializer"""

    challenge_title = serializers.CharField(source='challenge.title', read_only=True)

    class Meta:
        model = UserChallengeProgress
        fields = ['id', 'user', 'challenge', 'challenge_title', 'completed_at', 'is_completed']
        read_only_fields = ['id', 'is_completed']
