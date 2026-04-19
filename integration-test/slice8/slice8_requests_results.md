# Slice 8 Requests Integration Results

- Base URL: http://localhost:8000
- Total: 75
- Passed: 73
- Failed: 2

| Case ID | Status | Title | Expected | Actual |
|---|---|---|---|---|
| I-1.1 | PASS | GET /api/users/me/profile/ unauthenticated | HTTP 401 | HTTP 401 |
| I-1.2 | PASS | PATCH /api/users/me/settings/ unauthenticated | HTTP 401 | HTTP 401 |
| I-1.3 | PASS | GET /api/users/me/activity/ unauthenticated | HTTP 401 | HTTP 401 |
| I-1.4 | PASS | GET /api/admin/users/ unauthenticated | HTTP 401 | HTTP 401 |
| I-1.5 | PASS | GET /api/auth/sessions/ unauthenticated | HTTP 401 | HTTP 401 |
| I-1.6 | PASS | GET /api/users/member1/profile/ public | HTTP 200 | HTTP 200 |
| I-1.7 | PASS | GET /api/users/member1/activity/ public | HTTP 200 | HTTP 200 |
| I-2.1 | PASS | Member cannot GET /api/admin/users/ | HTTP 403 | HTTP 403 |
| I-2.2 | PASS | Member cannot POST /api/admin/users/ | HTTP 403 | HTTP 403 |
| I-2.3 | PASS | Member cannot GET /api/admin/users/{id}/ | HTTP 403 | HTTP 403 |
| I-2.4 | PASS | Member cannot PATCH /api/admin/users/{id}/ | HTTP 403 | HTTP 403 |
| I-3.1 | PASS | Admin can GET /api/admin/users/ | HTTP 200 | HTTP 200 |
| I-3.2 | PASS | Admin can GET /api/admin/users/{member1_id}/ | HTTP 200 | HTTP 200 |
| I-4.1 | PASS | Member1 sees only own sessions | HTTP 200 with own session ids | HTTP 200, count=12 |
| I-4.2 | PASS | Member1 cannot revoke member2 session | HTTP 404 | HTTP 404 |
| II-1.1 | PASS | GET /api/users/me/profile/ | HTTP 200 | HTTP 200 |
| II-1.2 | PASS | Me profile has expected username | username=member1 | username=member1 |
| II-1.3 | PASS | Sensitive fields not exposed | No password/refresh_token_hash | keys=['avatar_url', 'bio', 'challenge_completed', 'course_completed', 'display_name', 'entry_year', 'language', 'last_active_at', 'location', 'quiz_completed', 'theme', 'timezone', 'total_challenge_point', 'total_learning_point', 'total_quiz_point', 'user_id', 'username', 'website'] |
| II-2.1 | PASS | PATCH /api/users/me/profile/ valid | HTTP 200 | HTTP 200 |
| II-2.2 | PASS | Profile fields updated | display_name and entry_year updated | display_name=Updated Name, entry_year=2025 |
| II-2.3 | PASS | entry_year validation behavior | HTTP 200 or 400 | HTTP 200 |
| II-2.4 | PASS | PATCH profile with nullable display_name | HTTP 200 | HTTP 200 |
| II-3.1 | PASS | PATCH /api/users/me/settings/ valid | HTTP 200 | HTTP 200 |
| II-3.2 | PASS | Settings updated | language=en and theme=light | language=en, theme=light |
| II-3.3 | PASS | PATCH settings invalid language | HTTP 400 | HTTP 400 |
| II-3.4 | PASS | PATCH settings invalid theme | HTTP 400 | HTTP 400 |
| II-4.1 | PASS | PATCH account username to member1_new | HTTP 200 and username changed | HTTP 200, username=member1_new |
| II-4.2 | PASS | PATCH account duplicate username | HTTP 400 | HTTP 400 |
| II-4.3 | PASS | PATCH account duplicate email | HTTP 400 | HTTP 400 |
| II-4.4 | PASS | PATCH account with empty body | HTTP 400 | HTTP 400 |
| II-4.5 | PASS | Restore username to member1 | HTTP 200 and username restored | HTTP 200, username=member1 |
| III-1.1 | PASS | Public profile member1 | HTTP 200 | HTTP 200 |
| III-1.2 | PASS | Public profile hides private fields | No email/language/theme/timezone | keys=['avatar_url', 'bio', 'challenge_completed', 'course_completed', 'display_name', 'entry_year', 'last_active_at', 'location', 'quiz_completed', 'total_challenge_point', 'total_learning_point', 'total_quiz_point', 'username', 'website'] |
| III-1.3 | PASS | Public profile member2 | HTTP 200 | HTTP 200 |
| III-1.4 | PASS | Member2 minimal profile has null display_name | display_name is null | display_name=None |
| III-1.5 | PASS | Public profile nonexistent user | HTTP 404 | HTTP 404 |
| III-1.6 | PASS | Disabled user public profile behavior | HTTP 200 or 404 | HTTP 404 |
| IV-1.1 | PASS | GET /api/users/me/activity/ | HTTP 200 | HTTP 200 |
| IV-1.2 | FAIL | Member1 has 6 seeded events | 6 events | count=0 |
| IV-1.3 | PASS | Events sorted by timestamp desc | Sorted desc by timestamp | Sorted |
| IV-2.1 | PASS | Public activity member1 | HTTP 200 | HTTP 200 |
| IV-2.2 | PASS | Public activity equals me activity count | same event count | public=0, me=0 |
| IV-2.3 | PASS | Public activity member2 | HTTP 200 | HTTP 200 |
| IV-2.4 | PASS | Member2 has no activity | [] | count=0 |
| IV-2.5 | PASS | Public activity nonexistent user | HTTP 404 | HTTP 404 |
| V-1.1 | PASS | GET /api/admin/users/ | HTTP 200 | HTTP 200 |
| V-1.2 | PASS | Admin list response is paginated | contains count/results | keys=['count', 'next', 'previous', 'results'] |
| V-1.3 | FAIL | Admin list includes seeded users | >=6 users | count=5 |
| V-2.1 | PASS | Admin filter is_active=false | HTTP 200 | HTTP 200 |
| V-2.2 | PASS | Inactive filter returns disableduser | all users inactive | items=0 |
| V-2.3 | PASS | Admin filter invalid is_active | HTTP 400 | HTTP 400 |
| V-2.4 | PASS | Admin filter invalid date | HTTP 400 | HTTP 400 |
| V-3.1 | PASS | GET /api/admin/users/{member1_id}/ | HTTP 200 | HTTP 200 |
| V-3.2 | PASS | Admin detail includes profile and roles | profile object and roles list | profile_type=dict, roles_type=list |
| V-3.3 | PASS | Admin detail does not expose password | password not present | keys=['date_joined', 'email', 'first_name', 'id', 'is_active', 'is_staff', 'is_superuser', 'last_login', 'last_name', 'profile', 'roles', 'username'] |
| V-4.1 | PASS | Admin create user with password | HTTP 201 | HTTP 201 |
| V-4.2 | PASS | Admin create user without password | HTTP 201 | HTTP 201 |
| V-4.3 | PASS | Admin create duplicate username | HTTP 400 | HTTP 400 |
| V-4.4 | PASS | Admin create duplicate email | HTTP 400 | HTTP 400 |
| V-4.5 | PASS | Admin create user with invalid role_ids | HTTP 400 | HTTP 400 |
| V-4.6 | PASS | Admin create user with weak password | HTTP 400 | HTTP 400 |
| V-5.1 | PASS | Admin deactivate member2 | HTTP 200 | HTTP 200 |
| V-5.2 | PASS | Member2 old token invalid after deactivate | HTTP 401/403 | HTTP 401 |
| V-5.3 | PASS | Admin reactivate member2 | HTTP 200 | HTTP 200 |
| V-5.4 | PASS | Member2 can login after re-activate | login success | login success |
| VI-1.1 | PASS | GET /api/auth/sessions/ | HTTP 200 | HTTP 200 |
| VI-1.2 | PASS | Member1 has at least 1 active session | session count >= 1 | count=14 |
| VI-1.3 | PASS | Session payload has expected fields and hides hash | expected session fields without refresh_token_hash | valid |
| VI-2.1 | PASS | DELETE /api/auth/sessions/{id}/ returns 204 for valid own id | HTTP 204 | HTTP 204 |
| VI-2.2 | PASS | DELETE nonexistent session | HTTP 404 | HTTP 404 |
| XI-1.1 | PASS | Admin creates e2e user | HTTP 201 | HTTP 201 |
| XI-1.2 | PASS | E2E user login | login success | login success |
| XI-1.3 | PASS | E2E user can access me profile | HTTP 200 | HTTP 200 |
| XI-1.4 | PASS | E2E user updates own profile | HTTP 200 | HTTP 200 |
| XI-1.5 | PASS | Public profile reflects E2E update | HTTP 200 and display_name=E2E Updated | HTTP 200, display_name=E2E Updated |
