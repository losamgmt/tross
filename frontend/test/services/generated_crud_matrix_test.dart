/// Generated CRUD Tests - Universal Entity Coverage
///
/// Uses CrudTestFactory to apply IDENTICAL test scenarios to ALL entities.
///
/// THE MATRIX:
/// - 5 CRUD operations (getAll, getById, create, update, delete)
/// - 11 entities
/// - 5 HTTP error scenarios (400, 401, 403, 404, 500)
/// - Success paths + edge cases
///
/// RESULT: 275+ tests that ensure uniform coverage across ALL entities.
/// If user.getAll handles 404, so does invoice.getAll, work_order.getAll, etc.
library;

import '../factory/factory.dart';

void main() {
  // ===========================================================================
  // COMPLETE MATRIX - All operations × All entities × All scenarios
  // ===========================================================================
  CrudTestFactory.generateAllTests();
}
