/**
 * Swagger/OpenAPI Configuration for TrossApp Backend API
 *
 * This is the foundation API documentation for TrossApp MVP.
 * As business logic grows, this will be expanded with new endpoints.
 */

const swaggerJsdoc = require('swagger-jsdoc');

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
        name: 'TrossApp Team',
        email: 'dev@trossapp.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.trossapp.com',
        description: 'Production server (future)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
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
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
      {
        name: 'Authentication',
        description:
          'User authentication and session management (Development mode)',
      },
      {
        name: 'Auth0',
        description: 'Auth0 OAuth2/OIDC endpoints (Production mode - stubs)',
      },
      {
        name: 'Users',
        description: 'User management endpoints (admin only)',
      },
      {
        name: 'Roles',
        description: 'Role management and user-role assignment',
      },
      {
        name: 'Development',
        description: 'Development-only utilities (disabled in production)',
      },
    ],
  },
  // Path to the API routes files with JSDoc comments
  apis: ['./server.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
