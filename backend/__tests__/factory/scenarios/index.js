/**
 * Test Scenarios Index
 *
 * SRP: Exports all scenario categories
 * Each scenario is a pure function: (metadata, ctx) => void
 *
 * PRINCIPLE: Tests are parameterized by metadata, not special-cased per entity.
 * If metadata lacks a feature, the scenario's preconditions aren't met,
 * and the test simply doesn't run - no exceptions, no special handling.
 */

const crudScenarios = require('./crud.scenarios');
const validationScenarios = require('./validation.scenarios');
const relationshipScenarios = require('./relationship.scenarios');
const rlsScenarios = require('./rls.scenarios');
const searchScenarios = require('./search.scenarios');
const lifecycleScenarios = require('./lifecycle.scenarios');
const responseScenarios = require('./response.scenarios');
const auditScenarios = require('./audit.scenarios');
const fieldAccessScenarios = require('./field-access.scenarios');
const rlsFilterScenarios = require('./rls-filter.scenarios');
const computedScenarios = require('./computed.scenarios');

module.exports = {
  crud: crudScenarios,
  validation: validationScenarios,
  relationships: relationshipScenarios,
  rls: rlsScenarios,
  search: searchScenarios,
  lifecycle: lifecycleScenarios,
  response: responseScenarios,
  audit: auditScenarios,
  fieldAccess: fieldAccessScenarios,
  rlsFilter: rlsFilterScenarios,
  computed: computedScenarios,
};
