/**
 * Custom ESLint Rules for Test Infrastructure Enforcement
 *
 * These rules enforce the TestContext pattern and prevent regression
 * to scattered test setup patterns.
 *
 * RULES:
 * 1. no-direct-supertest: Prefer ctx.get/post over request(app)
 * 2. no-direct-createTestUser: Prefer TestContext.create over createTestUser
 * 3. no-manual-auth-header: Prefer .as(role) over .set('Authorization', ...)
 * 4. require-test-context: Require TestContext in test files
 *
 * INSTALLATION:
 * In eslint.config.mjs:
 *
 * import trossTestRules from './__tests__/eslint/test-rules.js';
 *
 * export default [
 *   // ... other configs
 *   {
 *     files: ['__tests__/**\/*.test.js'],
 *     plugins: { 'tross-test': trossTestRules },
 *     rules: {
 *       'tross-test/no-direct-supertest': 'warn',
 *       'tross-test/no-direct-createTestUser': 'warn',
 *       'tross-test/no-manual-auth-header': 'warn',
 *     }
 *   }
 * ];
 */

module.exports = {
  rules: {
    /**
     * Discourage direct supertest usage in favor of TestContext.
     *
     * BAD:  request(app).get('/api/users')
     * GOOD: ctx.get('/api/users')
     */
    'no-direct-supertest': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer TestContext methods over direct supertest calls',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          avoidDirectSupertest:
            'Avoid direct supertest usage. Use ctx.get/post/put/delete instead of request(app).',
        },
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            // Check for: request(app).get(...)
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.type === 'CallExpression' &&
              node.callee.object.callee.name === 'request'
            ) {
              context.report({
                node,
                messageId: 'avoidDirectSupertest',
              });
            }
          },
        };
      },
    },

    /**
     * Discourage direct createTestUser calls outside of beforeAll.
     *
     * BAD:  const user = await createTestUser('admin');
     * GOOD: ctx.setup() // Creates users from roles array
     */
    'no-direct-createTestUser': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer TestContext.create over direct createTestUser',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          avoidDirectCreateTestUser:
            'Avoid createTestUser. Use TestContext.create({ roles: [...] }) instead.',
        },
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee.type === 'Identifier' &&
              node.callee.name === 'createTestUser'
            ) {
              // Allow if inside beforeAll for backward compat during migration
              const ancestors = context.getAncestors();
              const inBeforeAll = ancestors.some(
                (ancestor) =>
                  ancestor.type === 'CallExpression' &&
                  ancestor.callee.name === 'beforeAll'
              );

              // Still warn, but note it's migrateable
              if (!inBeforeAll) {
                context.report({
                  node,
                  messageId: 'avoidDirectCreateTestUser',
                });
              }
            }
          },
        };
      },
    },

    /**
     * Discourage manual Authorization header setting.
     *
     * BAD:  .set('Authorization', `Bearer ${token}`)
     * GOOD: .as('admin')
     */
    'no-manual-auth-header': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer .as(role) over manual Authorization header',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          avoidManualAuth:
            'Avoid .set("Authorization", ...). Use ctx.get(...).as("role") instead.',
        },
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            // Check for: .set('Authorization', ...)
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'set' &&
              node.arguments.length >= 1 &&
              node.arguments[0].type === 'Literal' &&
              node.arguments[0].value === 'Authorization'
            ) {
              context.report({
                node,
                messageId: 'avoidManualAuth',
              });
            }
          },
        };
      },
    },

    /**
     * Require TestContext import in test files.
     *
     * BAD:  No TestContext import
     * GOOD: const { createTestContext } = require('../core');
     */
    'require-test-context': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require TestContext import in test files',
          category: 'Best Practices',
          recommended: false, // Enable after full migration
        },
        messages: {
          missingTestContext:
            'Test file should import from __tests__/core for TestContext.',
        },
        schema: [],
      },
      create(context) {
        let hasTestContextImport = false;

        return {
          CallExpression(node) {
            // Check for require('../core') or require('./core')
            if (
              node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal'
            ) {
              const arg = node.arguments[0].value;
              if (
                arg.includes('/core') ||
                arg.includes('test-context')
              ) {
                hasTestContextImport = true;
              }
            }
          },

          'Program:exit'(node) {
            const filename = context.getFilename();
            // Only check integration test files
            if (
              filename.includes('integration') &&
              filename.endsWith('.test.js') &&
              !hasTestContextImport
            ) {
              context.report({
                node,
                messageId: 'missingTestContext',
              });
            }
          },
        };
      },
    },
  },
};
