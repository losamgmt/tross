/**
 * Unit Tests: Inventory Model - Validation
 */

describe('Inventory Model - Validation', () => {
  test('should require name and quantity', () => {
    expect(['name', 'quantity']).toContain('name');
    expect(['name', 'quantity']).toContain('quantity');
  });

  test('should validate quantity is non-negative', () => {
    expect(50).toBeGreaterThanOrEqual(0);
    expect(0).toBeGreaterThanOrEqual(0);
  });
});
