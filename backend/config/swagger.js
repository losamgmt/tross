/**
 * Swagger/OpenAPI Configuration for TrossApp Backend API
 *
 * This is the foundation API documentation for TrossApp MVP.
 * As business logic grows, this will be expanded with new endpoints.
 *
 * DERIVED FROM METADATA: Entity paths are derived from metadata via derived-constants.js
 */

const swaggerJsdoc = require('swagger-jsdoc');
const { getSwaggerEntityConfigs } = require('./derived-constants');

// =============================================================================
// HELPER: Generate CRUD paths for an entity
// =============================================================================
function generateEntityPaths(basePath, tag, schemaRef, displayName) {
  return {
    [`/api/${basePath}`]: {
      get: {
        tags: [tag],
        summary: `List all ${displayName}`,
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Paginated list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: [tag],
        summary: `Create ${displayName.slice(0, -1)}`,
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } } },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } } },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    [`/api/${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get ${displayName.slice(0, -1)} by ID`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Success', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } } },
          404: { description: 'Not found' },
        },
      },
      patch: {
        tags: [tag],
        summary: `Update ${displayName.slice(0, -1)}`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } } },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: [tag],
        summary: `Delete ${displayName.slice(0, -1)}`,
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Deleted' },
          404: { description: 'Not found' },
        },
      },
    },
  };
}

// Generate all entity paths from metadata-derived configurations
const entityPaths = getSwaggerEntityConfigs().reduce((paths, config) => {
  return {
    ...paths,
    ...generateEntityPaths(config.basePath, config.tag, config.schemaRef, config.displayName),
  };
}, {});

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TrossApp API',
      version: '1.0.0',
      description: `
        TrossApp Backend REST API - Skills-based work order management system.
        
        This documentation covers foundational authentication, user management, 
        and role-based access control endpoints.
        
        ## Authentication
        
        Most endpoints require a Bearer token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
        
        ## Dual Authentication Strategy
        
        - **Development Mode:** JWT-based authentication with test users
        - **Production Mode:** Auth0 OAuth2/OIDC integration
        
        ## Response Format
        
        All successful responses follow this format:
        \`\`\`json
        {
          "success": true,
          "data": {...},
          "timestamp": "2025-11-12T12:00:00.000Z"
        }
        \`\`\`
        
        Error responses:
        \`\`\`json
        {
          "success": false,
          "error": "Error message describing what went wrong",
          "timestamp": "2025-11-12T12:00:00.000Z"
        }
        \`\`\`
      `,
      contact: {
        name: process.env.APP_NAME ? `${process.env.APP_NAME} Team` : 'TrossApp Team',
        email: process.env.CONTACT_EMAIL || 'dev@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.DEV_API_URL || 'http://localhost:3001',
        description: 'Development server',
      },
      ...(process.env.API_DOMAIN ? [{
        url: process.env.API_DOMAIN,
        description: 'Production server',
      }] : []),
    ],
    // Programmatic path definitions for generic entity routes
    paths: entityPaths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /api/dev/token (dev) or Auth0 (prod)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Always false for error responses',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message describing what went wrong',
              example: 'Role not found',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp',
              example: '2025-11-12T12:00:00.000Z',
            },
          },
          required: ['success', 'error', 'timestamp'],
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
              example: 1,
            },
            auth0_id: {
              type: 'string',
              nullable: true,
              description: 'Auth0 subject ID (null for pending_activation users)',
              example: 'auth0|507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            first_name: {
              type: 'string',
              nullable: true,
              description: 'First name',
              example: 'John',
            },
            last_name: {
              type: 'string',
              nullable: true,
              description: 'Last name',
              example: 'Doe',
            },
            role_id: {
              type: 'integer',
              nullable: true,
              description: 'Foreign key to roles table',
              example: 1,
            },
            role: {
              type: 'string',
              nullable: true,
              description: 'User role name (populated via JOIN)',
              example: 'admin',
            },
            status: {
              type: 'string',
              description: 'User lifecycle state',
              enum: ['pending_activation', 'active', 'suspended'],
              example: 'active',
            },
            is_active: {
              type: 'boolean',
              description: 'Soft delete flag - false indicates deactivated user',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Role ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Role name',
              example: 'admin',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Role description',
              example: 'Administrator with full system access',
            },
            priority: {
              type: 'integer',
              description: 'Role priority level (higher = more privileged)',
              example: 5,
              minimum: 1,
            },
            is_active: {
              type: 'boolean',
              description: 'Soft delete flag - false indicates deactivated role',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Role creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Session token ID',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session creation time',
            },
            lastUsedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity time',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Session expiration time',
            },
            ipAddress: {
              type: 'string',
              nullable: true,
              description: 'IP address',
              example: '192.168.1.1',
            },
            userAgent: {
              type: 'string',
              nullable: true,
              description: 'Browser/client user agent',
            },
            isCurrent: {
              type: 'boolean',
              description: 'Whether this is the current session',
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'critical'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
            environment: {
              type: 'string',
              example: 'development',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy'],
                    },
                    database: {
                      type: 'string',
                    },
                    type: {
                      type: 'string',
                      example: 'PostgreSQL',
                    },
                  },
                },
                memory: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['normal', 'warning', 'critical'],
                    },
                    memory: {
                      type: 'string',
                      example: '42MB',
                    },
                  },
                },
              },
            },
          },
        },
        // =====================================================================
        // BUSINESS ENTITY SCHEMAS
        // =====================================================================
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Customer ID', example: 1 },
            email: { type: 'string', format: 'email', description: 'Customer email (unique)', example: 'customer@example.com' },
            phone: { type: 'string', nullable: true, description: 'Phone number', example: '+1-555-123-4567' },
            company_name: { type: 'string', nullable: true, description: 'Company name', example: 'Acme Corp' },
            billing_address: { type: 'string', nullable: true, description: 'Billing address' },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Technician: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Technician ID', example: 1 },
            email: { type: 'string', format: 'email', description: 'Technician email (unique)', example: 'tech@example.com' },
            phone: { type: 'string', nullable: true, description: 'Phone number' },
            skill_level: { type: 'string', nullable: true, description: 'Skill level', example: 'senior' },
            certifications: { type: 'array', items: { type: 'string' }, nullable: true, description: 'List of certifications' },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        WorkOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Work Order ID', example: 1 },
            title: { type: 'string', description: 'Work order title', example: 'HVAC Repair' },
            description: { type: 'string', nullable: true, description: 'Detailed description' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], example: 'pending' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'medium' },
            customer_id: { type: 'integer', description: 'FK to customers', example: 1 },
            assigned_technician_id: { type: 'integer', nullable: true, description: 'FK to technicians' },
            scheduled_date: { type: 'string', format: 'date', nullable: true },
            completed_date: { type: 'string', format: 'date', nullable: true },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Invoice ID', example: 1 },
            invoice_number: { type: 'string', description: 'Invoice number', example: 'INV-2025-001' },
            amount: { type: 'number', format: 'decimal', description: 'Invoice amount', example: 250.00 },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], example: 'draft' },
            customer_id: { type: 'integer', description: 'FK to customers', example: 1 },
            work_order_id: { type: 'integer', nullable: true, description: 'FK to work_orders' },
            due_date: { type: 'string', format: 'date', nullable: true },
            paid_date: { type: 'string', format: 'date', nullable: true },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Contract: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Contract ID', example: 1 },
            title: { type: 'string', description: 'Contract title', example: 'Annual Maintenance Agreement' },
            customer_id: { type: 'integer', description: 'FK to customers', example: 1 },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            value: { type: 'number', format: 'decimal', description: 'Contract value', example: 5000.00 },
            status: { type: 'string', enum: ['draft', 'active', 'expired', 'cancelled'], example: 'active' },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Inventory: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Inventory item ID', example: 1 },
            name: { type: 'string', description: 'Item name', example: 'HVAC Filter 20x25' },
            sku: { type: 'string', nullable: true, description: 'Stock keeping unit', example: 'HVAC-F-2025' },
            quantity: { type: 'integer', description: 'Current quantity', example: 50 },
            unit_price: { type: 'number', format: 'decimal', description: 'Unit price', example: 12.99 },
            reorder_level: { type: 'integer', nullable: true, description: 'Reorder threshold', example: 10 },
            is_active: { type: 'boolean', description: 'Soft delete flag', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // =====================================================================
        // COMMON RESPONSE SCHEMAS
        // =====================================================================
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 50 },
                totalItems: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 2 },
                hasMore: { type: 'boolean', example: true },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      // System & Monitoring
      {
        name: 'Health',
        description: 'System health and monitoring endpoints (liveness/readiness probes)',
      },
      // Authentication
      {
        name: 'Authentication',
        description: 'User authentication, sessions, and profile management',
      },
      {
        name: 'Auth0',
        description: 'Auth0 OAuth2/OIDC endpoints (production authentication)',
      },
      {
        name: 'Development',
        description: 'Development-only utilities (test tokens, status)',
      },
      // User & Access Management
      {
        name: 'Users',
        description: 'User CRUD operations (admin only)',
      },
      {
        name: 'Roles',
        description: 'Role CRUD and user-role assignment',
      },
      {
        name: 'Preferences',
        description: 'User preferences management',
      },
      // Core Business Entities
      {
        name: 'Customers',
        description: 'Customer management (CRM)',
      },
      {
        name: 'Technicians',
        description: 'Technician/field worker management',
      },
      {
        name: 'Work Orders',
        description: 'Work order lifecycle management',
      },
      {
        name: 'Invoices',
        description: 'Invoice and billing management',
      },
      {
        name: 'Contracts',
        description: 'Service contract management',
      },
      {
        name: 'Inventory',
        description: 'Parts and inventory tracking',
      },
      // Developer Tools
      {
        name: 'Schema',
        description: 'Database schema introspection for auto-generated UIs',
      },
    ],
  },
  // Path to the API routes files with JSDoc comments
  apis: ['./server.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
