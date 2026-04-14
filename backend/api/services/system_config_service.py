from api.utils import invalidate_config_cache


class SystemConfigService:
    """Domain operations for system config view flows."""

    @staticmethod
    def group_by_category(configs, serializer_factory):
        grouped = {}
        for config in configs:
            category = config.category or 'uncategorized'
            grouped.setdefault(category, []).append(serializer_factory(config).data)
        return grouped

    @staticmethod
    def update_config(instance, serializer):
        serializer.save()
        invalidate_config_cache(instance.key)
        return serializer.data