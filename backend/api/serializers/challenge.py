from rest_framework import serializers

from api.models import Challenge, ChallengeCategory, ChallengeInstance, ChallengeTag, UserChallengeProgress


class ChallengeCategorySerializer(serializers.ModelSerializer):
    """Challenge category serializer"""

    class Meta:
        model = ChallengeCategory
        fields = ['id', 'name', 'description']


class ChallengeTagSerializer(serializers.ModelSerializer):
    """Challenge tag serializer"""

    class Meta:
        model = ChallengeTag
        fields = ['id', 'name', 'description']


class ChallengeListSerializer(serializers.ModelSerializer):
    """Challenge list serializer (minimal fields)"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id',
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
        return ChallengeTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


class ChallengeDetailSerializer(serializers.ModelSerializer):
    """Challenge detail serializer"""

    category = ChallengeCategorySerializer(read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id',
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
        return ChallengeTagSerializer([tm.tag for tm in obj.tag_mappings.select_related('tag').all()], many=True).data


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
