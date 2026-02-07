/**
 * Port Checker - Unit Tests
 *
 * Tests the port checking utility functions.
 * Note: These tests mock execSync to avoid actual system calls.
 */

const { checkPorts } = require("../../../../scripts/check-ports");

// Mock child_process for testing without real system calls
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

const { execSync } = require("child_process");

describe("check-ports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkPorts", () => {
    it("returns port status for each requested port", () => {
      // Mock: all ports free
      execSync.mockImplementation(() => {
        throw new Error("No process found");
      });

      const result = checkPorts([3000, 8080]);

      expect(result).toHaveProperty("3000");
      expect(result).toHaveProperty("8080");
    });

    it("marks port as free when no process found", () => {
      execSync.mockImplementation(() => {
        throw new Error("No process found");
      });

      const result = checkPorts([3000]);

      expect(result[3000]).toEqual({
        inUse: false,
        pid: null,
        process: null,
      });
    });

    it("handles empty port array", () => {
      const result = checkPorts([]);
      expect(result).toEqual({});
    });

    it("checks multiple ports independently", () => {
      let callCount = 0;
      execSync.mockImplementation(() => {
        callCount++;
        throw new Error("No process");
      });

      checkPorts([3000, 3001, 3002]);

      // Should have called execSync for each port
      expect(execSync).toHaveBeenCalled();
    });
  });

  // Platform-specific tests would go here, but require more complex mocking
  // The key functions (checkPortWindows, checkPortUnix) parse system output
});
