"""LendSplit Phase 2 API tests:
- Partial payments (POST/GET /api/loans/{id}/payments)
- Acceptance flow (incoming, accept, reject)
- Push token registration
- Regression: dashboard/summary now considers payments
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / "frontend" / ".env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


def _auth(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _signup(name_prefix="ph2"):
    email = f"TEST_{name_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Testpass!123"
    r = requests.post(
        f"{API}/auth/signup",
        json={"email": email, "password": pwd, "name": f"{name_prefix} User"},
    )
    assert r.status_code == 200, f"signup failed: {r.text}"
    return r.json()["access_token"], r.json()["user"], email


# ---------------- Payments ----------------
class TestPayments:
    def setup_method(self):
        self.lender_tok, self.lender, self.lender_email = _signup("lender")
        self.borrower_tok, self.borrower, self.borrower_email = _signup("borrower")
        # Lender creates an active loan with the borrower
        start = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        r = requests.post(
            f"{API}/loans",
            headers=_auth(self.lender_tok),
            json={
                "mode": "public",
                "counterparty_name": "Borrower",
                "counterparty_email": self.borrower_email,
                "direction": "lent",
                "principal_amount": 1000.0,
                "interest_rate": 12.0,  # 1%/mo
                "start_date": start,
                "request_acceptance": False,
            },
        )
        assert r.status_code == 200, r.text
        self.loan = r.json()
        self.loan_id = self.loan["loan_id"]
        # accrued = 2 months * 1% * 1000 = 20 -> gross = 1020

    def test_add_payment_and_persistence(self):
        r = requests.post(
            f"{API}/loans/{self.loan_id}/payments",
            headers=_auth(self.lender_tok),
            json={"amount": 200, "note": "first install"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["amount"] == 200.0
        assert body["note"] == "first install"
        assert "payment_id" in body
        # GET list
        r2 = requests.get(f"{API}/loans/{self.loan_id}/payments", headers=_auth(self.lender_tok))
        assert r2.status_code == 200
        assert any(p["payment_id"] == body["payment_id"] for p in r2.json())
        # Loan reflects
        r3 = requests.get(f"{API}/loans/{self.loan_id}", headers=_auth(self.lender_tok))
        assert r3.status_code == 200
        ln = r3.json()
        assert ln["total_paid"] == 200.0
        # total_due = (1000 + accrued) - 200
        assert ln["total_due"] == round(1000 + ln["accrued_interest"] - 200, 2)
        assert ln["status"] == "active"

    def test_full_payment_settles(self):
        # Pay full amount
        r = requests.get(f"{API}/loans/{self.loan_id}", headers=_auth(self.lender_tok))
        gross = r.json()["total_due"]
        rp = requests.post(
            f"{API}/loans/{self.loan_id}/payments",
            headers=_auth(self.lender_tok),
            json={"amount": gross},
        )
        assert rp.status_code == 200
        r2 = requests.get(f"{API}/loans/{self.loan_id}", headers=_auth(self.lender_tok))
        ln = r2.json()
        assert ln["status"] == "settled"
        assert ln["total_due"] == 0.0

    def test_counterparty_can_record_payment(self):
        # Borrower (counterparty linked via email) records payment
        r = requests.post(
            f"{API}/loans/{self.loan_id}/payments",
            headers=_auth(self.borrower_tok),
            json={"amount": 50},
        )
        assert r.status_code == 200, r.text

    def test_non_authorized_cannot_pay_or_list(self):
        stranger_tok, _, _ = _signup("stranger")
        rp = requests.post(
            f"{API}/loans/{self.loan_id}/payments",
            headers=_auth(stranger_tok),
            json={"amount": 10},
        )
        assert rp.status_code == 403
        rl = requests.get(f"{API}/loans/{self.loan_id}/payments", headers=_auth(stranger_tok))
        assert rl.status_code == 403

    def test_delete_loan_deletes_payments(self):
        requests.post(
            f"{API}/loans/{self.loan_id}/payments",
            headers=_auth(self.lender_tok),
            json={"amount": 10},
        )
        d = requests.delete(f"{API}/loans/{self.loan_id}", headers=_auth(self.lender_tok))
        assert d.status_code == 200
        # GET payments should now 404 (loan not found)
        rl = requests.get(f"{API}/loans/{self.loan_id}/payments", headers=_auth(self.lender_tok))
        assert rl.status_code == 404


# ---------------- Acceptance Flow ----------------
class TestAcceptance:
    def setup_method(self):
        self.lender_tok, self.lender, self.lender_email = _signup("acclender")
        self.borrower_tok, self.borrower, self.borrower_email = _signup("accborrower")

    def _create(self, request_acceptance: bool):
        start = datetime.now(timezone.utc).isoformat()
        r = requests.post(
            f"{API}/loans",
            headers=_auth(self.lender_tok),
            json={
                "mode": "public",
                "counterparty_name": "Borrower",
                "counterparty_email": self.borrower_email,
                "direction": "lent",
                "principal_amount": 500.0,
                "interest_rate": 6.0,
                "start_date": start,
                "request_acceptance": request_acceptance,
            },
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_create_with_request_acceptance_pending(self):
        ln = self._create(True)
        assert ln["status"] == "pending_acceptance"
        assert ln.get("counterparty_user_id") == self.borrower["user_id"]

    def test_create_without_flag_active(self):
        ln = self._create(False)
        assert ln["status"] == "active"

    def test_incoming_visible_to_borrower(self):
        ln = self._create(True)
        r = requests.get(f"{API}/loans/incoming", headers=_auth(self.borrower_tok))
        assert r.status_code == 200
        ids = [x["loan_id"] for x in r.json()]
        assert ln["loan_id"] in ids

    def test_accept_flow(self):
        ln = self._create(True)
        # Owner cannot accept
        r_owner = requests.post(f"{API}/loans/{ln['loan_id']}/accept", headers=_auth(self.lender_tok))
        assert r_owner.status_code == 403
        # Borrower accepts
        r = requests.post(f"{API}/loans/{ln['loan_id']}/accept", headers=_auth(self.borrower_tok))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "active"
        # Cannot accept again (400)
        r2 = requests.post(f"{API}/loans/{ln['loan_id']}/accept", headers=_auth(self.borrower_tok))
        assert r2.status_code == 400

    def test_reject_flow(self):
        ln = self._create(True)
        r_owner = requests.post(f"{API}/loans/{ln['loan_id']}/reject", headers=_auth(self.lender_tok))
        assert r_owner.status_code == 403
        r = requests.post(f"{API}/loans/{ln['loan_id']}/reject", headers=_auth(self.borrower_tok))
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        # Reject again -> 400
        r2 = requests.post(f"{API}/loans/{ln['loan_id']}/reject", headers=_auth(self.borrower_tok))
        assert r2.status_code == 400

    def test_accept_on_active_loan_400(self):
        ln = self._create(False)  # active by default
        r = requests.post(f"{API}/loans/{ln['loan_id']}/accept", headers=_auth(self.borrower_tok))
        assert r.status_code == 400


# ---------------- Push Token ----------------
class TestPushToken:
    def test_register_push_token(self):
        tok, _, _ = _signup("push")
        r = requests.post(
            f"{API}/users/me/push-token",
            headers=_auth(tok),
            json={"expo_push_token": "ExponentPushToken[test-fake-token]"},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_no_auth_401(self):
        r = requests.post(f"{API}/users/me/push-token", json={"expo_push_token": "x"})
        assert r.status_code == 401

    def test_loan_creation_with_push_token_does_not_break(self):
        # Borrower has a fake token; creating a loan against him should still succeed
        lender_tok, _, _ = _signup("plender")
        borrower_tok, borrower, borrower_email = _signup("pborrower")
        requests.post(
            f"{API}/users/me/push-token",
            headers=_auth(borrower_tok),
            json={"expo_push_token": "ExponentPushToken[test-fake-token]"},
        )
        r = requests.post(
            f"{API}/loans",
            headers=_auth(lender_tok),
            json={
                "mode": "public",
                "counterparty_name": "Borrower",
                "counterparty_email": borrower_email,
                "direction": "lent",
                "principal_amount": 100.0,
                "interest_rate": 5.0,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "request_acceptance": True,
            },
        )
        assert r.status_code == 200


# ---------------- Regression: dashboard factors payments ----------------
class TestDashboardWithPayments:
    def test_outstanding_reduced_after_payment(self):
        tok, _, _ = _signup("dash")
        start = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        r = requests.post(
            f"{API}/loans",
            headers=_auth(tok),
            json={
                "mode": "public",
                "counterparty_name": "X",
                "direction": "lent",
                "principal_amount": 1000.0,
                "interest_rate": 12.0,
                "start_date": start,
            },
        )
        assert r.status_code == 200
        loan_id = r.json()["loan_id"]
        before = requests.get(f"{API}/dashboard/summary", headers=_auth(tok)).json()
        # Pay 300
        requests.post(
            f"{API}/loans/{loan_id}/payments",
            headers=_auth(tok),
            json={"amount": 300},
        )
        after = requests.get(f"{API}/dashboard/summary", headers=_auth(tok)).json()
        assert after["total_outstanding"] == round(before["total_outstanding"] - 300, 2)

    def test_loans_list_includes_total_paid(self):
        tok, _, _ = _signup("listpaid")
        r = requests.post(
            f"{API}/loans",
            headers=_auth(tok),
            json={
                "mode": "public",
                "counterparty_name": "X",
                "direction": "lent",
                "principal_amount": 100.0,
                "interest_rate": 0.0,
                "start_date": datetime.now(timezone.utc).isoformat(),
            },
        )
        loan_id = r.json()["loan_id"]
        requests.post(
            f"{API}/loans/{loan_id}/payments",
            headers=_auth(tok),
            json={"amount": 25},
        )
        r2 = requests.get(f"{API}/loans", headers=_auth(tok))
        assert r2.status_code == 200
        target = next((x for x in r2.json() if x["loan_id"] == loan_id), None)
        assert target is not None
        assert target["total_paid"] == 25.0


# ---------------- Regression: existing critical endpoints ----------------
class TestRegression:
    def test_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200

    def test_demo_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "demo@lendsplit.app", "password": "demo1234"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_me(self):
        tok, _, _ = _signup("me")
        r = requests.get(f"{API}/auth/me", headers=_auth(tok))
        assert r.status_code == 200

    def test_subscription_plans(self):
        r = requests.get(f"{API}/subscription/plans")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_contacts_list(self):
        tok, _, _ = _signup("contacts")
        r = requests.get(f"{API}/contacts", headers=_auth(tok))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
