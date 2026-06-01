from rest_framework import serializers

from api.models import AuditLog, Notification, SystemConfig


class SystemConfigSerializer(serializers.ModelSerializer):
    """System configuration serializer"""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Secret values are masked by default. They are only revealed when the
        # view explicitly opts in via context AFTER checking the caller holds
        # `system.config.read_secret` (see SystemConfigViewSet.reveal).
        if instance.value_type == SystemConfig.ConfigType.SECRET and not self.context.get('reveal_secrets'):
            data['value'] = '***'
        return data

    def validate_value(self, value):
        instance = getattr(self, 'instance', None)
        value_type = instance.value_type if instance else self.initial_data.get('value_type')

        if value_type == SystemConfig.ConfigType.BOOL:
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                lowered = value.strip().lower()
                if lowered in {'true', 'false'}:
                    return lowered == 'true'
            raise serializers.ValidationError('Value must be a boolean (true/false).')

        if value_type == SystemConfig.ConfigType.INT:
            if isinstance(value, bool):
                raise serializers.ValidationError('Value must be an integer.')
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                try:
                    return int(value.strip())
                except ValueError:
                    pass
            raise serializers.ValidationError('Value must be an integer.')

        if value_type == SystemConfig.ConfigType.STRING:
            if not isinstance(value, str):
                raise serializers.ValidationError('Value must be a string.')
            return value

        if value_type == SystemConfig.ConfigType.JSON:
            if not isinstance(value, (dict, list)):
                raise serializers.ValidationError('Value must be a JSON object or array.')
            return value

        if value_type == SystemConfig.ConfigType.SECRET:
            if not isinstance(value, str):
                raise serializers.ValidationError('Value must be a string.')
            return value

        raise serializers.ValidationError('Unsupported config value_type.')

    def update(self, instance, validated_data):
        instance.value = validated_data['value']
        instance.save(update_fields=['value', 'updated_at'])
        return instance

    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'value_type', 'category', 'description', 'is_editable', 'is_runtime']
        read_only_fields = ['id', 'key', 'value_type', 'category', 'description', 'is_editable', 'is_runtime']


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'metadata', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationBroadcastSerializer(serializers.Serializer):
    """Admin broadcast payload serializer."""

    type = serializers.ChoiceField(choices=Notification.NotificationType.choices)
    title = serializers.CharField()
    message = serializers.CharField()
    metadata = serializers.JSONField(required=False, allow_null=True)


class AdminNotificationHistorySenderSerializer(serializers.Serializer):
    """Sender projection for admin broadcast history rows."""

    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True, allow_null=True)


class AdminNotificationHistorySerializer(serializers.Serializer):
    """Grouped admin broadcast history row serializer."""

    broadcast_batch_key = serializers.CharField(source='event_key')
    type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    metadata = serializers.JSONField(required=False, allow_null=True)
    recipient_count = serializers.IntegerField(min_value=0)
    sent_at = serializers.DateTimeField()
    sender = serializers.SerializerMethodField()

    def get_sender(self, obj):
        sender_id = obj.get('created_by_id')
        if sender_id is None:
            return None

        payload = {
            'id': sender_id,
            'username': obj.get('created_by__username') or '',
            'email': obj.get('created_by__email'),
        }
        return AdminNotificationHistorySenderSerializer(payload).data


class NotificationUnreadCountSerializer(serializers.Serializer):
    """Unread counter serializer."""

    count = serializers.IntegerField(min_value=0)


class AuditLogSerializer(serializers.ModelSerializer):
    """Audit log serializer"""

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'timestamp',
            'actor_type',
            'actor_id',
            'actor_username',
            'aggregate_type',
            'aggregate_id',
            'action',
            'metadata',
            'ip_address',
            'user_agent',
        ]
        read_only_fields = '__all__'
