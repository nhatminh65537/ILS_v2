from rest_framework import serializers
from .constants import AImode

class AIRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=[
        AImode.LEARN_ASSISTANT,
        AImode.EDITOR_ASSISTANT,
        AImode.LEARNING_PATH,
    ])
    question = serializers.CharField()
    context_type = serializers.CharField(required=False)
    context_id = serializers.IntegerField(required=False)
