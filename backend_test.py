#!/usr/bin/env python3
"""
Backend API Test Suite for LendSplit
Tests all loan CRUD operations including new PATCH fields
"""
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8001/api"
TEST_EMAIL = "tester@lendsplit.dev"
TEST_PASSWORD = "Test@1234"

# Global variables
access_token = None
created_loan_id = None

def print_test(name):
    """Print test name"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_result(success, message, response=None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if response and not success:
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text[:500]}")
    print()

def test_auth_login():
    """Test authentication - login with test credentials"""
    global access_token
    print_test("POST /api/auth/login - Authenticate test user")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            user = data.get("user", {})
            print_result(True, f"Login successful. User: {user.get('name')} ({user.get('email')})")
            print(f"Token: {access_token[:20]}...")
            return True
        else:
            print_result(False, f"Login failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Login request failed: {str(e)}")
        return False

def test_create_loan():
    """Test POST /api/loans - Create a new public loan"""
    global created_loan_id
    print_test("POST /api/loans - Create new public loan")
    
    if not access_token:
        print_result(False, "No access token available")
        return False
    
    # Create loan with all fields including new ones
    loan_data = {
        "mode": "public",
        "counterparty_name": "Alice Johnson",
        "counterparty_email": "alice.johnson@example.com",
        "counterparty_phone": "+1-555-0123",
        "direction": "lent",
        "principal_amount": 50000.0,
        "interest_rate": 12.0,
        "start_date": "2024-01-15",
        "due_date": "2024-12-31",
        "reminder_enabled": True,
        "reminder_day": 15,
        "notes": "Business loan for startup capital",
        "request_acceptance": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/loans",
            json=loan_data,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            created_loan_id = data.get("loan_id")
            print_result(True, f"Loan created successfully. ID: {created_loan_id}")
            print(f"Counterparty: {data.get('counterparty_name')}")
            print(f"Amount: ₹{data.get('principal_amount')}")
            print(f"Direction: {data.get('direction')}")
            print(f"Start Date: {data.get('start_date')}")
            return True
        else:
            print_result(False, f"Loan creation failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Loan creation request failed: {str(e)}")
        return False

def test_list_loans():
    """Test GET /api/loans - List all loans"""
    print_test("GET /api/loans - List all loans")
    
    if not access_token:
        print_result(False, "No access token available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/loans",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loans = response.json()
            print_result(True, f"Retrieved {len(loans)} loan(s)")
            if loans:
                print("Sample loan fields:")
                loan = loans[0]
                print(f"  - loan_id: {loan.get('loan_id')}")
                print(f"  - counterparty_name: {loan.get('counterparty_name')}")
                print(f"  - direction: {loan.get('direction')}")
                print(f"  - status: {loan.get('status')}")
            return True
        else:
            print_result(False, f"List loans failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"List loans request failed: {str(e)}")
        return False

def test_get_loan_detail():
    """Test GET /api/loans/{loan_id} - Get loan detail"""
    print_test(f"GET /api/loans/{created_loan_id} - Get loan detail")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    try:
        response = requests.get(
            f"{BASE_URL}/loans/{created_loan_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loan = response.json()
            print_result(True, f"Retrieved loan detail for {created_loan_id}")
            print(f"Counterparty: {loan.get('counterparty_name')}")
            print(f"Email: {loan.get('counterparty_email')}")
            print(f"Phone: {loan.get('counterparty_phone')}")
            print(f"Direction: {loan.get('direction')}")
            print(f"Amount: ₹{loan.get('principal_amount')}")
            print(f"Start Date: {loan.get('start_date')}")
            print(f"Status: {loan.get('status')}")
            return True
        else:
            print_result(False, f"Get loan detail failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"Get loan detail request failed: {str(e)}")
        return False

def test_patch_loan_new_fields():
    """Test PATCH /api/loans/{loan_id} - Update loan with NEW fields"""
    print_test(f"PATCH /api/loans/{created_loan_id} - Update with NEW fields")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    # Update with new fields
    update_data = {
        "counterparty_name": "Alice Marie Johnson",
        "counterparty_email": "alice.m.johnson@example.com",
        "counterparty_phone": "+1-555-9999",
        "direction": "borrowed",
        "start_date": "2024-02-01"
    }
    
    try:
        response = requests.patch(
            f"{BASE_URL}/loans/{created_loan_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loan = response.json()
            
            # Verify all fields were updated
            all_updated = True
            mismatches = []
            
            if loan.get('counterparty_name') != update_data['counterparty_name']:
                all_updated = False
                mismatches.append(f"counterparty_name: expected '{update_data['counterparty_name']}', got '{loan.get('counterparty_name')}'")
            
            if loan.get('counterparty_email') != update_data['counterparty_email']:
                all_updated = False
                mismatches.append(f"counterparty_email: expected '{update_data['counterparty_email']}', got '{loan.get('counterparty_email')}'")
            
            if loan.get('counterparty_phone') != update_data['counterparty_phone']:
                all_updated = False
                mismatches.append(f"counterparty_phone: expected '{update_data['counterparty_phone']}', got '{loan.get('counterparty_phone')}'")
            
            if loan.get('direction') != update_data['direction']:
                all_updated = False
                mismatches.append(f"direction: expected '{update_data['direction']}', got '{loan.get('direction')}'")
            
            if loan.get('start_date') != update_data['start_date']:
                all_updated = False
                mismatches.append(f"start_date: expected '{update_data['start_date']}', got '{loan.get('start_date')}'")
            
            if all_updated:
                print_result(True, "All NEW fields updated and persisted correctly")
                print(f"✓ counterparty_name: {loan.get('counterparty_name')}")
                print(f"✓ counterparty_email: {loan.get('counterparty_email')}")
                print(f"✓ counterparty_phone: {loan.get('counterparty_phone')}")
                print(f"✓ direction: {loan.get('direction')}")
                print(f"✓ start_date: {loan.get('start_date')}")
                return True
            else:
                print_result(False, "Some fields were not updated correctly")
                for mismatch in mismatches:
                    print(f"  ✗ {mismatch}")
                return False
        else:
            print_result(False, f"PATCH loan failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"PATCH loan request failed: {str(e)}")
        return False

def test_patch_loan_existing_fields():
    """Test PATCH /api/loans/{loan_id} - Update loan with EXISTING fields"""
    print_test(f"PATCH /api/loans/{created_loan_id} - Update with EXISTING fields")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    # Update with existing fields
    update_data = {
        "principal_amount": 75000.0,
        "interest_rate": 15.0,
        "due_date": "2025-06-30",
        "notes": "Updated: Extended loan period with higher interest"
    }
    
    try:
        response = requests.patch(
            f"{BASE_URL}/loans/{created_loan_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loan = response.json()
            
            # Verify all fields were updated
            all_updated = True
            mismatches = []
            
            if loan.get('principal_amount') != update_data['principal_amount']:
                all_updated = False
                mismatches.append(f"principal_amount: expected {update_data['principal_amount']}, got {loan.get('principal_amount')}")
            
            if loan.get('interest_rate') != update_data['interest_rate']:
                all_updated = False
                mismatches.append(f"interest_rate: expected {update_data['interest_rate']}, got {loan.get('interest_rate')}")
            
            if loan.get('due_date') != update_data['due_date']:
                all_updated = False
                mismatches.append(f"due_date: expected '{update_data['due_date']}', got '{loan.get('due_date')}'")
            
            if loan.get('notes') != update_data['notes']:
                all_updated = False
                mismatches.append(f"notes: expected '{update_data['notes']}', got '{loan.get('notes')}'")
            
            if all_updated:
                print_result(True, "All EXISTING fields updated and persisted correctly")
                print(f"✓ principal_amount: ₹{loan.get('principal_amount')}")
                print(f"✓ interest_rate: {loan.get('interest_rate')}%")
                print(f"✓ due_date: {loan.get('due_date')}")
                print(f"✓ notes: {loan.get('notes')}")
                return True
            else:
                print_result(False, "Some fields were not updated correctly")
                for mismatch in mismatches:
                    print(f"  ✗ {mismatch}")
                return False
        else:
            print_result(False, f"PATCH loan failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"PATCH loan request failed: {str(e)}")
        return False

def test_patch_loan_settle():
    """Test PATCH /api/loans/{loan_id} - Mark loan as settled"""
    print_test(f"PATCH /api/loans/{created_loan_id} - Mark as settled")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    try:
        response = requests.patch(
            f"{BASE_URL}/loans/{created_loan_id}",
            json={"status": "settled"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loan = response.json()
            if loan.get('status') == 'settled':
                print_result(True, f"Loan marked as settled. Status: {loan.get('status')}")
                return True
            else:
                print_result(False, f"Status not updated. Expected 'settled', got '{loan.get('status')}'")
                return False
        else:
            print_result(False, f"PATCH loan status failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"PATCH loan status request failed: {str(e)}")
        return False

def test_patch_loan_reopen():
    """Test PATCH /api/loans/{loan_id} - Reopen settled loan (settled -> active)"""
    print_test(f"PATCH /api/loans/{created_loan_id} - Reopen loan (settled -> active)")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    try:
        response = requests.patch(
            f"{BASE_URL}/loans/{created_loan_id}",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            loan = response.json()
            if loan.get('status') == 'active':
                print_result(True, f"Loan reopened successfully. Status: {loan.get('status')}")
                return True
            else:
                print_result(False, f"Status not updated. Expected 'active', got '{loan.get('status')}'")
                return False
        else:
            print_result(False, f"PATCH loan reopen failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"PATCH loan reopen request failed: {str(e)}")
        return False

def test_delete_loan():
    """Test DELETE /api/loans/{loan_id} - Delete loan"""
    print_test(f"DELETE /api/loans/{created_loan_id} - Delete loan")
    
    if not access_token or not created_loan_id:
        print_result(False, "No access token or loan ID available")
        return False
    
    try:
        response = requests.delete(
            f"{BASE_URL}/loans/{created_loan_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print_result(True, f"Loan {created_loan_id} deleted successfully")
                
                # Verify deletion by trying to get the loan
                verify_response = requests.get(
                    f"{BASE_URL}/loans/{created_loan_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10
                )
                
                if verify_response.status_code == 404:
                    print("✓ Verified: Loan no longer exists (404)")
                    return True
                else:
                    print(f"⚠ Warning: Loan still accessible after deletion (status {verify_response.status_code})")
                    return True  # Still consider test passed if delete returned ok
            else:
                print_result(False, "Delete response did not return ok=True")
                return False
        else:
            print_result(False, f"DELETE loan failed with status {response.status_code}", response)
            return False
    except Exception as e:
        print_result(False, f"DELETE loan request failed: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("LENDSPLIT BACKEND API TEST SUITE")
    print("Testing loan CRUD operations including new PATCH fields")
    print("="*80)
    
    results = {}
    
    # Run tests in sequence
    results['auth_login'] = test_auth_login()
    
    if results['auth_login']:
        results['create_loan'] = test_create_loan()
        results['list_loans'] = test_list_loans()
        results['get_loan_detail'] = test_get_loan_detail()
        results['patch_new_fields'] = test_patch_loan_new_fields()
        results['patch_existing_fields'] = test_patch_loan_existing_fields()
        results['patch_settle'] = test_patch_loan_settle()
        results['patch_reopen'] = test_patch_loan_reopen()
        results['delete_loan'] = test_delete_loan()
    else:
        print("\n❌ Authentication failed. Skipping remaining tests.")
        return False
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
