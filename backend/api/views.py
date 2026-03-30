"""
API Views
Handles HTTP requests and responses for all endpoints
"""
from rest_framework import viewsets, status, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import (
    User, UserProfile, Course, CourseNode, Lesson,
    Challenge, ChallengeNode, ChallengeInstance,
    Quiz, QuizNode, QuizQuestion,
    UserCourseProgress, UserLessonProgress,
    UserChallengeProgress, UserChallengeSubmit,
    UserQuizAttempt, UserQuizAnswer,
    Notification, SystemConfig, Role, Permission
)

from .serializers import (
    UserSerializer, UserCreateSerializer, UserProfileSerializer,
    CourseListSerializer, CourseDetailSerializer, CourseNodeSerializer,
    LessonSerializer,
    ChallengeListSerializer, ChallengeDetailSerializer,
    ChallengeFlagSubmitSerializer, ChallengeInstanceSerializer,
    QuizListSerializer, QuizDetailSerializer, QuizQuestionSerializer,
    QuizAnswerSubmitSerializer, UserQuizAttemptSerializer,
    NotificationSerializer, SystemConfigSerializer,
    RoleSerializer, PermissionSerializer,
    UserCourseProgressSerializer, UserChallengeProgressSerializer
)

from .services.permission_service import PermissionService
from .services.flag_validation_service import FlagValidationService
from .services.leaderboard_service import LeaderboardService
from .utils import invalidate_config_cache
from auth_app.permissions import add_role_granted


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that includes permissions in token payload
    """
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Add user info to response
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.get(username=request.data.get('username'))
        
        response.data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }
        
        return response


# ============================================================================
# USER VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class UserViewSet(viewsets.ModelViewSet):
    """User management viewset"""
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user profile"""
        profile = request.user.profile
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user profile"""
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# COURSE VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class CourseViewSet(viewsets.ModelViewSet):
    """Course management viewset"""
    
    def get_queryset(self):
        queryset = Course.objects.all()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            # Non-staff can only see published courses
            queryset = queryset.filter(status=Course.Status.PUBLISHED)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.select_related('category')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer
    
    @action(detail=True, methods=['get'])
    def tree(self, request, pk=None):
        """Get course tree structure"""
        course = self.get_object()
        nodes = CourseNode.objects.filter(
            course=course,
            parent__isnull=True
        ).prefetch_related('children', 'lesson')
        
        serializer = CourseNodeSerializer(nodes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get user's progress for this course"""
        course = self.get_object()
        progress, _ = UserCourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        serializer = UserCourseProgressSerializer(progress)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Enroll in a course"""
        course = self.get_object()
        progress, created = UserCourseProgress.objects.get_or_create(
            user=request.user,
            course=course
        )
        if created:
            progress.started_at = timezone.now()
            progress.save()
        
        return Response({'message': 'Enrolled successfully'})


@add_role_granted('Admin', 'Editor', 'Member')
class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """Lesson viewset (read-only for users)"""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark lesson as completed"""
        lesson = self.get_object()
        lesson.mark_completed(request.user)
        
        return Response({'message': 'Lesson marked as completed'})
    
    @action(detail=True, methods=['get'])
    def render(self, request, pk=None):
        """Get rendered lesson content"""
        lesson = self.get_object()
        rendered = lesson.render()
        return Response({'content': rendered})


# ============================================================================
# CHALLENGE VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class ChallengeViewSet(viewsets.ModelViewSet):
    """Challenge management viewset"""
    
    def get_queryset(self):
        queryset = Challenge.objects.all()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status=Challenge.Status.PUBLISHED)
        
        # Filter by difficulty
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.select_related('category')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChallengeDetailSerializer
        return ChallengeListSerializer
    
    @action(detail=True, methods=['post'])
    def submit_flag(self, request, pk=None):
        """Submit a flag for validation"""
        challenge = self.get_object()
        serializer = ChallengeFlagSubmitSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        submitted_flag = serializer.validated_data['flag']
        
        # Check if user has an instance for this challenge
        instance_flag_hash = None
        if challenge.instance_required:
            try:
                instance = ChallengeInstance.objects.get(
                    user=request.user,
                    challenge=challenge,
                    status=ChallengeInstance.InstanceStatus.RUNNING
                )
                instance_flag_hash = instance.flag_value
            except ChallengeInstance.DoesNotExist:
                return Response(
                    {'error': 'No running instance found for this challenge'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate flag
        challenge_flag = challenge.flags.first()
        if not challenge_flag:
            return Response(
                {'error': 'No flag configured for this challenge'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_correct = challenge_flag.validate_submission(submitted_flag, instance_flag_hash)
        
        # Record submission
        UserChallengeSubmit.objects.create(
            user=request.user,
            challenge=challenge,
            submitted_flag=submitted_flag,
            is_correct=is_correct
        )
        
        # If correct, mark as completed and award points
        if is_correct:
            progress, _ = UserChallengeProgress.objects.get_or_create(
                user=request.user,
                challenge=challenge
            )
            if not progress.completed_at:
                progress.completed_at = timezone.now()
                progress.save()
                
                # Award points
                profile = request.user.profile
                profile.total_challenge_point += challenge.challenge_point
                profile.save()
                profile.update_leaderboard_rank()
                
                # Create notification
                Notification.objects.create(
                    user=request.user,
                    type=Notification.NotificationType.CHALLENGE,
                    title='Challenge Solved!',
                    message=f'You solved: {challenge.title}',
                    metadata={'challenge_id': challenge.id}
                )
        
        return Response({
            'correct': is_correct,
            'message': 'Correct! Challenge solved!' if is_correct else 'Incorrect flag'
        })
    
    @action(detail=True, methods=['post'])
    def create_instance(self, request, pk=None):
        """Create a new instance for this challenge"""
        challenge = self.get_object()
        
        if not challenge.instance_required:
            return Response(
                {'error': 'This challenge does not require an instance'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for existing running instance
        existing = ChallengeInstance.objects.filter(
            user=request.user,
            challenge=challenge,
            status=ChallengeInstance.InstanceStatus.RUNNING
        ).first()
        
        if existing:
            serializer = ChallengeInstanceSerializer(existing)
            return Response(serializer.data)
        
        # Create new instance
        instance = ChallengeInstance.objects.create(
            user=request.user,
            challenge=challenge
        )
        
        # Start the instance
        try:
            instance.start()
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        serializer = ChallengeInstanceSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# QUIZ VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class QuizViewSet(viewsets.ModelViewSet):
    """Quiz management viewset"""
    
    def get_queryset(self):
        queryset = Quiz.objects.all()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status=Quiz.Status.PUBLISHED)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizListSerializer
    
    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        """Start a new quiz attempt"""
        quiz = self.get_object()
        
        # Create attempt
        attempt = UserQuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            config=request.data.get('config', {})
        )
        
        serializer = UserQuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit answer for a question"""
        quiz = self.get_object()
        serializer = QuizAnswerSubmitSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        question_id = serializer.validated_data['question_id']
        answer_data = serializer.validated_data['answer_data']
        
        question = get_object_or_404(QuizQuestion, id=question_id, quiz=quiz)
        
        # Validate and score answer
        score_obtained = question.score_answer(answer_data)
        is_correct = score_obtained > 0
        
        return Response({
            'correct': is_correct,
            'score': score_obtained,
            'explanation': question.explanation if is_correct else None
        })


# ============================================================================
# NOTIFICATION VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Notification viewset"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            Q(user=self.request.user) | Q(is_broadcast=True)
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Marked as read'})


# ============================================================================
# LEADERBOARD VIEWS
# ============================================================================

@add_role_granted('Admin', 'Editor', 'Member')
class LeaderboardViewSet(viewsets.ViewSet):
    """Leaderboard viewset"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get leaderboard"""
        board_type = request.query_params.get('type', 'lpoint')
        limit = int(request.query_params.get('limit', 50))
        
        data = LeaderboardService.get_leaderboard(board_type, limit)
        return Response(data)


# ============================================================================
# SYSTEM CONFIGURATION VIEWS
# ============================================================================

@add_role_granted('Admin')
class SystemConfigViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """System configuration viewset"""
    serializer_class = SystemConfigSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'key'
    lookup_url_kwarg = 'key'
    lookup_value_regex = '[^/]+'
    
    def get_queryset(self):
        return SystemConfig.objects.all().order_by('category', 'key')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        grouped = {}

        for config in queryset:
            category = config.category or 'uncategorized'
            grouped.setdefault(category, []).append(self.get_serializer(config).data)

        return Response(grouped)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_editable:
            return Response(
                {'detail': 'Config is not editable'},
                status=status.HTTP_403_FORBIDDEN,
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Keep config reads consistent after runtime updates.
        invalidate_config_cache(instance.key)

        return Response(serializer.data)

