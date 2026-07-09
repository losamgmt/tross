/**
 * Sync Idempotency - Unit Tests
 *
 * Locks in the `sync:all` idempotency guarantee for the flagship artifact: building the
 * frontend entity-metadata from the backend models is a PURE, DETERMINISTIC function — the
 * same source always produces byte-identical output. That determinism is exactly what makes
 * re-running the sync a no-op (the CI `git status --porcelain` gate).
 *
 * Pure test: no mocks, no I/O — exercises the real build against the real models index.
 */

const {
  buildFrontendMetadata,
} = require("../../../../scripts/sync-entity-metadata");
const models = require("../../../config/models");

describe("sync idempotency (entity-metadata)", () => {
  it("buildFrontendMetadata is deterministic (same models -> deep-equal output)", () => {
    const first = buildFrontendMetadata(models);
    const second = buildFrontendMetadata(models);

    expect(second).toEqual(first);
  });

  it("serialized output is byte-identical across runs (no diff on re-sync)", () => {
    const first = JSON.stringify(buildFrontendMetadata(models), null, 2);
    const second = JSON.stringify(buildFrontendMetadata(models), null, 2);

    expect(second).toBe(first);
  });

  it("output carries no time-varying fields that would break idempotency", () => {
    const out = buildFrontendMetadata(models);

    expect(out.$schema).toBeDefined();
    expect(out.lastModified).toBeUndefined();
    expect(out.generatedAt).toBeUndefined();
    expect(out.timestamp).toBeUndefined();
  });

  it("emits an entry for every backend model", () => {
    const out = buildFrontendMetadata(models);

    for (const name of Object.keys(models)) {
      expect(out[name]).toBeDefined();
    }
  });
});
