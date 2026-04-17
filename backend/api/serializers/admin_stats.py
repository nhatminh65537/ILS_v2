"""Admin statistics serializers."""

from rest_framework import serializers


class AdminStatsOverviewSerializer(serializers.Serializer):
    user_count = serializers.IntegerField(min_value=0)
    active_today = serializers.IntegerField(min_value=0)
    solves_week = serializers.IntegerField(min_value=0)


class AdminStatsUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.CharField(allow_blank=True, required=False)
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()
    last_login = serializers.DateTimeField(allow_null=True, required=False)
    display_name = serializers.CharField(allow_null=True, required=False)
    avatar_url = serializers.CharField(allow_null=True, required=False)
    last_active_at = serializers.DateTimeField(allow_null=True, required=False)


class AdminStatsPointsSerializer(serializers.Serializer):
    learning = serializers.IntegerField(min_value=0)
    challenge = serializers.IntegerField(min_value=0)
    quiz = serializers.IntegerField(min_value=0)
    total = serializers.IntegerField(min_value=0)


class AdminStatsCompletionSerializer(serializers.Serializer):
    courses_started = serializers.IntegerField(min_value=0)
    courses_completed = serializers.IntegerField(min_value=0)
    lessons_started = serializers.IntegerField(min_value=0)
    lessons_completed = serializers.IntegerField(min_value=0)
    challenges_completed = serializers.IntegerField(min_value=0)
    challenge_submits = serializers.IntegerField(min_value=0)
    challenge_correct_submits = serializers.IntegerField(min_value=0)
    quizzes_completed = serializers.IntegerField(min_value=0)
    quiz_attempts = serializers.IntegerField(min_value=0)
    quiz_best_score = serializers.IntegerField(min_value=0)


class AdminStatsActivitySerializer(serializers.Serializer):
    last_active_at = serializers.DateTimeField(allow_null=True, required=False)
    last_course_started_at = serializers.DateTimeField(allow_null=True, required=False)
    last_course_completed_at = serializers.DateTimeField(allow_null=True, required=False)
    last_lesson_started_at = serializers.DateTimeField(allow_null=True, required=False)
    last_lesson_completed_at = serializers.DateTimeField(allow_null=True, required=False)
    last_challenge_completed_at = serializers.DateTimeField(allow_null=True, required=False)
    last_quiz_attempted_at = serializers.DateTimeField(allow_null=True, required=False)
    last_quiz_completed_at = serializers.DateTimeField(allow_null=True, required=False)


class AdminStatsSessionSerializer(serializers.Serializer):
    total = serializers.IntegerField(min_value=0)
    active = serializers.IntegerField(min_value=0)
    revoked = serializers.IntegerField(min_value=0)
    latest_last_used_at = serializers.DateTimeField(allow_null=True, required=False)
    latest_expires_at = serializers.DateTimeField(allow_null=True, required=False)


class AdminStatsUserDetailSerializer(serializers.Serializer):
    user = AdminStatsUserSerializer()
    points = AdminStatsPointsSerializer()
    completion = AdminStatsCompletionSerializer()
    activity = AdminStatsActivitySerializer()
    sessions = AdminStatsSessionSerializer()