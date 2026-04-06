# Slice 8 Task 8.1 User Profile API

## Summary
Implemented the Task 8.1 backend User Profile API in `backend/api/views/users.py` with serializer support in `backend/api/serializers.py` and focused endpoint tests in `backend/api/test_profile_task8_1.py`.

## Completed Items
- Added authenticated `/api/users/me/profile/` GET and PATCH behavior.
- Added authenticated `/api/users/me/settings/` PATCH behavior.
- Added authenticated `/api/users/me/account/` PATCH behavior with uniqueness validation.
- Added authenticated `/api/users/me/activity/` GET behavior.
- Added public `/api/users/{username}/profile/` GET behavior.
- Added public `/api/users/{username}/activity/` GET behavior.
- Added auto-create profile guard for users without `UserProfile`.
- Added endpoint tests covering happy path, validation failures, authentication, and 404 cases.

## Key Implementations
1. Split profile-related payload handling into dedicated serializers to prevent mass assignment.
2. Added a deterministic activity projection helper that combines completed lesson, challenge, and quiz progress into one ordered feed.
3. Preserved the existing `UserViewSet` route structure while adding the new Task 8.1 actions.
4. Updated API reference and slice status documentation to reflect the new contract.
5. Verified the focused test suite with pytest.

## Files Changed
- `backend/api/serializers.py`
- `backend/api/views/users.py`
- `backend/api/test_profile_task8_1.py`
- `docs/API.md`
- `docs/STATUS.md`
- `plan/feature-user-profile-task8-1-user-profile-api-1.md`

## Verification
- Ran `pytest api/test_profile_task8_1.py -q` from `backend/`.
- Result: 9 passed.

## Caveats
- Activity feed currently aggregates from existing progress tables and does not introduce a new event store.
- A pytest warning about `asyncio_mode` remains in the environment and is unrelated to this task.
