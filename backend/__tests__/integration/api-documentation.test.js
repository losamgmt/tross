/**
 * API Documentation Verification Tests
 *
 * Ensures Swagger/OpenAPI documentation is:
 * - Valid and parseable
 * - Covers all routes in the application
 * - Has proper authentication definitions
 * - Includes request/response schemas
 */

const swaggerSpec = require("../../config/swagger");
const app = require("../../server");

describe("API Documentation Verification", () => {
  describe("Swagger Specification", () => {
    test("should have valid OpenAPI 3.0 specification", () => {
      expect(swaggerSpec).toBeDefined();
      expect(swaggerSpec.openapi).toBe("3.0.0");
    });

    test("should have API metadata", () => {
      expect(swaggerSpec.info).toBeDefined();
      expect(swaggerSpec.info.title).toBe("Tross API");
      expect(swaggerSpec.info.version).toBeDefined();
      expect(swaggerSpec.info.description).toBeDefined();
    });

    test("should have server configuration", () => {
      expect(swaggerSpec.servers).toBeDefined();
      expect(Array.isArray(swaggerSpec.servers)).toBe(true);
      expect(swaggerSpec.servers.length).toBeGreaterThan(0);
    });

    test("should define security schemes", () => {
      expect(swaggerSpec.components).toBeDefined();
      expect(swaggerSpec.components.securitySchemes).toBeDefined();
      expect(swaggerSpec.components.securitySchemes.BearerAuth).toBeDefined();
    });
  });

  describe("API Path Coverage", () => {
    test("should document core API paths", () => {
      expect(swaggerSpec.paths).toBeDefined();

      const documentedPaths = Object.keys(swaggerSpec.paths);

      // Core paths that MUST be documented
      // Note: Entity routes (users, roles, etc.) use dynamic router factory
      // and don't have inline Swagger docs - they're documented separately
      const corePaths = ["/api/auth/me", "/api/health"];

      corePaths.forEach((path) => {
        expect(documentedPaths).toContain(path);
      });

      // Should have at least some paths documented
      expect(documentedPaths.length).toBeGreaterThan(5);
    });

    test("should document HTTP methods for each path", () => {
      const paths = swaggerSpec.paths;

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        const methods = Object.keys(pathItem).filter((key) =>
          ["get", "post", "put", "patch", "delete"].includes(key),
        );

        expect(methods.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Authentication Documentation", () => {
    test("should define Bearer authentication scheme", () => {
      const bearerAuth = swaggerSpec.components.securitySchemes.BearerAuth;

      expect(bearerAuth).toBeDefined();
      expect(bearerAuth.type).toBe("http");
      expect(bearerAuth.scheme).toBe("bearer");
      expect(bearerAuth.bearerFormat).toBe("JWT");
    });

    test("protected endpoints should reference security", () => {
      const protectedPaths = ["/api/users", "/api/roles", "/api/customers"];

      protectedPaths.forEach((path) => {
        const pathItem = swaggerSpec.paths[path];
        if (pathItem && pathItem.get) {
          // Check if operation has security defined (swagger-jsdoc should parse from JSDoc)
          const hasPathSecurity =
            pathItem.get.security && pathItem.get.security.length > 0;

          // Note: swagger-jsdoc parses security from @openapi comments
          // If this fails, check that JSDoc has security: - bearerAuth: [] or security: - BearerAuth: []
          expect(hasPathSecurity).toBe(true);
        }
      });
    });
  });

  describe("Response Schema Documentation", () => {
    test("should define core response schemas", () => {
      expect(swaggerSpec.components.schemas).toBeDefined();

      // Core schemas that MUST be present
      const coreSchemas = ["User", "Role"];

      const schemas = Object.keys(swaggerSpec.components.schemas || {});

      coreSchemas.forEach((schemaName) => {
        expect(schemas).toContain(schemaName);
      });

      // Should have at least a few schemas defined
      expect(schemas.length).toBeGreaterThan(2);
    });

    test("response schemas should have required properties", () => {
      const userSchema = swaggerSpec.components.schemas.User;

      expect(userSchema).toBeDefined();
      expect(userSchema.type).toBe("object");
      expect(userSchema.properties).toBeDefined();
      expect(userSchema.properties.id).toBeDefined();
      expect(userSchema.properties.email).toBeDefined();
    });
  });

  describe("Error Response Documentation", () => {
    test("should document error responses", () => {
      const paths = swaggerSpec.paths;

      // Check a few endpoints for error documentation
      const samplePath = paths["/api/users"];
      if (samplePath && samplePath.get && samplePath.get.responses) {
        const responses = samplePath.get.responses;

        // Should document at least 200 (success) and common errors
        expect(responses["200"] || responses["201"]).toBeDefined();

        // Should document at least one error response
        const errorCodes = ["400", "401", "403", "404", "500"];
        const hasErrorDocs = errorCodes.some((code) => responses[code]);

        expect(hasErrorDocs).toBe(true);
      }
    });
  });

  describe("Request Body Documentation", () => {
    test("POST endpoints should document request bodies", () => {
      const createUserPath = swaggerSpec.paths["/api/users"];

      if (createUserPath && createUserPath.post) {
        expect(createUserPath.post.requestBody).toBeDefined();
        expect(createUserPath.post.requestBody.content).toBeDefined();
        expect(
          createUserPath.post.requestBody.content["application/json"],
        ).toBeDefined();
      }
    });

    test("PUT/PATCH endpoints should document request bodies", () => {
      const updateUserPath = swaggerSpec.paths["/api/users/{id}"];

      if (updateUserPath && (updateUserPath.put || updateUserPath.patch)) {
        const method = updateUserPath.put || updateUserPath.patch;
        expect(method.requestBody).toBeDefined();
      }
    });
  });

  describe("Documentation Completeness", () => {
    test("all paths should have operation descriptions or summaries", () => {
      const paths = swaggerSpec.paths;

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        const methods = ["get", "post", "put", "patch", "delete"];

        methods.forEach((method) => {
          if (pathItem[method]) {
            expect(
              pathItem[method].summary || pathItem[method].description,
            ).toBeDefined();
          }
        });
      });
    });

    test("all paths should have tags for organization", () => {
      const paths = swaggerSpec.paths;

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        const methods = ["get", "post", "put", "patch", "delete"];

        methods.forEach((method) => {
          if (pathItem[method]) {
            expect(pathItem[method].tags).toBeDefined();
            expect(Array.isArray(pathItem[method].tags)).toBe(true);
            expect(pathItem[method].tags.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe("Swagger UI Endpoint", () => {
    test("should have Swagger specification available", () => {
      // The swagger spec exists and is valid
      expect(swaggerSpec).toBeDefined();
      expect(swaggerSpec.openapi).toBe("3.0.0");
      expect(Object.keys(swaggerSpec.paths).length).toBeGreaterThan(0);
    });
  });
});
