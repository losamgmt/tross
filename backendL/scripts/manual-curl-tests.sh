#!/bin/bash
# Manual cURL Tests for Backend Lock
# Run this while backend is running on localhost:3001

echo "🧪 TrossApp Backend - Manual cURL Tests"
echo "========================================"
echo ""

BASE_URL="http://localhost:3001"

# Test 1: Health Check (Public)
echo "✅ Test 1: Health Check (Public)"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | grep -o '"status":"[^"]*"'
echo ""

# Test 2: Get Dev Token
echo "✅ Test 2: Get Dev Token"
TOKEN=$(curl -s "$BASE_URL/api/dev/token" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token acquired: ${TOKEN:0:60}..."
echo ""

# Test 3: Get Current User (Authenticated)
echo "✅ Test 3: GET /api/auth/me (Authenticated)"
ME=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/me")
echo "$ME" | grep -o '"success":[^,]*' | head -1
echo "$ME" | grep -o '"email":"[^"]*"'
echo ""

# Test 4: Get Users List (with pagination)
echo "✅ Test 4: GET /api/users?limit=10&offset=0"
USERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/users?limit=10&offset=0")
echo "$USERS" | grep -o '"success":[^,]*' | head -1
echo ""

# Test 5: Get Roles List (should work now!)
echo "✅ Test 5: GET /api/roles?limit=10&offset=0"
ROLES=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/roles?limit=10&offset=0")
echo "$ROLES" | grep -o '"success":[^,]*' | head -1
echo ""

# Test 6: Get Admin Token
echo "✅ Test 6: Get Admin Token"
ADMIN_TOKEN=$(curl -s "$BASE_URL/api/dev/admin-token" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Admin token acquired: ${ADMIN_TOKEN:0:60}..."
echo ""

# Test 7: Get Specific User by ID (Admin)
echo "✅ Test 7: GET /api/users/1 (Admin)"
USER=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/users/1")
echo "$USER" | grep -o '"success":[^,]*' | head -1
echo ""

# Test 8: Invalid Token (should fail with 401)
echo "✅ Test 8: Invalid Token Test (expect 401)"
INVALID=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer invalid_token" "$BASE_URL/api/auth/me")
echo "$INVALID" | grep "HTTP_CODE"
echo ""

# Test 9: Missing Auth (should fail with 401)
echo "✅ Test 9: Missing Auth Test (expect 401)"
NO_AUTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/users?limit=10&offset=0")
echo "$NO_AUTH" | grep "HTTP_CODE"
echo ""

# Test 10: Search & Filter (New Phase 3A features!)
echo "✅ Test 10: Search & Filter Features"
SEARCH=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/users?search=tech&limit=10&offset=0")
echo "$SEARCH" | grep -o '"success":[^,]*' | head -1
echo ""

echo "========================================"
echo "🎉 Manual cURL Tests Complete!"
echo ""
echo "Summary:"
echo "- All tests should show \"success\":true"
echo "- Tests 8 & 9 should show HTTP_CODE:401"
echo "- If any test failed, review output above"
