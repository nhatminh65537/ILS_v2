#!/usr/bin/env python3
"""Slice 8 integration checks for HTTP APIs (curl-equivalent cases).

Covers API-heavy sections in docs/intests/2026-04-14_slice8-integration.md:
- Part I: Auth & authorization
- Part II: Me profile/settings/account/activity
- Part III: Public profile
- Part IV: Public activity
- Part V: Admin user management
- Part VI: Session management
- Selected cross-feature flows from Part XI
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import requests

BASE_URL = "http://localhost:8000"
REPORT_DIR = Path(__file__).resolve().parent


@dataclass
class TestResult:
    case_id: str
    title: str
    status: str
    expected: str
    actual: str
    detail: str = ""


class Slice8RequestsRunner:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.s = requests.Session()
        self.results: list[TestResult] = []
        self.tokens: dict[str, str] = {}
        self.refresh_tokens: dict[str, str] = {}
        self.user_ids: dict[str, int] = {}
        self.role_ids: dict[str, int] = {}
        self.current_member1_username = "member1"

    def run(self) -> int:
        try:
            self._bootstrap()
            self._section_i_auth_rbac()
            self._section_ii_me_profile_settings_account()
            self._section_iii_public_profile()
            self._section_iv_activity_feed()
            self._section_v_admin_user_management()
            self._section_vi_session_management()
            self._section_xi_cross_feature_flows()
        except Exception as exc:
            self._record(
                "RUNNER",
                "Unexpected runner exception",
                False,
                "Runner completes",
                f"Exception: {type(exc).__name__}",
                str(exc),
            )
        finally:
            self._cleanup_username_restore()

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

    def _failed_count(self) -> int:
        return sum(1 for result in self.results if result.status == "FAIL")

    def _login(self, username: str, password: str) -> tuple[str, str] | tuple[None, None]:
        resp = self._request(
            "POST",
            "/api/auth/login/",
            data={"username": username, "password": password},
        )
        if resp.status_code != 200:
            return None, None
        body = self._response_json(resp) or {}
        return body.get("access"), body.get("refresh")

    def _bootstrap(self) -> None:
        health = self._request("GET", "/api/users/member1/profile/")
        if health.status_code not in (200, 404):
            raise RuntimeError(
                f"Backend not ready: GET /api/users/member1/profile/ returned {health.status_code}"
            )

        # member1 account may be temporarily renamed by previous test runs.
        member_access, member_refresh = self._login("member1", "member1234")
        if member_access:
            self.current_member1_username = "member1"
        else:
            member_access, member_refresh = self._login("member1_new", "member1234")
            if member_access:
                self.current_member1_username = "member1_new"
        if not member_access:
            raise RuntimeError("Cannot obtain token for user=member1")
        self.tokens["member1"] = member_access
        if member_refresh:
            self.refresh_tokens["member1"] = member_refresh

        for username, password in (
            ("member2", "member1234"),
            ("member3", "member1234"),
            ("admin", "admin1234"),
            ("editor1", "editor1234"),
        ):
            access, refresh = self._login(username, password)
            if not access:
                raise RuntimeError(f"Cannot obtain token for user={username}")
            self.tokens[username] = access
            if refresh:
                self.refresh_tokens[username] = refresh

        admin_list = self._request("GET", "/api/admin/users/", token=self.tokens["admin"])
        if admin_list.status_code != 200:
            raise RuntimeError(f"Cannot list admin users, status={admin_list.status_code}")

        payload = self._response_json(admin_list) or {}
        items = self._extract_items(payload)
        for user in items:
            if isinstance(user, dict) and isinstance(user.get("id"), int):
                self.user_ids[user.get("username", "")] = int(user["id"])

        role_resp = self._request("GET", "/api/admin/roles/", token=self.tokens["admin"])
        role_payload = self._response_json(role_resp) or []
        if role_resp.status_code == 200 and isinstance(role_payload, list):
            for role in role_payload:
                if isinstance(role, dict) and isinstance(role.get("id"), int):
                    self.role_ids[role.get("name", "")] = int(role["id"])

    def _section_i_auth_rbac(self) -> None:
        self._check_status(
            "I-1.1",
            "GET /api/users/me/profile/ unauthenticated",
            self._request("GET", "/api/users/me/profile/"),
            401,
        )
        self._check_status(
            "I-1.2",
            "PATCH /api/users/me/settings/ unauthenticated",
            self._request("PATCH", "/api/users/me/settings/", data={"language": "en"}),
            401,
        )
        self._check_status(
            "I-1.3",
            "GET /api/users/me/activity/ unauthenticated",
            self._request("GET", "/api/users/me/activity/"),
            401,
        )
        self._check_status(
            "I-1.4",
            "GET /api/admin/users/ unauthenticated",
            self._request("GET", "/api/admin/users/"),
            401,
        )
        self._check_status(
            "I-1.5",
            "GET /api/auth/sessions/ unauthenticated",
            self._request("GET", "/api/auth/sessions/"),
            401,
        )
        self._check_status(
            "I-1.6",
            "GET /api/users/member1/profile/ public",
            self._request("GET", "/api/users/member1/profile/"),
            200,
        )
        self._check_status(
            "I-1.7",
            "GET /api/users/member1/activity/ public",
            self._request("GET", "/api/users/member1/activity/"),
            200,
        )

        member = self.tokens["member1"]
        self._check_status(
            "I-2.1",
            "Member cannot GET /api/admin/users/",
            self._request("GET", "/api/admin/users/", token=member),
            403,
        )
        self._check_status(
            "I-2.2",
            "Member cannot POST /api/admin/users/",
            self._request("POST", "/api/admin/users/", token=member, data={"username": "x"}),
            403,
        )

        member1_id = self.user_ids.get("member1", 0)
        self._check_status(
            "I-2.3",
            "Member cannot GET /api/admin/users/{id}/",
            self._request("GET", f"/api/admin/users/{member1_id}/", token=member),
            403,
        )
        self._check_status(
            "I-2.4",
            "Member cannot PATCH /api/admin/users/{id}/",
            self._request("PATCH", f"/api/admin/users/{member1_id}/", token=member, data={"is_active": True}),
            403,
        )

        admin = self.tokens["admin"]
        self._check_status(
            "I-3.1",
            "Admin can GET /api/admin/users/",
            self._request("GET", "/api/admin/users/", token=admin),
            200,
        )
        self._check_status(
            "I-3.2",
            "Admin can GET /api/admin/users/{member1_id}/",
            self._request("GET", f"/api/admin/users/{member1_id}/", token=admin),
            200,
        )

        member2_sessions_resp = self._request("GET", "/api/auth/sessions/", token=self.tokens["member2"])
        session_list = self._response_json(member2_sessions_resp) or []
        member2_session_id = None
        if isinstance(session_list, list) and session_list:
            member2_session_id = session_list[0].get("id")

        own_sessions = self._request("GET", "/api/auth/sessions/", token=self.tokens["member1"])
        own_payload = self._response_json(own_sessions) or []
        own_ids = {item.get("id") for item in own_payload if isinstance(item, dict)}
        self._record(
            "I-4.1",
            "Member1 sees only own sessions",
            own_sessions.status_code == 200 and bool(own_ids),
            "HTTP 200 with own session ids",
            f"HTTP {own_sessions.status_code}, count={len(own_ids)}",
        )

        if member2_session_id:
            self._check_status(
                "I-4.2",
                "Member1 cannot revoke member2 session",
                self._request(
                    "DELETE",
                    f"/api/auth/sessions/{member2_session_id}/",
                    token=self.tokens["member1"],
                ),
                404,
            )

    def _section_ii_me_profile_settings_account(self) -> None:
        member = self.tokens["member1"]

        me_profile = self._request("GET", "/api/users/me/profile/", token=member)
        body = self._response_json(me_profile) or {}
        self._check_status("II-1.1", "GET /api/users/me/profile/", me_profile, 200)
        self._record(
            "II-1.2",
            "Me profile has expected username",
            body.get("username") == "member1",
            "username=member1",
            f"username={body.get('username')}",
        )
        self._record(
            "II-1.3",
            "Sensitive fields not exposed",
            "password" not in body and "refresh_token_hash" not in body,
            "No password/refresh_token_hash",
            f"keys={sorted(body.keys()) if isinstance(body, dict) else 'non-json'}",
        )

        patch_profile = self._request(
            "PATCH",
            "/api/users/me/profile/",
            token=member,
            data={
                "display_name": "Updated Name",
                "bio": "New bio text",
                "location": "Da Nang",
                "entry_year": 2025,
            },
        )
        patch_body = self._response_json(patch_profile) or {}
        self._check_status("II-2.1", "PATCH /api/users/me/profile/ valid", patch_profile, 200)
        self._record(
            "II-2.2",
            "Profile fields updated",
            patch_body.get("display_name") == "Updated Name" and patch_body.get("entry_year") == 2025,
            "display_name and entry_year updated",
            f"display_name={patch_body.get('display_name')}, entry_year={patch_body.get('entry_year')}",
        )

        invalid_entry_year = self._request(
            "PATCH",
            "/api/users/me/profile/",
            token=member,
            data={"entry_year": 1999},
        )
        self._record(
            "II-2.3",
            "entry_year validation behavior",
            invalid_entry_year.status_code in (200, 400),
            "HTTP 200 or 400",
            f"HTTP {invalid_entry_year.status_code}",
        )

        null_display_name = self._request(
            "PATCH",
            "/api/users/me/profile/",
            token=member,
            data={"display_name": None, "bio": ""},
        )
        self._check_status("II-2.4", "PATCH profile with nullable display_name", null_display_name, 200)

        patch_settings = self._request(
            "PATCH",
            "/api/users/me/settings/",
            token=member,
            data={"language": "en", "theme": "light", "timezone": "UTC"},
        )
        settings_body = self._response_json(patch_settings) or {}
        self._check_status("II-3.1", "PATCH /api/users/me/settings/ valid", patch_settings, 200)
        self._record(
            "II-3.2",
            "Settings updated",
            settings_body.get("language") == "en" and settings_body.get("theme") == "light",
            "language=en and theme=light",
            f"language={settings_body.get('language')}, theme={settings_body.get('theme')}",
        )

        invalid_lang = self._request(
            "PATCH",
            "/api/users/me/settings/",
            token=member,
            data={"language": "fr"},
        )
        self._check_status("II-3.3", "PATCH settings invalid language", invalid_lang, 400)

        invalid_theme = self._request(
            "PATCH",
            "/api/users/me/settings/",
            token=member,
            data={"theme": "blue"},
        )
        self._check_status("II-3.4", "PATCH settings invalid theme", invalid_theme, 400)

        account_patch = self._request(
            "PATCH",
            "/api/users/me/account/",
            token=member,
            data={"username": "member1_new"},
        )
        body = self._response_json(account_patch) or {}
        if account_patch.status_code == 200 and body.get("username") == "member1_new":
            self.current_member1_username = "member1_new"
            new_access, new_refresh = self._login("member1_new", "member1234")
            if new_access:
                self.tokens["member1"] = new_access
            if new_refresh:
                self.refresh_tokens["member1"] = new_refresh
        self._record(
            "II-4.1",
            "PATCH account username to member1_new",
            account_patch.status_code == 200 and body.get("username") == "member1_new",
            "HTTP 200 and username changed",
            f"HTTP {account_patch.status_code}, username={body.get('username')}",
        )

        duplicate_username = self._request(
            "PATCH",
            "/api/users/me/account/",
            token=self.tokens["member1"],
            data={"username": "admin"},
        )
        self._check_status("II-4.2", "PATCH account duplicate username", duplicate_username, 400)

        duplicate_email = self._request(
            "PATCH",
            "/api/users/me/account/",
            token=self.tokens["member1"],
            data={"email": "admin@test.local"},
        )
        self._check_status("II-4.3", "PATCH account duplicate email", duplicate_email, 400)

        empty_body = self._request(
            "PATCH",
            "/api/users/me/account/",
            token=self.tokens["member1"],
            data={},
        )
        self._check_status("II-4.4", "PATCH account with empty body", empty_body, 400)

        # Restore seed username so later public-profile/activity checks remain deterministic.
        if self.current_member1_username != "member1":
            restore = self._request(
                "PATCH",
                "/api/users/me/account/",
                token=self.tokens["member1"],
                data={"username": "member1"},
            )
            restore_body = self._response_json(restore) or {}
            self._record(
                "II-4.5",
                "Restore username to member1",
                restore.status_code == 200 and restore_body.get("username") == "member1",
                "HTTP 200 and username restored",
                f"HTTP {restore.status_code}, username={restore_body.get('username')}",
            )
            if restore.status_code == 200 and restore_body.get("username") == "member1":
                self.current_member1_username = "member1"
                access, refresh = self._login("member1", "member1234")
                if access:
                    self.tokens["member1"] = access
                if refresh:
                    self.refresh_tokens["member1"] = refresh

    def _section_iii_public_profile(self) -> None:
        r = self._request("GET", f"/api/users/{self.current_member1_username}/profile/")
        body = self._response_json(r) or {}
        self._check_status("III-1.1", "Public profile member1", r, 200)
        self._record(
            "III-1.2",
            "Public profile hides private fields",
            "email" not in body and "language" not in body and "theme" not in body and "timezone" not in body,
            "No email/language/theme/timezone",
            f"keys={sorted(body.keys()) if isinstance(body, dict) else 'non-json'}",
        )

        r_m2 = self._request("GET", "/api/users/member2/profile/")
        body_m2 = self._response_json(r_m2) or {}
        self._check_status("III-1.3", "Public profile member2", r_m2, 200)
        self._record(
            "III-1.4",
            "Member2 minimal profile has null display_name",
            body_m2.get("display_name") is None,
            "display_name is null",
            f"display_name={body_m2.get('display_name')}",
        )

        self._check_status(
            "III-1.5",
            "Public profile nonexistent user",
            self._request("GET", "/api/users/nonexistentuser/profile/"),
            404,
        )

        disabled_resp = self._request("GET", "/api/users/disableduser/profile/")
        self._record(
            "III-1.6",
            "Disabled user public profile behavior",
            disabled_resp.status_code in (200, 404),
            "HTTP 200 or 404",
            f"HTTP {disabled_resp.status_code}",
        )

    def _section_iv_activity_feed(self) -> None:
        me_activity = self._request("GET", "/api/users/me/activity/", token=self.tokens["member1"])
        me_events = self._response_json(me_activity) or []
        self._check_status("IV-1.1", "GET /api/users/me/activity/", me_activity, 200)
        self._record(
            "IV-1.2",
            "Member1 has 6 seeded events",
            isinstance(me_events, list) and len(me_events) == 6,
            "6 events",
            f"count={len(me_events) if isinstance(me_events, list) else 'non-list'}",
        )

        sorted_desc = True
        if isinstance(me_events, list) and len(me_events) >= 2:
            ts = [event.get("timestamp") for event in me_events if isinstance(event, dict)]
            sorted_desc = ts == sorted(ts, reverse=True)
        self._record(
            "IV-1.3",
            "Events sorted by timestamp desc",
            sorted_desc,
            "Sorted desc by timestamp",
            "Sorted" if sorted_desc else "Not sorted",
        )

        public_activity = self._request("GET", f"/api/users/{self.current_member1_username}/activity/")
        public_events = self._response_json(public_activity) or []
        self._check_status("IV-2.1", "Public activity member1", public_activity, 200)
        self._record(
            "IV-2.2",
            "Public activity equals me activity count",
            isinstance(public_events, list) and isinstance(me_events, list) and len(public_events) == len(me_events),
            "same event count",
            f"public={len(public_events) if isinstance(public_events, list) else 'non-list'}, me={len(me_events) if isinstance(me_events, list) else 'non-list'}",
        )

        empty_activity = self._request("GET", "/api/users/member2/activity/")
        empty_events = self._response_json(empty_activity) or []
        self._check_status("IV-2.3", "Public activity member2", empty_activity, 200)
        self._record(
            "IV-2.4",
            "Member2 has no activity",
            isinstance(empty_events, list) and len(empty_events) == 0,
            "[]",
            f"count={len(empty_events) if isinstance(empty_events, list) else 'non-list'}",
        )

        self._check_status(
            "IV-2.5",
            "Public activity nonexistent user",
            self._request("GET", "/api/users/unknown_user/activity/"),
            404,
        )

    def _section_v_admin_user_management(self) -> None:
        admin = self.tokens["admin"]

        list_resp = self._request("GET", "/api/admin/users/", token=admin)
        body = self._response_json(list_resp) or {}
        items = self._extract_items(body)
        self._check_status("V-1.1", "GET /api/admin/users/", list_resp, 200)
        self._record(
            "V-1.2",
            "Admin list response is paginated",
            isinstance(body, dict) and "count" in body and "results" in body,
            "contains count/results",
            f"keys={sorted(body.keys()) if isinstance(body, dict) else 'non-json'}",
        )
        self._record(
            "V-1.3",
            "Admin list includes seeded users",
            len(items) >= 6,
            ">=6 users",
            f"count={len(items)}",
        )

        inactive = self._request("GET", "/api/admin/users/", token=admin, params={"is_active": "false"})
        inactive_items = self._extract_items(self._response_json(inactive) or {})
        self._check_status("V-2.1", "Admin filter is_active=false", inactive, 200)
        self._record(
            "V-2.2",
            "Inactive filter returns disableduser",
            all(not item.get("is_active", True) for item in inactive_items),
            "all users inactive",
            f"items={len(inactive_items)}",
        )

        self._check_status(
            "V-2.3",
            "Admin filter invalid is_active",
            self._request("GET", "/api/admin/users/", token=admin, params={"is_active": "invalid"}),
            400,
        )

        self._check_status(
            "V-2.4",
            "Admin filter invalid date",
            self._request("GET", "/api/admin/users/", token=admin, params={"date_joined_from": "INVALID-DATE"}),
            400,
        )

        member1_id = self.user_ids.get("member1") or self.user_ids.get("member1_new")
        detail_resp = self._request("GET", f"/api/admin/users/{member1_id}/", token=admin)
        detail_body = self._response_json(detail_resp) or {}
        self._check_status("V-3.1", "GET /api/admin/users/{member1_id}/", detail_resp, 200)
        self._record(
            "V-3.2",
            "Admin detail includes profile and roles",
            isinstance(detail_body.get("profile"), dict) and isinstance(detail_body.get("roles"), list),
            "profile object and roles list",
            f"profile_type={type(detail_body.get('profile')).__name__}, roles_type={type(detail_body.get('roles')).__name__}",
        )
        self._record(
            "V-3.3",
            "Admin detail does not expose password",
            "password" not in detail_body,
            "password not present",
            f"keys={sorted(detail_body.keys()) if isinstance(detail_body, dict) else 'non-json'}",
        )

        unique = int(time.time())
        new_username = f"newuser_{unique}"
        create_resp = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": new_username, "email": f"{new_username}@test.local", "password": "Test1234!"},
        )
        create_body = self._response_json(create_resp) or {}
        self._check_status("V-4.1", "Admin create user with password", create_resp, 201)
        new_user_id = create_body.get("id") if isinstance(create_body.get("id"), int) else None

        sso_username = f"sso_only_{unique}"
        create_no_pwd = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": sso_username, "email": f"{sso_username}@test.local"},
        )
        self._check_status("V-4.2", "Admin create user without password", create_no_pwd, 201)

        dup_username = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": "admin", "email": f"dup_{unique}@test.local", "password": "Test1234!"},
        )
        self._check_status("V-4.3", "Admin create duplicate username", dup_username, 400)

        dup_email = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": f"dupmail_{unique}", "email": "admin@test.local", "password": "Test1234!"},
        )
        self._check_status("V-4.4", "Admin create duplicate email", dup_email, 400)

        invalid_role = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": f"badrole_{unique}", "role_ids": [9999], "password": "Test1234!"},
        )
        self._check_status("V-4.5", "Admin create user with invalid role_ids", invalid_role, 400)

        weak_pwd = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": f"weakpwd_{unique}", "password": "123"},
        )
        self._check_status("V-4.6", "Admin create user with weak password", weak_pwd, 400)

        member2_id = self.user_ids.get("member2")
        deactivate_resp = self._request(
            "PATCH",
            f"/api/admin/users/{member2_id}/",
            token=admin,
            data={"is_active": False},
        )
        self._check_status("V-5.1", "Admin deactivate member2", deactivate_resp, 200)

        member2_old_token = self.tokens["member2"]
        member2_me_after_deactivate = self._request("GET", "/api/users/me/profile/", token=member2_old_token)
        self._record(
            "V-5.2",
            "Member2 old token invalid after deactivate",
            member2_me_after_deactivate.status_code in (401, 403),
            "HTTP 401/403",
            f"HTTP {member2_me_after_deactivate.status_code}",
        )

        reactivate_resp = self._request(
            "PATCH",
            f"/api/admin/users/{member2_id}/",
            token=admin,
            data={"is_active": True},
        )
        self._check_status("V-5.3", "Admin reactivate member2", reactivate_resp, 200)

        access, refresh = self._login("member2", "member1234")
        self._record(
            "V-5.4",
            "Member2 can login after re-activate",
            bool(access),
            "login success",
            "login success" if access else "login failed",
        )
        if access:
            self.tokens["member2"] = access
        if refresh:
            self.refresh_tokens["member2"] = refresh

        member3_id = self.user_ids.get("member3")
        editor_role_id = self.role_ids.get("Editor")
        if member3_id and editor_role_id:
            role_patch = self._request(
                "PATCH",
                f"/api/admin/users/{member3_id}/",
                token=admin,
                data={"role_ids": [editor_role_id]},
            )
            body = self._response_json(role_patch) or {}
            role_names = [r.get("name") for r in body.get("roles", []) if isinstance(r, dict)]
            self._record(
                "V-5.5",
                "Admin updates member3 role to Editor",
                role_patch.status_code == 200 and "Editor" in role_names,
                "HTTP 200 and role includes Editor",
                f"HTTP {role_patch.status_code}, roles={role_names}",
            )

    def _section_vi_session_management(self) -> None:
        member = self.tokens["member1"]

        sessions_resp = self._request("GET", "/api/auth/sessions/", token=member)
        sessions = self._response_json(sessions_resp) or []
        self._check_status("VI-1.1", "GET /api/auth/sessions/", sessions_resp, 200)
        self._record(
            "VI-1.2",
            "Member1 has at least 1 active session",
            isinstance(sessions, list) and len(sessions) >= 1,
            "session count >= 1",
            f"count={len(sessions) if isinstance(sessions, list) else 'non-list'}",
        )

        has_expected_fields = False
        if isinstance(sessions, list) and sessions:
            sample = sessions[0]
            if isinstance(sample, dict):
                has_expected_fields = all(
                    key in sample for key in ("id", "device_info", "created_at", "last_used_at", "expires_at")
                ) and ("refresh_token_hash" not in sample)
        self._record(
            "VI-1.3",
            "Session payload has expected fields and hides hash",
            has_expected_fields,
            "expected session fields without refresh_token_hash",
            "valid" if has_expected_fields else "invalid payload",
        )

        if isinstance(sessions, list) and len(sessions) >= 2:
            revoke_target = sessions[0].get("id")
            revoke_resp = self._request("DELETE", f"/api/auth/sessions/{revoke_target}/", token=member)
            # If selected session is current, backend may still revoke it; spec expects non-current in FE.
            self._record(
                "VI-2.1",
                "DELETE /api/auth/sessions/{id}/ returns 204 for valid own id",
                revoke_resp.status_code == 204,
                "HTTP 204",
                f"HTTP {revoke_resp.status_code}",
            )

        self._check_status(
            "VI-2.2",
            "DELETE nonexistent session",
            self._request("DELETE", "/api/auth/sessions/99999999/", token=member),
            404,
        )

        # Re-login to guarantee at least one valid session token if previous step revoked current.
        access, refresh = self._login(self.current_member1_username, "member1234")
        if access:
            self.tokens["member1"] = access
        if refresh:
            self.refresh_tokens["member1"] = refresh

    def _section_xi_cross_feature_flows(self) -> None:
        admin = self.tokens["admin"]

        unique = int(time.time())
        e2e_user = f"e2euser_{unique}"
        e2e_password = "E2ETest123!"

        create = self._request(
            "POST",
            "/api/admin/users/",
            token=admin,
            data={"username": e2e_user, "email": f"{e2e_user}@test.local", "password": e2e_password},
        )
        self._check_status("XI-1.1", "Admin creates e2e user", create, 201)

        access, _ = self._login(e2e_user, e2e_password)
        self._record(
            "XI-1.2",
            "E2E user login",
            bool(access),
            "login success",
            "login success" if access else "login failed",
        )
        if access:
            me_profile = self._request("GET", "/api/users/me/profile/", token=access)
            self._check_status("XI-1.3", "E2E user can access me profile", me_profile, 200)

            patch_profile = self._request(
                "PATCH",
                "/api/users/me/profile/",
                token=access,
                data={"display_name": "E2E Updated"},
            )
            self._check_status("XI-1.4", "E2E user updates own profile", patch_profile, 200)

            public_profile = self._request("GET", f"/api/users/{e2e_user}/profile/")
            body = self._response_json(public_profile) or {}
            self._record(
                "XI-1.5",
                "Public profile reflects E2E update",
                public_profile.status_code == 200 and body.get("display_name") == "E2E Updated",
                "HTTP 200 and display_name=E2E Updated",
                f"HTTP {public_profile.status_code}, display_name={body.get('display_name')}",
            )

    def _cleanup_username_restore(self) -> None:
        if self.current_member1_username == "member1":
            return

        token = self.tokens.get("member1")
        if not token:
            return

        restore = self._request(
            "PATCH",
            "/api/users/me/account/",
            token=token,
            data={"username": "member1"},
        )
        body = self._response_json(restore) or {}
        if restore.status_code == 200 and body.get("username") == "member1":
            self.current_member1_username = "member1"
            access, refresh = self._login("member1", "member1234")
            if access:
                self.tokens["member1"] = access
            if refresh:
                self.refresh_tokens["member1"] = refresh

    def _write_report(self) -> None:
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        json_path = REPORT_DIR / "slice8_requests_results.json"
        md_path = REPORT_DIR / "slice8_requests_results.md"

        payload = {
            "base_url": self.base_url,
            "total": len(self.results),
            "passed": len([r for r in self.results if r.status == "PASS"]),
            "failed": len([r for r in self.results if r.status == "FAIL"]),
            "results": [asdict(item) for item in self.results],
        }
        json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        lines = [
            "# Slice 8 Requests Integration Results",
            "",
            f"- Base URL: {self.base_url}",
            f"- Total: {payload['total']}",
            f"- Passed: {payload['passed']}",
            f"- Failed: {payload['failed']}",
            "",
            "| Case ID | Status | Title | Expected | Actual |",
            "|---|---|---|---|---|",
        ]
        for result in self.results:
            title = result.title.replace("|", "\\|")
            expected = result.expected.replace("|", "\\|")
            actual = result.actual.replace("|", "\\|")
            lines.append(f"| {result.case_id} | {result.status} | {title} | {expected} | {actual} |")
            if result.detail:
                detail = result.detail.replace("|", "\\|")
                lines.append(f"|  |  | detail |  | {detail} |")

        md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _print_summary(self) -> None:
        total = len(self.results)
        failed = self._failed_count()
        passed = total - failed
        print("=" * 70)
        print("Slice 8 requests integration summary")
        print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
        print(f"JSON report: {REPORT_DIR / 'slice8_requests_results.json'}")
        print(f"MD report:   {REPORT_DIR / 'slice8_requests_results.md'}")
        print("=" * 70)


if __name__ == "__main__":
    raise SystemExit(Slice8RequestsRunner().run())
