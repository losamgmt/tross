/**
 * Encryption Utility Unit Tests
 *
 * AES-256-GCM round-trip, integrity (tamper detection), payload format,
 * and input validation. Uses the dev/test ENCRYPTION_KEY default supplied
 * by the env manifest.
 */

const { encrypt, decrypt, isEncrypted } = require("../../../utils/encryption");

describe("encryption (AES-256-GCM)", () => {
  describe("encrypt() / decrypt() round-trip", () => {
    test("recovers the original plaintext", () => {
      const plaintext = JSON.stringify({
        access_token: "abc",
        refresh_token: "def",
      });
      const payload = encrypt(plaintext);
      expect(decrypt(payload)).toBe(plaintext);
    });

    test("handles empty strings, unicode, and large inputs", () => {
      for (const value of ["", "🔐 secret — café", "a".repeat(5000)]) {
        expect(decrypt(encrypt(value))).toBe(value);
      }
    });

    test("uses a unique IV per call (same input → different ciphertext)", () => {
      const a = encrypt("same-input");
      const b = encrypt("same-input");
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe("same-input");
      expect(decrypt(b)).toBe("same-input");
    });
  });

  describe("payload format", () => {
    test("is a versioned, 4-part, colon-delimited string", () => {
      const parts = encrypt("x").split(":");
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("v1");
    });

    test("isEncrypted() recognizes payloads and rejects everything else", () => {
      expect(isEncrypted(encrypt("x"))).toBe(true);
      expect(isEncrypted("not-encrypted")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted({ enc: "v1:x" })).toBe(false);
    });
  });

  describe("integrity / tamper detection", () => {
    test("rejects a tampered ciphertext segment", () => {
      const parts = encrypt("sensitive").split(":");
      const ct = Buffer.from(parts[3], "base64");
      ct[0] ^= 0xff;
      parts[3] = ct.toString("base64");
      expect(() => decrypt(parts.join(":"))).toThrow();
    });

    test("rejects a tampered auth tag", () => {
      const parts = encrypt("sensitive").split(":");
      const tag = Buffer.from(parts[2], "base64");
      tag[0] ^= 0xff;
      parts[2] = tag.toString("base64");
      expect(() => decrypt(parts.join(":"))).toThrow();
    });

    test("rejects unknown versions and malformed payloads", () => {
      expect(() => decrypt("v2:a:b:c")).toThrow();
      expect(() => decrypt("not-a-payload")).toThrow();
      expect(() => decrypt("v1:only:three")).toThrow();
    });
  });

  describe("input validation", () => {
    test("encrypt() rejects non-strings", () => {
      expect(() => encrypt(123)).toThrow(TypeError);
      expect(() => encrypt(null)).toThrow(TypeError);
      expect(() => encrypt({})).toThrow(TypeError);
    });

    test("decrypt() rejects non-strings", () => {
      expect(() => decrypt(123)).toThrow(TypeError);
      expect(() => decrypt(null)).toThrow(TypeError);
    });
  });
});
