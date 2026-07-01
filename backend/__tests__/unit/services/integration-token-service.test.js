/**
 * IntegrationTokenService Unit Tests
 *
 * Focus: encryption-at-rest wiring — setTokens() persists only an encrypted
 * envelope, getTokens() decrypts it back, legacy plaintext is read for
 * back-compat, and undecryptable ciphertext surfaces a 500.
 */

jest.mock("../../../db/connection", () => ({ query: jest.fn() }));

const db = require("../../../db/connection");
const IntegrationTokenService = require("../../../services/integrations/token-service");
const { getProviderNames } = require("../../../config/integration-providers");
const { isEncrypted } = require("../../../utils/encryption");

const provider = getProviderNames()[0];

describe("IntegrationTokenService - encryption at rest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("setTokens stores only an encrypted envelope (no plaintext in DB)", async () => {
    db.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

    const tokens = {
      access_token: "super-secret-access",
      refresh_token: "super-secret-refresh",
      realm_id: "12345",
    };
    await IntegrationTokenService.setTokens(provider, tokens, 1);

    expect(db.query).toHaveBeenCalledTimes(1);
    // _updateSetting passes params: [key, JSON.stringify(value), userId]
    const params = db.query.mock.calls[0][1];
    const storedJson = params[1];
    const storedValue = JSON.parse(storedJson);

    expect(Object.keys(storedValue)).toEqual(["enc"]);
    expect(isEncrypted(storedValue.enc)).toBe(true);
    // The plaintext secrets must never appear in the serialized column value.
    expect(storedJson).not.toContain("super-secret-access");
    expect(storedJson).not.toContain("super-secret-refresh");
    expect(storedJson).not.toContain("12345");
  });

  test("getTokens decrypts an encrypted envelope back to the original tokens", async () => {
    // Store first, capture the encrypted envelope, then feed it back to getTokens.
    db.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });
    const tokens = {
      access_token: "aaa",
      refresh_token: "bbb",
      expires_at: "2099-01-01T00:00:00Z",
    };
    await IntegrationTokenService.setTokens(provider, tokens, 1);
    const storedValue = JSON.parse(db.query.mock.calls[0][1][1]);

    db.query.mockResolvedValueOnce({
      rows: [{ key: `integration.${provider}.tokens`, value: storedValue }],
      rowCount: 1,
    });
    const result = await IntegrationTokenService.getTokens(provider);

    expect(result.access_token).toBe("aaa");
    expect(result.refresh_token).toBe("bbb");
    expect(result.expires_at).toBe("2099-01-01T00:00:00Z");
    expect(result.stored_at).toBeDefined();
  });

  test("getTokens returns legacy plaintext tokens as-is (back-compat)", async () => {
    const legacy = { access_token: "legacy-plain", refresh_token: "legacy-refresh" };
    db.query.mockResolvedValueOnce({ rows: [{ value: legacy }], rowCount: 1 });

    const result = await IntegrationTokenService.getTokens(provider);
    expect(result).toEqual(legacy);
  });

  test("getTokens returns null when nothing is stored", async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await IntegrationTokenService.getTokens(provider);
    expect(result).toBeNull();
  });

  test("getTokens throws a 500 when stored ciphertext cannot be decrypted", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ value: { enc: "v1:AAAA:BBBB:CCCC" } }],
      rowCount: 1,
    });
    await expect(IntegrationTokenService.getTokens(provider)).rejects.toThrow(
      "Stored integration tokens could not be decrypted",
    );
  });
});
