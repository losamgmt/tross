/**
 * Model Metadata Central Export
 *
 * SRP: ONLY exports all model metadata configurations
 * Single import point for all model metadata
 */

const userMetadata = require('./user-metadata');
const roleMetadata = require('./role-metadata');
const customerMetadata = require('./customer-metadata');
const technicianMetadata = require('./technician-metadata');
const workOrderMetadata = require('./work-order-metadata');
const contractMetadata = require('./contract-metadata');
const invoiceMetadata = require('./invoice-metadata');
const inventoryMetadata = require('./inventory-metadata');
const preferencesMetadata = require('./preferences-metadata');
const savedViewMetadata = require('./saved-view-metadata');

module.exports = {
  user: userMetadata,
  role: roleMetadata,
  customer: customerMetadata,
  technician: technicianMetadata,
  work_order: workOrderMetadata,
  contract: contractMetadata,
  invoice: invoiceMetadata,
  inventory: inventoryMetadata,
  preferences: preferencesMetadata,
  saved_view: savedViewMetadata,
};
