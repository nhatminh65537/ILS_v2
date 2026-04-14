#!/usr/bin/env python3
"""Slice 7 integration checks for HTTP APIs (curl-equivalent cases).

Covers sections I-V from docs/intests/2026-04-14_slice7-integration.md.
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import requests

BASE_URL = "http://localhost:8000"


@dataclass
class TestResult:
    case_id: str
    title: str
    status: str
    expected: str
    actual: str
    detail: str = ""


class Slice7RequestsRunner:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.s = requests.Session()
        self.results: list[TestResult] = []
        self.tokens: dict[str, str] = {}
        self.quiz_ids: dict[str, int] = {}
        self.created_quiz_id: int | None = None
        self.created_question_id: int | None = None

    def run(self) -> int:
        try:
            self._bootstrap()
            self._section_i_auth_rbac()
            self._section_ii_quiz_crud()
            self._section_iii_question_crud()
            self._section_iv_config_progress()
            self._section_v_node_tree()
        except Exception as exc:
            self._record(
                "RUNNER",
                "Unexpected runner exception",
                False,
                "Runner completes",
                f"Exception: {type(exc).__name__}",
                str(exc),
            )

        self._write_report()
        self._print_summary()
        return 0 if self._failed_count() == 0 else 1

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _headers(self, token: str | None = None) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        token: str | None = None,
        data: Any | None = None,
        params: dict[str, Any] | None = None,
    ) -> requests.Response:
        return self.s.request(
            method=method,
            url=self._url(path),
            headers=self._headers(token),
            json=data,
            params=params,
            timeout=20,
        )

    def _response_json(self, resp: requests.Response) -> Any:
        try:
            return resp.json()
        except Exception:
            return None

    def _extract_items(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            if isinstance(payload.get("results"), list):
                return payload["results"]
            if isinstance(payload.get("data"), list):
                return payload["data"]
        return []

    def _record(
        self,
        case_id: str,
        title: str,
        passed: bool,
        expected: str,
        actual: str,
        detail: str = "",
    ) -> None:
        self.results.append(
            TestResult(
                case_id=case_id,
                title=title,
                status="PASS" if passed else "FAIL",
                expected=expected,
                actual=actual,
                detail=detail,
            )
        )

    def _check_status(
        self,
        case_id: str,
        title: str,
        resp: requests.Response,
        expected_status: int,
        detail: str = "",
    ) -> bool:
        ok = resp.status_code == expected_status
        self._record(
            case_id,
            title,
            ok,
            f"HTTP {expected_status}",
            f"HTTP {resp.status_code}",
            detail,
        )
        return ok

    def _bootstrap(self) -> None:
        # Ensure backend is reachable.
        health = self._request("GET", "/api/quiz/quizzes/")
        if health.status_code not in (200, 401, 403):
            raise RuntimeError(
                f"Backend not ready: GET /api/quiz/quizzes/ returned {health.status_code}"
            )

        self.tokens["member1"] = self._login("member1", "member1234")
        self.tokens["editor1"] = self._login("editor1", "editor1234")
        self.tokens["admin"] = self._login("admin", "admin1234")

        # Discover quiz IDs from seeded titles if available.
        r = self._request("GET", "/api/quiz/quizzes/", token=self.tokens["editor1"])
        payload = self._response_json(r)
        items = self._extract_items(payload)
        for item in items:
            title = item.get("title")
            if title:
                self.quiz_ids[title] = int(item["id"])

    def _login(self, username: str, password: str) -> str:
        # Support current endpoint and legacy endpoint in checklist.
        for path in ("/api/auth/login/", "/api/auth/token/"):
            resp = self._request(
                "POST",
                path,
                data={"username": username, "password": password},
            )
            if resp.status_code in (200, 201):
                body = self._response_json(resp) or {}
                access = body.get("access")
                if access:
                    return access
        raise RuntimeError(f"Cannot obtain token for user={username}")

    def _require_quiz_id(self, title: str) -> int | None:
        return self.quiz_ids.get(title)

    def _section_i_auth_rbac(self) -> None:
        # I-1: unauthenticated
        self._check_status(
            "I-1.1",
            "GET /api/quiz/quizzes/ unauthenticated",
            self._request("GET", "/api/quiz/quizzes/"),
            401,
        )
        self._check_status(
            "I-1.2",
            "POST /api/quiz/quizzes/ unauthenticated",
            self._request("POST", "/api/quiz/quizzes/", data={"title": "x"}),
            401,
        )
        self._check_status(
            "I-1.3",
            "GET /api/quiz/nodes/ unauthenticated",
            self._request("GET", "/api/quiz/nodes/"),
            401,
        )

        member = self.tokens["member1"]
        editor = self.tokens["editor1"]

        # I-2
        r = self._request("GET", "/api/quiz/quizzes/", token=member)
        self._check_status("I-2.1", "Member can list quizzes", r, 200)

        self._check_status(
            "I-2.2",
            "Member cannot create quiz",
            self._request("POST", "/api/quiz/quizzes/", token=member, data={"title": "hack"}),
            403,
        )

        quiz1 = self._require_quiz_id("OWASP Basics Quiz") or 1
        self._check_status(
            "I-2.3",
            "Member cannot patch quiz",
            self._request("PATCH", f"/api/quiz/quizzes/{quiz1}/", token=member, data={"title": "hack"}),
            403,
        )
        self._check_status(
            "I-2.4",
            "Member cannot delete quiz",
            self._request("DELETE", f"/api/quiz/quizzes/{quiz1}/", token=member),
            403,
        )
        self._check_status(
            "I-2.5",
            "Member cannot get questions management endpoint",
            self._request("GET", f"/api/quiz/quizzes/{quiz1}/questions/", token=member),
            403,
        )
        self._check_status(
            "I-2.6",
            "Member cannot post questions",
            self._request(
                "POST",
                f"/api/quiz/quizzes/{quiz1}/questions/",
                token=member,
                data={"question_type": "single_choice", "content": {"text": "x"}, "score": 1, "options": []},
            ),
            403,
        )

        self._check_status(
            "I-2.7",
            "Member can get own quiz config",
            self._request("GET", f"/api/quiz/quizzes/{quiz1}/config/", token=member),
            200,
        )

        progress_resp = self._request("GET", f"/api/quiz/quizzes/{quiz1}/progress/", token=member)
        self._record(
            "I-2.8",
            "Member get progress endpoint",
            progress_resp.status_code == 200,
            "HTTP 200",
            f"HTTP {progress_resp.status_code}",
            "If this fails with 404, route may be missing although view action exists.",
        )

        # I-3 draft visibility
        r = self._request("GET", "/api/quiz/quizzes/", token=member)
        payload = self._response_json(r)
        items = self._extract_items(payload)
        has_draft_title = any(i.get("title") == "Advanced Forensics" for i in items)
        self._record(
            "I-3.1",
            "Member list does not include draft quiz",
            not has_draft_title,
            "Draft quiz hidden",
            "Draft visible" if has_draft_title else "Draft hidden",
        )

        quiz4 = self._require_quiz_id("Advanced Forensics") or 4
        self._check_status(
            "I-3.2",
            "Member cannot retrieve draft quiz detail",
            self._request("GET", f"/api/quiz/quizzes/{quiz4}/", token=member),
            404,
        )

        r = self._request("GET", "/api/quiz/quizzes/", token=member, params={"status": "draft"})
        payload = self._response_json(r)
        items = self._extract_items(payload)
        self._record(
            "I-3.3",
            "Member cannot effectively filter draft",
            (r.status_code == 403) or (r.status_code == 200 and len(items) == 0),
            "HTTP 403 or empty list",
            f"HTTP {r.status_code}, items={len(items)}",
        )

        # I-4 editor CRUD access checks
        self._check_status(
            "I-4.1",
            "Editor can list quizzes",
            self._request("GET", "/api/quiz/quizzes/", token=editor),
            200,
        )
        r = self._request("GET", "/api/quiz/quizzes/", token=editor, params={"status": "draft"})
        items = self._extract_items(self._response_json(r))
        found = any(i.get("title") == "Advanced Forensics" for i in items)
        self._record(
            "I-4.2",
            "Editor can filter draft quizzes",
            r.status_code == 200 and found,
            "HTTP 200 and includes draft quiz",
            f"HTTP {r.status_code}, found={found}",
        )

    def _section_ii_quiz_crud(self) -> None:
        member = self.tokens["member1"]
        editor = self.tokens["editor1"]

        # II-1 member list basic checks
        r = self._request("GET", "/api/quiz/quizzes/", token=member)
        items = self._extract_items(self._response_json(r))
        self._record("II-1.1", "Member list status", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")
        self._record(
            "II-1.2",
            "Member list has at least seeded published quizzes",
            len(items) >= 3,
            ">=3 published quizzes",
            f"count={len(items)}",
        )
        if items:
            required = {"id", "title", "description", "status", "quiz_point", "total_questions", "time_limit_sec", "updated_at"}
            sample = set(items[0].keys())
            self._record(
                "II-1.3",
                "List item structure",
                required.issubset(sample),
                f"contains {sorted(required)}",
                f"keys={sorted(sample)}",
            )

        has_draft = any(i.get("status") == "draft" or i.get("title") == "Advanced Forensics" for i in items)
        self._record("II-1.4", "Member list excludes draft", not has_draft, "No draft", "Draft found" if has_draft else "No draft")

        # II-2 editor filter
        for status_value, case_id in (("draft", "II-2.1"), ("published", "II-2.3"), ("archived", "II-2.4")):
            r = self._request("GET", "/api/quiz/quizzes/", token=editor, params={"status": status_value})
            self._record(case_id, f"Editor filter status={status_value}", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")

        # II-3 detail
        quiz1 = self._require_quiz_id("OWASP Basics Quiz") or 1
        r = self._request("GET", f"/api/quiz/quizzes/{quiz1}/", token=member)
        body = self._response_json(r) or {}
        self._record("II-3.1", "Member retrieve quiz detail", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")
        self._record(
            "II-3.2",
            "Detail includes category/tags",
            isinstance(body, dict) and "category" in body and "tags" in body,
            "category and tags present",
            f"keys={sorted(body.keys()) if isinstance(body, dict) else 'non-json'}",
        )
        r404 = self._request("GET", "/api/quiz/quizzes/9999/", token=member)
        self._record("II-3.5", "Quiz detail 9999 returns 404", r404.status_code == 404, "HTTP 404", f"HTTP {r404.status_code}")

        # II-4 create
        create_payload = {
            "title": f"New Integration Test Quiz {int(time.time())}",
            "description": "Created during integration test",
            "status": "draft",
            "quiz_point": 50,
            "time_limit_sec": 600,
        }
        r = self._request("POST", "/api/quiz/quizzes/", token=editor, data=create_payload)
        body = self._response_json(r) or {}
        ok = r.status_code == 201 and isinstance(body.get("id"), int)
        self._record("II-4.1", "Editor create quiz", ok, "HTTP 201 with id", f"HTTP {r.status_code}, id={body.get('id')}")
        if ok:
            self.created_quiz_id = int(body["id"])

        r_invalid = self._request("POST", "/api/quiz/quizzes/", token=editor, data={"title": "", "quiz_point": 10})
        self._record("II-4.5", "Create quiz with empty title rejected", r_invalid.status_code == 400, "HTTP 400", f"HTTP {r_invalid.status_code}")
        r_invalid2 = self._request(
            "POST",
            "/api/quiz/quizzes/",
            token=editor,
            data={"title": "Invalid quiz point", "quiz_point": -1},
        )
        self._record("II-4.6", "Create quiz with negative point rejected", r_invalid2.status_code == 400, "HTTP 400", f"HTTP {r_invalid2.status_code}")

        # II-5 patch
        if self.created_quiz_id is not None:
            r = self._request(
                "PATCH",
                f"/api/quiz/quizzes/{self.created_quiz_id}/",
                token=editor,
                data={"title": "Updated Quiz Title", "status": "published"},
            )
            body = self._response_json(r) or {}
            self._record(
                "II-5.1",
                "Editor patch quiz",
                r.status_code == 200,
                "HTTP 200",
                f"HTTP {r.status_code}",
            )
            self._record(
                "II-5.2",
                "Patch updates title",
                body.get("title") == "Updated Quiz Title",
                "title=Updated Quiz Title",
                f"title={body.get('title')}",
            )

        # II-6 delete
        if self.created_quiz_id is not None:
            r = self._request("DELETE", f"/api/quiz/quizzes/{self.created_quiz_id}/", token=editor)
            self._record("II-6.1", "Editor delete quiz", r.status_code == 204, "HTTP 204", f"HTTP {r.status_code}")
            r2 = self._request("GET", f"/api/quiz/quizzes/{self.created_quiz_id}/", token=editor)
            self._record("II-6.2", "Deleted quiz not retrievable", r2.status_code == 404, "HTTP 404", f"HTTP {r2.status_code}")
        r404 = self._request("DELETE", "/api/quiz/quizzes/999999/", token=editor)
        self._record("II-6.4", "Delete missing quiz returns 404", r404.status_code == 404, "HTTP 404", f"HTTP {r404.status_code}")

    def _section_iii_question_crud(self) -> None:
        editor = self.tokens["editor1"]
        member = self.tokens["member1"]
        quiz1 = self._require_quiz_id("OWASP Basics Quiz") or 1

        r = self._request("GET", f"/api/quiz/quizzes/{quiz1}/questions/", token=editor)
        body = self._response_json(r)
        items = self._extract_items(body) if not isinstance(body, list) else body
        self._record("III-1.1", "Editor gets question list", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")
        self._record("III-1.2", "Question list has seeded items", len(items) >= 3, ">=3 questions", f"count={len(items)}")
        member_resp = self._request("GET", f"/api/quiz/quizzes/{quiz1}/questions/", token=member)
        self._record("III-1.8", "Member forbidden on question list", member_resp.status_code == 403, "HTTP 403", f"HTTP {member_resp.status_code}")

        # Create valid single choice
        payload = {
            "question_type": "single_choice",
            "content": {"text": "What does XSS stand for?"},
            "explanation": "Cross-Site Scripting.",
            "case_sensitive": False,
            "score": 10,
            "position": 999,
            "options": [
                {"content": "Cross-Site Scripting", "is_correct": True, "position": 1},
                {"content": "Cross-System Security", "is_correct": False, "position": 2},
            ],
        }
        r = self._request("POST", f"/api/quiz/quizzes/{quiz1}/questions/", token=editor, data=payload)
        body = self._response_json(r) or {}
        ok = r.status_code == 201 and isinstance(body.get("id"), int)
        self._record("III-2.1", "Editor creates single_choice question", ok, "HTTP 201 + id", f"HTTP {r.status_code}, id={body.get('id')}")
        if ok:
            self.created_question_id = int(body["id"])

        # Validation failures
        invalid_payloads = [
            ("III-3.1", {"question_type": "single_choice", "content": {"text": "x"}, "score": 10, "position": 1}, "single_choice missing options"),
            ("III-3.2", {"question_type": "single_choice", "content": {"text": "x"}, "score": 10, "position": 1, "options": [{"content": "a", "is_correct": True, "position": 1}, {"content": "b", "is_correct": True, "position": 2}]}, "single_choice multiple correct"),
            ("III-3.5", {"question_type": "fill_blank", "content": {"text": "x"}, "score": 10, "position": 1}, "fill_blank missing answers"),
            ("III-3.7", {"question_type": "single_choice", "content": {"text": "x"}, "score": 0, "position": 1, "options": [{"content": "a", "is_correct": True, "position": 1}]}, "score zero"),
        ]
        for case_id, data, title in invalid_payloads:
            r = self._request("POST", f"/api/quiz/quizzes/{quiz1}/questions/", token=editor, data=data)
            self._record(case_id, f"Validation: {title}", r.status_code == 400, "HTTP 400", f"HTTP {r.status_code}")

        # Update existing seeded question when possible.
        q_list_resp = self._request("GET", f"/api/quiz/quizzes/{quiz1}/questions/", token=editor)
        q_items = self._extract_items(self._response_json(q_list_resp)) if q_list_resp.status_code == 200 else []
        target_qid = int(q_items[0]["id"]) if q_items else None
        if target_qid is not None:
            put_payload = {
                "question_type": "single_choice",
                "content": {"text": "Which is #1 in OWASP Top 10 2021?"},
                "explanation": "Updated explanation.",
                "case_sensitive": False,
                "score": 15,
                "position": 1,
                "options": [
                    {"content": "Broken Access Control", "is_correct": True, "position": 1},
                    {"content": "Cryptographic Failures", "is_correct": False, "position": 2},
                ],
            }
            r = self._request("PUT", f"/api/quiz/quizzes/{quiz1}/questions/{target_qid}/", token=editor, data=put_payload)
            body = self._response_json(r) or {}
            self._record("III-4.1", "PUT update question", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")
            self._record("III-4.2", "Updated score is 15", body.get("score") == 15, "score=15", f"score={body.get('score')}")

        if self.created_question_id is not None:
            r = self._request("DELETE", f"/api/quiz/quizzes/{quiz1}/questions/{self.created_question_id}/", token=editor)
            self._record("III-5.1", "Delete question", r.status_code == 204, "HTTP 204", f"HTTP {r.status_code}")

    def _section_iv_config_progress(self) -> None:
        member = self.tokens["member1"]
        quiz1 = self._require_quiz_id("OWASP Basics Quiz") or 1
        quiz2 = self._require_quiz_id("Crypto Warmup") or 2

        r = self._request("GET", f"/api/quiz/quizzes/{quiz1}/config/", token=member)
        body = self._response_json(r) or {}
        self._record("IV-1.1", "GET config", r.status_code == 200, "HTTP 200", f"HTTP {r.status_code}")
        self._record("IV-1.2", "Config has id", body.get("id") is not None, "id not null", f"id={body.get('id')}")

        put_payload = {
            "total_questions": 2,
            "time_limit_sec": 120,
            "random_question": True,
            "random_option": False,
            "allow_review": False,
            "allow_retry": True,
            "max_attempt": 5,
            "is_active": True,
        }
        r2 = self._request("PUT", f"/api/quiz/quizzes/{quiz1}/config/", token=member, data=put_payload)
        body2 = self._response_json(r2) or {}
        self._record("IV-2.1", "PUT config", r2.status_code == 200, "HTTP 200", f"HTTP {r2.status_code}")
        self._record("IV-2.2", "max_attempt updated", body2.get("max_attempt") == 5, "max_attempt=5", f"max_attempt={body2.get('max_attempt')}")

        p = self._request("GET", f"/api/quiz/quizzes/{quiz2}/progress/", token=member)
        p_body = self._response_json(p) or {}
        self._record("IV-3.1", "GET progress", p.status_code == 200, "HTTP 200", f"HTTP {p.status_code}")
        if p.status_code == 200:
            self._record("IV-3.2", "Progress attempt_count default", p_body.get("attempt_count") == 0, "attempt_count=0", f"attempt_count={p_body.get('attempt_count')}")

    def _section_v_node_tree(self) -> None:
        editor = self.tokens["editor1"]
        member = self.tokens["member1"]

        root_payload = {"title": f"Security Fundamentals {int(time.time())}", "is_item": False, "position": 1}
        create_root = self._request("POST", "/api/quiz/nodes/", token=editor, data=root_payload)
        root_body = self._response_json(create_root) or {}
        root_id = root_body.get("id")
        self._record("V-1.1", "Create root node", create_root.status_code == 201 and root_id is not None, "HTTP 201 + id", f"HTTP {create_root.status_code}, id={root_id}")

        child_id = None
        if root_id is not None:
            create_child = self._request(
                "POST",
                "/api/quiz/nodes/",
                token=editor,
                data={"title": "Child Node", "parent": root_id, "position": 1},
            )
            child_body = self._response_json(create_child) or {}
            child_id = child_body.get("id")
            self._record("V-1.2", "Create child node", create_child.status_code == 201 and child_id is not None, "HTTP 201 + id", f"HTTP {create_child.status_code}, id={child_id}")

            children = self._request("GET", f"/api/quiz/nodes/{root_id}/children/", token=editor)
            children_body = self._response_json(children) or []
            has_child = isinstance(children_body, list) and any(x.get("id") == child_id for x in children_body)
            self._record("V-1.5", "List children", children.status_code == 200 and has_child, "HTTP 200 and child present", f"HTTP {children.status_code}, child_found={has_child}")

        member_get = self._request("GET", "/api/quiz/nodes/", token=member)
        self._record("V-1.6", "Member can read nodes", member_get.status_code == 200, "HTTP 200", f"HTTP {member_get.status_code}")

        member_post = self._request(
            "POST",
            "/api/quiz/nodes/",
            token=member,
            data={"title": "forbidden", "position": 1},
        )
        self._record("V-1.7", "Member cannot create node", member_post.status_code == 403, "HTTP 403", f"HTTP {member_post.status_code}")

        if root_id is not None:
            cycle = self._request(
                "POST",
                f"/api/quiz/nodes/{root_id}/move/",
                token=editor,
                data={"parent_id": root_id},
            )
            self._record("V-2.3", "Cycle move rejected", cycle.status_code == 400, "HTTP 400", f"HTTP {cycle.status_code}")

        missing_move = self._request("POST", "/api/quiz/nodes/999999/move/", token=editor, data={"parent_id": None})
        self._record("V-2.4", "Move missing node returns 404", missing_move.status_code == 404, "HTTP 404", f"HTTP {missing_move.status_code}")

    def _failed_count(self) -> int:
        return sum(1 for r in self.results if r.status == "FAIL")

    def _write_report(self) -> None:
        out_dir = Path(__file__).resolve().parent
        out_json = out_dir / "requests-test-results.json"
        out_md = out_dir / "requests-test-results.md"

        summary = {
            "generated_at_epoch": int(time.time()),
            "base_url": self.base_url,
            "total": len(self.results),
            "passed": sum(1 for r in self.results if r.status == "PASS"),
            "failed": self._failed_count(),
            "results": [asdict(r) for r in self.results],
        }
        out_json.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

        lines = [
            "# Slice 7 Requests Integration Result",
            "",
            f"- Base URL: {self.base_url}",
            f"- Total: {summary['total']}",
            f"- Passed: {summary['passed']}",
            f"- Failed: {summary['failed']}",
            "",
            "| Case | Status | Expected | Actual |",
            "|---|---|---|---|",
        ]
        for r in self.results:
            lines.append(f"| {r.case_id} | {r.status} | {r.expected} | {r.actual} |")

        out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _print_summary(self) -> None:
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = self._failed_count()
        print(f"[slice7-requests] total={total} passed={passed} failed={failed}")
        if failed:
            print("[slice7-requests] failed cases:")
            for r in self.results:
                if r.status == "FAIL":
                    print(f"  - {r.case_id}: {r.title} -> {r.actual}")


if __name__ == "__main__":
    runner = Slice7RequestsRunner()
    sys.exit(runner.run())
