/**
 * Unit Tests: CSP directive builder + allow-all wildcard guard (middleware/security.js)
 *
 * Pure functions — no mocks. Locks the invariant that the development CSP relaxation (an
 * allow-all '*' in connectSrc, plus unsafe-inline styles and open image sources) is gated
 * behind development mode and never present in production.
 */

const {
  buildCspDirectives,
  cspHasAllowAllWildcard,
} = require('../../../middleware/security');

describe('buildCspDirectives', () => {
  const env = {
    cdnDomain: 'https://cdn.example.com',
    apiDomain: 'https://api.example.com',
  };

  test('development connectSrc includes the allow-all wildcard', () => {
    expect(buildCspDirectives(true, env).connectSrc).toContain('*');
  });

  test('production connectSrc does NOT include the allow-all wildcard', () => {
    const prod = buildCspDirectives(false, env);
    expect(prod.connectSrc).not.toContain('*');
    expect(prod.connectSrc).toContain('https://api.example.com');
    expect(prod.connectSrc).toContain('https://*.auth0.com');
  });

  test('development relaxes styleSrc (unsafe-inline) and imgSrc (https:)', () => {
    const dev = buildCspDirectives(true, env);
    expect(dev.styleSrc).toContain("'unsafe-inline'");
    expect(dev.imgSrc).toContain('https:');
  });

  test('production locks down styleSrc and imgSrc', () => {
    const prod = buildCspDirectives(false, env);
    expect(prod.styleSrc).not.toContain("'unsafe-inline'");
    expect(prod.imgSrc).not.toContain('https:');
    expect(prod.imgSrc).toContain('https://cdn.example.com');
  });

  test('filters out undefined production domains', () => {
    const prod = buildCspDirectives(false, {});
    expect(prod.connectSrc).not.toContain(undefined);
    expect(prod.imgSrc).not.toContain(undefined);
  });
});

describe('cspHasAllowAllWildcard', () => {
  test('detects a bare allow-all wildcard', () => {
    expect(cspHasAllowAllWildcard({ connectSrc: ["'self'", '*'] })).toBe(true);
  });

  test('does not flag a scoped host wildcard', () => {
    expect(
      cspHasAllowAllWildcard({ connectSrc: ["'self'", 'https://*.auth0.com'] }),
    ).toBe(false);
  });

  test('returns false for empty / missing directives', () => {
    expect(cspHasAllowAllWildcard({})).toBe(false);
    expect(cspHasAllowAllWildcard(null)).toBe(false);
  });

  test('production directives never contain an allow-all wildcard', () => {
    expect(cspHasAllowAllWildcard(buildCspDirectives(false))).toBe(false);
  });

  test('development directives do contain an allow-all wildcard', () => {
    expect(cspHasAllowAllWildcard(buildCspDirectives(true))).toBe(true);
  });
});
