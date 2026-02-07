/**
 * Database Reset Script - Unit Tests
 *
 * Tests the utility functions from reset-databases-clean.js
 * Note: We don't test resetDatabase() directly as it requires DB connection
 */

const { log, colors } = require("../../../scripts/reset-databases-clean");

describe("reset-databases-clean", () => {
  describe("colors", () => {
    it("exports expected color codes", () => {
      expect(colors).toHaveProperty("reset");
      expect(colors).toHaveProperty("red");
      expect(colors).toHaveProperty("green");
      expect(colors).toHaveProperty("yellow");
      expect(colors).toHaveProperty("blue");
      expect(colors).toHaveProperty("cyan");
    });

    it("colors are ANSI escape codes", () => {
      expect(colors.red).toMatch(/^\x1b\[\d+m$/);
      expect(colors.green).toMatch(/^\x1b\[\d+m$/);
      expect(colors.reset).toMatch(/^\x1b\[\d+m$/);
    });
  });

  describe("log", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("logs message with default color", () => {
      log("Test message");
      expect(consoleSpy).toHaveBeenCalledWith(
        `${colors.reset}Test message${colors.reset}`,
      );
    });

    it("logs message with specified color", () => {
      log("Error message", "red");
      expect(consoleSpy).toHaveBeenCalledWith(
        `${colors.red}Error message${colors.reset}`,
      );
    });

    it("logs with all supported colors", () => {
      const colorNames = ["red", "green", "yellow", "blue", "cyan"];

      for (const colorName of colorNames) {
        log(`${colorName} message`, colorName);
        expect(consoleSpy).toHaveBeenCalledWith(
          `${colors[colorName]}${colorName} message${colors.reset}`,
        );
      }
    });
  });

  // Note: resetDatabase() is an integration function that requires
  // a real PostgreSQL connection. It should be tested separately
  // with a test database container or mocked pg Client.
});
