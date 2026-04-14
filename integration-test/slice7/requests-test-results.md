# Slice 7 Requests Integration Result

- Base URL: http://localhost:8000
- Total: 54
- Passed: 46
- Failed: 8

| Case | Status | Expected | Actual |
|---|---|---|---|
| I-1.1 | PASS | HTTP 401 | HTTP 401 |
| I-1.2 | PASS | HTTP 401 | HTTP 401 |
| I-1.3 | PASS | HTTP 401 | HTTP 401 |
| I-2.1 | PASS | HTTP 200 | HTTP 200 |
| I-2.2 | PASS | HTTP 403 | HTTP 403 |
| I-2.3 | PASS | HTTP 403 | HTTP 403 |
| I-2.4 | PASS | HTTP 403 | HTTP 403 |
| I-2.5 | PASS | HTTP 403 | HTTP 403 |
| I-2.6 | PASS | HTTP 403 | HTTP 403 |
| I-2.7 | PASS | HTTP 200 | HTTP 200 |
| I-2.8 | FAIL | HTTP 200 | HTTP 404 |
| I-3.1 | PASS | Draft quiz hidden | Draft hidden |
| I-3.2 | PASS | HTTP 404 | HTTP 404 |
| I-3.3 | FAIL | HTTP 403 or empty list | HTTP 200, items=1 |
| I-4.1 | PASS | HTTP 200 | HTTP 200 |
| I-4.2 | PASS | HTTP 200 and includes draft quiz | HTTP 200, found=True |
| II-1.1 | PASS | HTTP 200 | HTTP 200 |
| II-1.2 | PASS | >=3 published quizzes | count=4 |
| II-1.3 | PASS | contains ['description', 'id', 'quiz_point', 'status', 'time_limit_sec', 'title', 'total_questions', 'updated_at'] | keys=['description', 'id', 'quiz_point', 'status', 'tags', 'time_limit_sec', 'title', 'total_questions', 'updated_at'] |
| II-1.4 | PASS | No draft | No draft |
| II-2.1 | PASS | HTTP 200 | HTTP 200 |
| II-2.3 | PASS | HTTP 200 | HTTP 200 |
| II-2.4 | PASS | HTTP 200 | HTTP 200 |
| II-3.1 | PASS | HTTP 200 | HTTP 200 |
| II-3.2 | FAIL | category and tags present | keys=['description', 'id', 'questions', 'quiz_point', 'status', 'tags', 'time_limit_sec', 'title', 'total_questions', 'updated_at'] |
| II-3.5 | PASS | HTTP 404 | HTTP 404 |
| II-4.1 | PASS | HTTP 201 with id | HTTP 201, id=6 |
| II-4.5 | PASS | HTTP 400 | HTTP 400 |
| II-4.6 | FAIL | HTTP 400 | HTTP 201 |
| II-5.1 | PASS | HTTP 200 | HTTP 200 |
| II-5.2 | PASS | title=Updated Quiz Title | title=Updated Quiz Title |
| II-6.1 | PASS | HTTP 204 | HTTP 204 |
| II-6.2 | PASS | HTTP 404 | HTTP 404 |
| II-6.4 | PASS | HTTP 404 | HTTP 404 |
| III-1.1 | PASS | HTTP 200 | HTTP 200 |
| III-1.2 | PASS | >=3 questions | count=3 |
| III-1.8 | PASS | HTTP 403 | HTTP 403 |
| III-2.1 | PASS | HTTP 201 + id | HTTP 201, id=6 |
| III-3.1 | PASS | HTTP 400 | HTTP 400 |
| III-3.2 | PASS | HTTP 400 | HTTP 400 |
| III-3.5 | PASS | HTTP 400 | HTTP 400 |
| III-3.7 | PASS | HTTP 400 | HTTP 400 |
| III-4.1 | PASS | HTTP 200 | HTTP 200 |
| III-4.2 | PASS | score=15 | score=15 |
| III-5.1 | PASS | HTTP 204 | HTTP 204 |
| IV-1.1 | PASS | HTTP 200 | HTTP 200 |
| IV-1.2 | PASS | id not null | id=1 |
| IV-2.1 | PASS | HTTP 200 | HTTP 200 |
| IV-2.2 | PASS | max_attempt=5 | max_attempt=5 |
| IV-3.1 | FAIL | HTTP 200 | HTTP 404 |
| V-1.1 | FAIL | HTTP 201 + id | HTTP 403, id=None |
| V-1.6 | FAIL | HTTP 200 | HTTP 403 |
| V-1.7 | PASS | HTTP 403 | HTTP 403 |
| V-2.4 | FAIL | HTTP 404 | HTTP 403 |
