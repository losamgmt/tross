/**
 * Quick test script to debug technician POST failure
 */
const app = require("../server");
const request = require("supertest");
const { createTestUser } = require("../__tests__/helpers/test-db");

async function test() {
  // Create a real admin test user with valid token
  const adminUser = await createTestUser("admin");

  const payload = {
    first_name: "Test",
    last_name: "Tech",
    email: "techtest" + Date.now() + "@example.com",
  };

  console.log("Sending payload:", payload);
  console.log("Using auth token for user:", adminUser.email);

  const res = await request(app)
    .post("/api/technicians")
    .set("Authorization", "Bearer " + adminUser.token)
    .send(payload);

  console.log("Status:", res.status);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

test()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
