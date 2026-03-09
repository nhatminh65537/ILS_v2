"""
Leaderboard Service
Handles ranking calculations and leaderboard updates
"""
from django.db.models import Sum, Count, F
from typing import List, Dict


class LeaderboardService:
    """
    Service for computing and managing leaderboards
    """
    
    @classmethod
    def update_user_rank(cls, user):
        """
        Update user's rank on all leaderboards
        Called when user completes content and gains points
        """
        profile = user.profile
        
        # Update learning points rank
        profile.rank_lpoint = cls.get_user_rank_by_lpoint(user)
        
        # Update challenge points rank
        profile.rank_cpoint = cls.get_user_rank_by_cpoint(user)
        
        # Update quiz points rank
        profile.rank_qpoint = cls.get_user_rank_by_qpoint(user)
        
        profile.save()
    
    @classmethod
    def get_user_rank_by_lpoint(cls, user) -> int:
        """Get user's rank by learning points"""
        from api.models import UserProfile
        
        rank = UserProfile.objects.filter(
            total_lpoint__gt=user.profile.total_lpoint
        ).count() + 1
        
        return rank
    
    @classmethod
    def get_user_rank_by_cpoint(cls, user) -> int:
        """Get user's rank by challenge points"""
        from api.models import UserProfile
        
        rank = UserProfile.objects.filter(
            total_cpoint__gt=user.profile.total_cpoint
        ).count() + 1
        
        return rank
    
    @classmethod
    def get_user_rank_by_qpoint(cls, user) -> int:
        """Get user's rank by quiz points"""
        from api.models import UserProfile
        
        rank = UserProfile.objects.filter(
            total_qpoint__gt=user.profile.total_qpoint
        ).count() + 1
        
        return rank
    
    @classmethod
    def get_leaderboard(cls, board_type: str, limit: int = 50) -> List[Dict]:
        """
        Get leaderboard data
        Args:
            board_type: 'lpoint', 'cpoint', or 'qpoint'
            limit: Number of top users to return
        Returns:
            List of user data with rank
        """
        from api.models import UserProfile, User
        
        field_map = {
            'lpoint': 'total_lpoint',
            'cpoint': 'total_cpoint',
            'qpoint': 'total_qpoint'
        }
        
        if board_type not in field_map:
            raise ValueError(f"Invalid board_type: {board_type}")
        
        field = field_map[board_type]
        
        profiles = UserProfile.objects.select_related('user').order_by(
            f'-{field}'
        )[:limit]
        
        leaderboard = []
        for rank, profile in enumerate(profiles, start=1):
            leaderboard.append({
                'rank': rank,
                'user_id': profile.user_id,
                'username': profile.user.username,
                'points': getattr(profile, field),
                'avatar_url': profile.avatar_url
            })
        
        return leaderboard
    
    @classmethod
    def update_all_ranks(cls):
        """
        Batch update all user ranks
        Should be called periodically or after bulk updates
        """
        from api.models import User
        
        for user in User.objects.all():
            cls.update_user_rank(user)
