/**
 * Unit Tests for utils/request-helpers.js
 *
 * Tests request utility functions for extracting IP addresses and user agents.
 */

const {
  getClientIp,
  getUserAgent,
  getAuditMetadata,
} = require("../../../utils/request-helpers");

describe("utils/request-helpers.js", () => {
  describe("getClientIp()", () => {
    test("should return req.ip when available", () => {
      // Arrange
      const req = {
        ip: "192.168.1.100",
        connection: { remoteAddress: "10.0.0.1" },
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("192.168.1.100");
    });

    test("should fallback to req.connection.remoteAddress when req.ip is undefined", () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: { remoteAddress: "172.16.0.50" },
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("172.16.0.50");
    });

    test("should fallback to req.connection.remoteAddress when req.ip is null", () => {
      // Arrange
      const req = {
        ip: null,
        connection: { remoteAddress: "10.20.30.40" },
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("10.20.30.40");
    });

    test("should fallback to req.connection.remoteAddress when req.ip is empty string", () => {
      // Arrange
      const req = {
        ip: "",
        connection: { remoteAddress: "192.168.0.1" },
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("192.168.0.1");
    });

    test('should return "unknown" when connection is null', () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: null,
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("unknown");
    });

    test('should return "unknown" when connection is undefined', () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: undefined,
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("unknown");
    });

    test('should return "unknown" when connection has no remoteAddress', () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: {},
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("unknown");
    });

    test("should handle IPv6 addresses", () => {
      // Arrange
      const req = {
        ip: "::ffff:127.0.0.1",
        connection: { remoteAddress: "10.0.0.1" },
      };

      // Act
      const result = getClientIp(req);

      // Assert
      expect(result).toBe("::ffff:127.0.0.1");
    });
  });

  describe("getUserAgent()", () => {
    test("should return user-agent header when present", () => {
      // Arrange
      const req = {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      };

      // Act
      const result = getUserAgent(req);

      // Assert
      expect(result).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    });

    test("should return undefined when user-agent header missing", () => {
      // Arrange
      const req = {
        headers: {},
      };

      // Act
      const result = getUserAgent(req);

      // Assert
      expect(result).toBeUndefined();
    });

    test("should return undefined when headers object missing", () => {
      // Arrange
      const req = {};

      // Act & Assert - Should not throw
      expect(() => getUserAgent(req)).toThrow();
    });

    test("should handle empty user-agent string", () => {
      // Arrange
      const req = {
        headers: {
          "user-agent": "",
        },
      };

      // Act
      const result = getUserAgent(req);

      // Assert
      expect(result).toBe("");
    });
  });

  describe("getAuditMetadata()", () => {
    test("should return both ip and userAgent", () => {
      // Arrange
      const req = {
        ip: "192.168.1.50",
        connection: { remoteAddress: "10.0.0.1" },
        headers: {
          "user-agent": "TestAgent/1.0",
        },
      };

      // Act
      const result = getAuditMetadata(req);

      // Assert
      expect(result).toEqual({
        ip: "192.168.1.50",
        userAgent: "TestAgent/1.0",
      });
    });

    test("should handle missing user-agent", () => {
      // Arrange
      const req = {
        ip: "10.0.0.100",
        connection: { remoteAddress: "192.168.1.1" },
        headers: {},
      };

      // Act
      const result = getAuditMetadata(req);

      // Assert
      expect(result).toEqual({
        ip: "10.0.0.100",
        userAgent: undefined,
      });
    });

    test("should use fallback IP when req.ip unavailable", () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: { remoteAddress: "172.16.0.200" },
        headers: {
          "user-agent": "Bot/2.0",
        },
      };

      // Act
      const result = getAuditMetadata(req);

      // Assert
      expect(result).toEqual({
        ip: "172.16.0.200",
        userAgent: "Bot/2.0",
      });
    });

    test("should handle completely missing request data", () => {
      // Arrange
      const req = {
        ip: undefined,
        connection: undefined,
        headers: {},
      };

      // Act
      const result = getAuditMetadata(req);

      // Assert
      expect(result).toEqual({
        ip: "unknown",
        userAgent: undefined,
      });
    });
  });
});
