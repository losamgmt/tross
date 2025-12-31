#!/usr/bin/env node
/**
 * Add entityName to compositeValidations
 * 
 * This makes the entity context EXPLICIT, not derived from operation names.
 * Enables metadata-driven validation without string parsing.
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../config/validation-rules.json');
const rules = require(inputPath);

// Map operation names to entity names (one-time definition, then it's in the JSON)
const operationEntityMap = {
  createUser: 'user',
  updateUser: 'user',
  createRole: 'role',
  updateRole: 'role',
  createCustomer: 'customer',
  updateCustomer: 'customer',
  createTechnician: 'technician',
  updateTechnician: 'technician',
  createWorkOrder: 'work_order',
  updateWorkOrder: 'work_order',
  createInvoice: 'invoice',
  updateInvoice: 'invoice',
  createContract: 'contract',
  updateContract: 'contract',
  createInventory: 'inventory',
  updateInventory: 'inventory',
};

// Update compositeValidations with entityName
Object.entries(rules.compositeValidations).forEach(([opName, composite]) => {
  const entityName = operationEntityMap[opName];
  if (entityName) {
    // Add entityName as first property for clarity
    rules.compositeValidations[opName] = {
      entityName,
      ...composite,
    };
    console.log(`✓ ${opName} -> entityName: "${entityName}"`);
  } else {
    console.log(`⚠ ${opName} -> no entityName mapping found`);
  }
});

// Update version
rules.version = "2.2.0";
rules.lastUpdated = new Date().toISOString().split('T')[0];

// Add changelog entry
if (rules.metadata && rules.metadata.changelog) {
  rules.metadata.changelog.unshift({
    version: "2.2.0",
    date: new Date().toISOString().split('T')[0],
    changes: [
      "Added entityName to all compositeValidations",
      "Enables metadata-driven validation without string parsing",
      "Status field validation now uses entity metadata enum values"
    ]
  });
}

// Write back
fs.writeFileSync(inputPath, JSON.stringify(rules, null, 2) + '\n');
console.log('\n✓ validation-rules.json updated with entityName');
