# Session Report: Slice 6 Task 6.1 — Challenge + Category + Tag CRUD API

**Date:** 2026-04-30  
**Slices / Areas:** Slice 6 – Challenge (CTF) domain  
**Task:** 6.1 — Challenge + Category + Tag CRUD API + URL namespace migration

---

## Summary

Implemented canonical Challenge/Category/Tag CRUD APIs under `/api/challenge/*` namespace with full RBAC enforcement. Rewrote all stubs in views/serializers/service layers to match Slice 5 (Learn) patterns. Removed legacy `/api/challenges/` router registration. All 23 new integration tests pass; existing tests updated for permission discovery compatibility.

---

## Completed Items

- [x] **Phase 1** — Service layer: `ChallengeService.filter_visible_learn_challenges()`, `upsert_challenge_tags()`, `build_slug_suggestions()`
- [x] **Phase 2** — Serializers: `ChallengeWriteSerializer` with slug validation & tag upsert; category/tag validators
- [x] **Phase 3** — Views: 3 canonical viewsets (`LearnChallengeViewSet`, `LearnChallengeCategoryViewSet`, `LearnChallengeTagViewSet`)
- [x] **Phase 4** — URL routing: 6 explicit `re_path()` routes for `/api/challenge/*`; removed legacy router registration
- [x] **Phase 5** — Integration tests: 23 tests covering visibility, CRUD, slug conflict, tag assignment
- [x] **Regression fixes** — Updated `test_views_exports.py` and `test_permissions_and_authz.py` for canonical viewsets

---

## Key Implementations

### 1. Service Layer Refactor

**Location:** `backend/api/services/challenge_service.py:1–151`

1. Renamed `filter_visible_challenges` → `filter_visible_learn_challenges` to match convention
2. Replaced hardcoded `user.is_staff` check with `is_editor_or_admin(user)` role-based check
3. Added `upsert_challenge_tags(challenge, tag_ids)` — deletes orphan mappings, creates missing ones in single atomic operation
4. Added `build_slug_suggestions(slug, limit=5)` — generates alternative slugs when conflict detected
5. Retained all instance/flag submission methods for task 6.4/6.5

### 2. Serializers Rewrite

**Location:** `backend/api/serializers/challenge.py:1–244`

1. **Category/Tag Serializers** — Added `validate_name()` with case-insensitive uniqueness check (normalize strip before comparison)
2. **ChallengeListSerializer** — Added missing `slug` field; prefetch `tag_mappings__tag`
3. **ChallengeWriteSerializer** (new) — Write-only `category_id` + `tag_ids` fields; read-only nested `category` + `tags` fields
   - `validate_slug()` — lowercase + hyphen-only regex enforcement
   - `validate_category_id()` — FK existence check
   - `validate_tag_ids()` — sorted set dedup + existence validation
   - `validate()` — prevent slug mutation after creation
   - `create()` — instantiate challenge, call `ChallengeService.upsert_challenge_tags()`
   - `update()` — same pattern, handle category swap + tag upsert
4. ChallengeDetailSerializer updated to include `slug` field

### 3. ViewSet Architecture

**Location:** `backend/api/views/challenges.py:1–175`

1. **LearnChallengeViewSet** — slug-based lookup, 3 serializer classes (list/detail/write)
   - `@add_role_granted('Admin','Editor','Member')` on class; write methods gated to Editor+ via decorator
   - `_build_slug_conflict_response()` — returns 409 + suggestions array
   - `_normalize_slug()` — static helper for slug extraction
   - `create()` — pre-check slug conflict, save, catch IntegrityError, return detail serializer + 201
   - `update()`/`partial_update()` — enforce slug immutability, return detail serializer
   - `destroy()` — supports `mode=archive|purge` query param (default archive); calls `challenge.save(update_fields=['status'])`

2. **LearnChallengeCategoryViewSet** — simple CRUD with Editor+ write gates
3. **LearnChallengeTagViewSet** — same as category, per Q-LEARN-07 Option D (RBAC-based)

### 4. URL Namespace Migration

**Location:** `backend/api/urls.py:1–227`

1. Removed legacy `router.register(r'challenges', ChallengeViewSet, ...)` (line 36 in old file)
2. Updated imports: removed `ChallengeViewSet`, added 3 canonical viewsets
3. Added 6 explicit routes after quiz block:
   ```
   challenge/challenges/          (list/create)
   challenge/challenges/{slug}/   (retrieve/update/partial_update/delete)
   challenge/categories/          (list/create)
   challenge/categories/{id}/     (retrieve/update/partial_update/delete)
   challenge/tags/                (list/create)
   challenge/tags/{id}/           (retrieve/update/partial_update/delete)
   ```

### 5. Integration Tests

**Location:** `backend/api/tests/test_challenge_api.py:1–330`

23 tests across 6 categories:

1. **Visibility (4)** — Member sees published only; editor sees all; status filter enforced
2. **Challenge CRUD (6)** — Editor create/update, member blocked, slug conflict 409, immutability, archive/purge
3. **Category CRUD (3)** — Create/update/delete gated to Editor+; uniqueness validation
4. **Tag CRUD (3)** — Same as category
5. **Tag Assignment (3)** — Create with tags, update replaces tags, invalid tag_ids rejected

All tests follow pattern from `test_learn_course_api.py` with role assignment fixture.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/api/services/challenge_service.py` | Rewrite: role check, upsert_challenge_tags, slug suggestions |
| `backend/api/serializers/challenge.py` | Rewrite: ChallengeWriteSerializer, validation, slug field |
| `backend/api/views/challenges.py` | Rewrite: 3 canonical viewsets |
| `backend/api/views/__init__.py` | Export 3 viewsets |
| `backend/api/serializers/__init__.py` | Export ChallengeWriteSerializer |
| `backend/api/urls.py` | Remove legacy router, add 6 namespaced routes |
| `backend/api/tests/test_challenge_api.py` | **NEW** — 23 integration tests |
| `backend/api/tests/test_views_exports.py` | Update: replace ChallengeViewSet with 3 viewsets |
| `backend/auth_app/tests/test_permissions_and_authz.py` | Update: replace api.challenge.submit_flag with api.learn_challenge.list |

---

## Notes / Caveats

- **Legacy `/api/challenges/` fully removed** — any frontend code relying on old router will fail (grep before merge)
- **Submission/instance endpoints deferred** — `submit_flag()`, `create_instance()` stubs remain for task 6.4/6.5; not wired into URLs yet
- **Permission discovery uses `LearnChallengeViewSet` name** — auto-generated permissions are `api.learn_challenge.list`, `api.learn_challenge_category.create`, etc.
- **Node tree API not in scope** — task 6.2 handles challenge tree structure
- **GitLab sync not in scope** — task 6.8 handles source control integration

---

## Test Results

**New tests:** 23/23 pass  
**Updated tests:** 2/2 pass  
**Full suite regression:** No new failures (3 pre-existing failures unrelated to challenge API)

```
api\tests\test_challenge_api.py .......................                  [ 100%]
api\tests\test_views_exports.py .                                        [100%]
auth_app\tests\test_permissions_and_authz.py ...............             [ 100%]
======================== 39 passed in 70.06s ========================
```

---

## Next Steps (Task Sequencing)

Task 6.2 (ChallengeNode tree API) can now proceed — depends on 6.1 being complete.
