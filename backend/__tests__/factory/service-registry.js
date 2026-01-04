/**
 * Service Registry - Metadata for all services
 *
 * PRINCIPLE: Services are described by their behaviors and methods.
 * Tests derive from this metadata - no hardcoding per service.
 *
 * Service types:
 * - crud: Has create/read/update/delete operations
 * - query: Has getAll/getById/filter operations
 * - action: Has specific action methods
 * - utility: Has pure utility functions
 *
 * Method metadata:
 * - async: Whether the method returns a Promise
 * - args: Argument names (for generating test inputs)
 * - returns: Expected return type
 * - throws: Whether it may throw on invalid input
 * - requiresDb: Whether it needs database connection
 */

module.exports = {
  'admin-logs': {
    module: '../../../services/admin-logs-service',
    type: 'query',
    description: 'Service for retrieving admin operation logs',
    dependencies: ['db'],
    methods: {
      getDataLogs: {
        async: true,
        args: [{ name: 'options', type: 'object', optional: true }],
        returns: 'array',
        pagination: true,
        description: 'Get CRUD operation logs',
      },
      getAuthLogs: {
        async: true,
        args: [{ name: 'options', type: 'object', optional: true }],
        returns: 'array',
        pagination: true,
        description: 'Get authentication logs',
      },
      getLogSummary: {
        async: true,
        args: [],
        returns: 'object',
        description: 'Get log summary statistics',
      },
    },
  },

  sessions: {
    module: '../../../services/sessions-service',
    type: 'action',
    description: 'Service for managing user sessions',
    dependencies: ['db'],
    methods: {
      getActiveSessions: {
        async: true,
        args: [{ name: 'options', type: 'object', optional: true }],
        returns: 'array',
        description: 'Get list of active sessions',
      },
      forceLogout: {
        async: true,
        args: [{ name: 'userId', type: 'id' }],
        returns: 'boolean',
        description: 'Force logout a specific user',
      },
      reactivateUser: {
        async: true,
        args: [{ name: 'userId', type: 'id' }],
        returns: 'boolean',
        description: 'Reactivate a deactivated user',
      },
      createSession: {
        async: true,
        args: [{ name: 'userId', type: 'id' }, { name: 'sessionData', type: 'object' }],
        returns: 'object',
        description: 'Create new session for user',
      },
      endSession: {
        async: true,
        args: [{ name: 'sessionId', type: 'string' }],
        returns: 'boolean',
        description: 'End a specific session',
      },
    },
  },

  'system-settings': {
    module: '../../../services/system-settings-service',
    type: 'crud',
    description: 'Service for managing system-wide settings',
    dependencies: ['db'],
    methods: {
      getAllSettings: {
        async: true,
        args: [],
        returns: 'array',
        description: 'Get all system settings',
      },
      getSetting: {
        async: true,
        args: [{ name: 'key', type: 'string' }],
        returns: 'object|null',
        description: 'Get a specific setting by key',
      },
      updateSetting: {
        async: true,
        args: [{ name: 'key', type: 'string' }, { name: 'value', type: 'any' }],
        returns: 'object',
        description: 'Update a setting value',
      },
      deleteSetting: {
        async: true,
        args: [{ name: 'key', type: 'string' }],
        returns: 'boolean',
        description: 'Delete a setting',
      },
    },
  },

  'entity-metadata': {
    module: '../../../services/entity-metadata-service',
    type: 'query',
    description: 'Service for retrieving entity metadata',
    dependencies: [],
    methods: {
      getEntityMetadata: {
        async: false,
        args: [{ name: 'entityName', type: 'string' }],
        returns: 'object|null',
        description: 'Get metadata for a specific entity',
      },
      getAllEntityNames: {
        async: false,
        args: [],
        returns: 'array',
        description: 'Get list of all entity names',
      },
      getFieldAccess: {
        async: false,
        args: [{ name: 'entityName', type: 'string' }],
        returns: 'object|null',
        description: 'Get field access rules for entity',
      },
      getValidationRules: {
        async: false,
        args: [{ name: 'entityName', type: 'string' }],
        returns: 'object|null',
        description: 'Get validation rules for entity',
      },
    },
  },

  // Already has tests, but include for completeness
  'audit-service': {
    module: '../../../services/audit-service',
    type: 'action',
    description: 'Service for audit logging',
    dependencies: ['db'],
    skipAutoTest: true, // Already thoroughly tested
    methods: {
      log: {
        async: true,
        args: [{ name: 'entry', type: 'object' }],
        returns: 'void',
        description: 'Log an audit entry',
      },
      query: {
        async: true,
        args: [{ name: 'filters', type: 'object' }],
        returns: 'array',
        description: 'Query audit logs',
      },
    },
  },

  'token-service': {
    module: '../../../services/token-service',
    type: 'utility',
    description: 'Service for JWT token operations',
    dependencies: [],
    skipAutoTest: true, // Already thoroughly tested
    methods: {
      generateToken: {
        async: false,
        args: [{ name: 'payload', type: 'object' }],
        returns: 'string',
        description: 'Generate JWT token',
      },
      verifyToken: {
        async: false,
        args: [{ name: 'token', type: 'string' }],
        returns: 'object',
        throws: true,
        description: 'Verify and decode JWT token',
      },
    },
  },

  'storage-service': {
    module: '../../../services/storage-service',
    type: 'action',
    description: 'Service for file storage operations',
    dependencies: ['fs'],
    methods: {
      uploadFile: {
        async: true,
        args: [{ name: 'file', type: 'object' }, { name: 'options', type: 'object', optional: true }],
        returns: 'object',
        description: 'Upload a file',
      },
      getFile: {
        async: true,
        args: [{ name: 'fileId', type: 'string' }],
        returns: 'object|null',
        description: 'Get file by ID',
      },
      deleteFile: {
        async: true,
        args: [{ name: 'fileId', type: 'string' }],
        returns: 'boolean',
        description: 'Delete a file',
      },
      listFiles: {
        async: true,
        args: [{ name: 'options', type: 'object', optional: true }],
        returns: 'array',
        description: 'List files with optional filters',
      },
    },
  },
};
