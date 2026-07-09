/**
 * Entity Verifier - Frontend JSON freshness precondition
 *
 * The 'Frontend JSON' checkpoint must FAIL when the on-disk entity-metadata.json entry is
 * stale relative to the source metadata (metadata changed but `sync:all` not re-run) — not
 * merely pass because the entity exists in a possibly-stale file.
 *
 * Pure test: exercises the checkpoint against mock contexts (no I/O), following the existing
 * entity-verifier test pattern (context -> result).
 */

const { CHECKPOINTS } = require('../../../../scripts/lib/entity-verifier');

const frontendJson = CHECKPOINTS.find((c) => c.name === 'Frontend JSON').fn;

describe('entity-verifier: Frontend JSON freshness', () => {
  const fresh = { entityKey: 'customer', fields: { id: {}, name: {} } };

  it('passes when the on-disk entry matches a fresh regeneration', () => {
    const result = frontendJson({
      entityName: 'customer',
      frontendJson: {
        customer: { entityKey: 'customer', fields: { id: {}, name: {} } },
      },
      expectedFrontendEntry: fresh,
    });

    expect(result.passed).toBe(true);
    expect(result.detail).toContain('fresh');
  });

  it('fails (stale) when the on-disk entry differs from the regeneration', () => {
    const result = frontendJson({
      entityName: 'customer',
      frontendJson: { customer: { entityKey: 'customer', fields: { id: {} } } },
      expectedFrontendEntry: fresh,
    });

    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/stale/i);
  });

  it('falls back to existence-only when no regeneration is available', () => {
    const result = frontendJson({
      entityName: 'customer',
      frontendJson: { customer: fresh },
      expectedFrontendEntry: null,
    });

    expect(result.passed).toBe(true);
  });

  it('fails when the entity is absent from the on-disk JSON', () => {
    const result = frontendJson({
      entityName: 'customer',
      frontendJson: {},
      expectedFrontendEntry: fresh,
    });

    expect(result.passed).toBe(false);
  });
});
