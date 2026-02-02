from rest_framework import serializers

class AIRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=[
        "lern_assistant",
        "editor_assistant",
        "learning_path",
    ])
    question = serializers.CharField()
    context_type = serializers.CharField(required=False)
    context_id = serializers.IntegerField(required=False)
    