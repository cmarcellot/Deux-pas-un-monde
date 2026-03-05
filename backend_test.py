import requests
import sys
import json
from datetime import datetime

class DeuxPasUnMondeAPITester:
    def __init__(self, base_url="https://680991b7-c7a2-4c6b-9fbe-f299f45c49c5.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_place_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_json = response.json()
                    if response_json:
                        print(f"   Response: {json.dumps(response_json, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 400 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check", "GET", "api/health", 200
        )
        return success
        
    def test_get_places_empty(self):
        """Test getting places when empty"""
        success, response = self.run_test(
            "Get Places (Empty)", "GET", "api/places", 200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} places")
        return success

    def test_login_correct(self):
        """Test login with correct password"""
        success, response = self.run_test(
            "Login (Correct Password)", 
            "POST", 
            "api/auth/login", 
            200,
            data={"password": "deuxpasunmonde2024"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login_incorrect(self):
        """Test login with incorrect password"""
        success, response = self.run_test(
            "Login (Incorrect Password)", 
            "POST", 
            "api/auth/login", 
            401,
            data={"password": "wrongpassword"}
        )
        return success

    def test_verify_token(self):
        """Test token verification"""
        if not self.token:
            print("❌ No token available for verification")
            return False
            
        success, response = self.run_test(
            "Verify Token", "GET", "api/auth/verify", 200
        )
        return success

    def test_create_place(self):
        """Create a test place"""
        if not self.token:
            print("❌ No token available for creating place")
            return False
            
        place_data = {
            "title": "Test Restaurant Paris",
            "address": "123 Rue de Rivoli, 75001 Paris",
            "description": "Un excellent restaurant de test avec une vue magnifique sur la Seine.",
            "category": "restaurant",
            "rating": 4,
            "latitude": 48.8566,
            "longitude": 2.3522,
            "photos": []
        }
        
        success, response = self.run_test(
            "Create Place", 
            "POST", 
            "api/places", 
            200,
            data=place_data
        )
        
        if success and 'id' in response:
            self.created_place_id = response['id']
            print(f"   Created place with ID: {self.created_place_id}")
            return True
        return False

    def test_get_specific_place(self):
        """Get a specific place by ID"""
        if not self.created_place_id:
            print("❌ No place ID available for testing")
            return False
            
        success, response = self.run_test(
            f"Get Place by ID", 
            "GET", 
            f"api/places/{self.created_place_id}", 
            200
        )
        return success

    def test_update_place(self):
        """Update the created place"""
        if not self.created_place_id or not self.token:
            print("❌ No place ID or token available for updating")
            return False
            
        update_data = {
            "title": "Test Restaurant Paris (Updated)",
            "rating": 5
        }
        
        success, response = self.run_test(
            "Update Place", 
            "PUT", 
            f"api/places/{self.created_place_id}", 
            200,
            data=update_data
        )
        return success

    def test_get_places_with_data(self):
        """Test getting places after creation"""
        success, response = self.run_test(
            "Get Places (With Data)", "GET", "api/places", 200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} places")
        return success

    def test_get_places_by_category(self):
        """Test filtering places by category"""
        success, response = self.run_test(
            "Get Places by Category", "GET", "api/places?category=restaurant", 200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} restaurants")
        return success

    def test_delete_place(self):
        """Delete the created place"""
        if not self.created_place_id or not self.token:
            print("❌ No place ID or token available for deletion")
            return False
            
        success, response = self.run_test(
            "Delete Place", 
            "DELETE", 
            f"api/places/{self.created_place_id}", 
            200
        )
        return success

    def test_get_deleted_place(self):
        """Try to get the deleted place (should fail)"""
        if not self.created_place_id:
            print("❌ No place ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Deleted Place", 
            "GET", 
            f"api/places/{self.created_place_id}", 
            404
        )
        return success

def main():
    print("🚀 Starting Deux pas un monde API Tests")
    print("=" * 60)
    
    tester = DeuxPasUnMondeAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Get Empty Places", tester.test_get_places_empty),
        ("Login Correct Password", tester.test_login_correct),
        ("Login Incorrect Password", tester.test_login_incorrect),
        ("Verify Token", tester.test_verify_token),
        ("Create Place", tester.test_create_place),
        ("Get Specific Place", tester.test_get_specific_place),
        ("Update Place", tester.test_update_place),
        ("Get Places with Data", tester.test_get_places_with_data),
        ("Get Places by Category", tester.test_get_places_by_category),
        ("Delete Place", tester.test_delete_place),
        ("Get Deleted Place (404)", tester.test_get_deleted_place),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {str(e)}")
            failed_tests.append(test_name)
            
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {len(failed_tests)}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print("\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test}")
    else:
        print("\n✅ All tests passed!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())