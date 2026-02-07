#!/usr/bin/env node
/**
 * Test validation-loader.js metadata-driven approach
 */

const {
  buildCompositeSchema,
} = require("../backend/utils/validation-loader.js");

console.log("=== Testing Metadata-Driven Validation ===\n");

// Test 1: Role with valid status
const roleSchema = buildCompositeSchema("createRole");
const validRole = roleSchema.validate({ name: "Admin", status: "active" });
console.log('1. createRole with status="active":');
console.log(
  "   " + (validRole.error ? "✗ FAIL: " + validRole.error.message : "✓ PASS"),
);

// Test 2: Role with invalid status
const invalidRole = roleSchema.validate({
  name: "Admin",
  status: "invalid_status",
});
console.log('2. createRole with status="invalid_status":');
console.log(
  "   " +
    (invalidRole.error
      ? "✓ PASS (correctly rejected): " + invalidRole.error.details[0].message
      : "✗ FAIL (should reject)"),
);

// Test 3: Work order with valid status
const woSchema = buildCompositeSchema("createWorkOrder");
const validWO = woSchema.validate({ customer_id: 1, status: "pending" });
console.log('3. createWorkOrder with status="pending":');
console.log(
  "   " + (validWO.error ? "✗ FAIL: " + validWO.error.message : "✓ PASS"),
);

// Test 4: Work order with role status (should fail - wrong enum)
const wrongWO = woSchema.validate({ customer_id: 1, status: "active" }); // 'active' is role status, not WO status
console.log('4. createWorkOrder with status="active" (wrong enum):');
console.log(
  "   " +
    (wrongWO.error
      ? "✓ PASS (correctly rejected)"
      : "✗ FAIL (should reject - active is not valid WO status)"),
);

// Test 5: Technician with valid status
const techSchema = buildCompositeSchema("createTechnician");
const validTech = techSchema.validate({
  first_name: "John",
  last_name: "Doe",
  email: "john@test.com",
  status: "available",
});
console.log('5. createTechnician with status="available":');
console.log(
  "   " + (validTech.error ? "✗ FAIL: " + validTech.error.message : "✓ PASS"),
);

console.log("\n=== All Tests Complete ===");
