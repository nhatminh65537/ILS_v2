from rest_framework import serializers


class LeaderboardUserSerializer(serializers.Serializer):
    """Compact user payload for leaderboard entries."""

    id = serializers.IntegerField()
    username = serializers.CharField()
    display_name = serializers.CharField(allow_null=True, required=False)
    avatar_url = serializers.CharField(allow_null=True, required=False)
    avatar = serializers.CharField(source='avatar_url', allow_null=True, required=False)


class LeaderboardEntrySerializer(serializers.Serializer):
    """Leaderboard row serializer."""

    rank = serializers.IntegerField(min_value=1)
    user = LeaderboardUserSerializer()
    score = serializers.IntegerField()
    delta = serializers.IntegerField(min_value=0)


class LeaderboardResponseSerializer(serializers.Serializer):
    """Leaderboard response serializer."""

    type = serializers.CharField()
    my_rank = serializers.IntegerField(allow_null=True)
    total_users = serializers.IntegerField(min_value=0)
    total_count = serializers.IntegerField(min_value=0)
    page = serializers.IntegerField(min_value=1, required=False)
    page_size = serializers.IntegerField(min_value=1, required=False)
    results = LeaderboardEntrySerializer(many=True)
    entries = LeaderboardEntrySerializer(many=True, required=False)