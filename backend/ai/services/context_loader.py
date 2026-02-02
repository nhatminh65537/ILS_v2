# ai/services/context_loader.py
from api.models import Lesson
from api.models import Challenge

def load_context(context_type, context_id):
    if context_type == "lesson":
        lesson = Lesson.objects.get(id=context_id)
        return lesson.content
    if context_type == "challenge":
        challenge = Challenge.objects.get(id=context_id)
        return challenge.description
    return ""
