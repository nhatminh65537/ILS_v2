from rest_framework.permissions import BasePermission

class CanUseLearnAssistant(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("ai.use_learn_assistant")
    
class CanUseEditorAssistant(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("ai.use_editor_assistant")