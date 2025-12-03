#!/usr/bin/env node
/**
 * Auth0 Admin User Seeding Script
 * Creates admin user in Auth0 and syncs with local database
 */

require('dotenv').config();
const Auth0Strategy = require('../services/auth/Auth0Strategy');
const { UserDataService } = require('../services/user-data');
const { logger } = require('../config/logger');

const ADMIN_USER_DATA = {
  email: process.env.ADMIN_EMAIL || 'admin@trossapp.com',
  password: process.env.ADMIN_PASSWORD || 'TrossAdmin123!',
  name: 'System Administrator',
};

async function seedAdminUser() {
  try {
    logger.info('🌱 Starting Auth0 admin user seeding...');

    // Check if admin email is provided
    if (!process.env.ADMIN_EMAIL) {
      logger.warn(
        '⚠️  ADMIN_EMAIL not set in environment. Using default: admin@trossapp.com',
      );
    }

    if (!process.env.ADMIN_PASSWORD) {
      logger.warn(
        '⚠️  ADMIN_PASSWORD not set in environment. Using default password.',
      );
      logger.warn('   🔒 Change this immediately in production!');
    }

    // Initialize Auth0 strategy
    const auth0Strategy = new Auth0Strategy();

    // Check if user already exists in local database
    const existingUser = await UserDataService.getUserByAuth0Id(
      `auth0|admin-${ADMIN_USER_DATA.email}`,
    );
    if (existingUser && !UserDataService.isConfigMode()) {
      logger.info('✅ Admin user already exists in database', {
        email: existingUser.email,
        role: existingUser.role,
      });
      return existingUser;
    }

    // Create admin user in Auth0
    logger.info('Creating admin user in Auth0...', {
      email: ADMIN_USER_DATA.email,
    });

    try {
      const auth0User = await auth0Strategy.createAdminUser(ADMIN_USER_DATA);
      logger.info('✅ Admin user created in Auth0', {
        auth0Id: auth0User.user_id,
        email: auth0User.email,
      });

      // Sync with local database
      if (!UserDataService.isConfigMode()) {
        const localUser = await UserDataService.findOrCreateUser({
          sub: auth0User.user_id,
          email: auth0User.email,
          name: ADMIN_USER_DATA.name,
          given_name: 'System',
          family_name: 'Administrator',
          email_verified: true,
        });

        logger.info('✅ Admin user synced with local database', {
          id: localUser.id,
          email: localUser.email,
          role: localUser.role,
        });

        return localUser;
      } else {
        logger.info('ℹ️  Running in config mode - user not stored in database');
        return {
          auth0_id: auth0User.user_id,
          email: auth0User.email,
          role: 'admin',
        };
      }
    } catch (auth0Error) {
      if (auth0Error.statusCode === 409) {
        logger.info('ℹ️  Admin user already exists in Auth0', {
          email: ADMIN_USER_DATA.email,
        });

        // Try to find and sync existing Auth0 user
        // Note: In production, you'd use Management API to search for user
        logger.info(
          '👤 Admin user exists in Auth0. Manual sync may be required.',
        );
        return null;
      } else {
        throw auth0Error;
      }
    }
  } catch (error) {
    logger.error('❌ Admin user seeding failed', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    if (error.message.includes('Auth0')) {
      logger.error('🔧 Check your Auth0 configuration:');
      logger.error('   - AUTH0_DOMAIN');
      logger.error('   - AUTH0_CLIENT_ID');
      logger.error('   - AUTH0_CLIENT_SECRET');
      logger.error('   - AUTH0_MANAGEMENT_CLIENT_ID');
      logger.error('   - AUTH0_MANAGEMENT_CLIENT_SECRET');
    }

    process.exit(1);
  }
}

// Command line execution
if (require.main === module) {
  seedAdminUser()
    .then((user) => {
      if (user) {
        logger.info('🎉 Admin user seeding completed successfully');
        logger.info('📧 Email:', user.email);
        logger.info('🔑 Role:', user.role);
        logger.info('');
        logger.info(
          '🚀 You can now login to the application with these credentials:',
        );
        logger.info(`   Email: ${ADMIN_USER_DATA.email}`);
        logger.info(`   Password: ${ADMIN_USER_DATA.password}`);
        logger.info('');
        logger.info(
          '⚠️  Remember to change the default password in production!',
        );
      }
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Unexpected error during seeding', {
        error: error.message,
      });
      process.exit(1);
    });
}

module.exports = { seedAdminUser, ADMIN_USER_DATA };
