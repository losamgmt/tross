/**
 * Model Metadata Central Export
 *
 * SRP: ONLY exports all model metadata configurations
 * Single import point for all model metadata
 */

const userMetadata = require('./user-metadata');
const roleMetadata = require('./role-metadata');

module.exports = {
  user: userMetadata,
  role: roleMetadata,
};
