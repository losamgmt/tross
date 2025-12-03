/// Tests for TableFilterService - Generic table filtering
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/services/table_filter_service.dart';

// Test model
class TestUser {
  final String name;
  final String email;
  final String role;

  const TestUser(this.name, this.email, this.role);
}

void main() {
  group('TableFilterService', () {
    final users = [
      const TestUser('John Doe', 'john@example.com', 'admin'),
      const TestUser('Jane Smith', 'jane@example.com', 'technician'),
      const TestUser('Bob Johnson', 'bob@example.com', 'manager'),
    ];

    group('filter', () {
      test('returns all items when query is empty', () {
        final result = TableFilterService.filter<TestUser>(
          items: users,
          query: '',
          fieldExtractors: [(u) => u.name],
        );

        expect(result.length, 3);
      });

      test('filters by single field', () {
        final result = TableFilterService.filter<TestUser>(
          items: users,
          query: 'john',
          fieldExtractors: [(u) => u.name],
        );

        expect(result.length, 2); // John Doe and Bob Johnson
        expect(result.any((u) => u.name == 'John Doe'), isTrue);
        expect(result.any((u) => u.name == 'Bob Johnson'), isTrue);
      });

      test('filters by multiple fields', () {
        final result = TableFilterService.filter<TestUser>(
          items: users,
          query: 'admin',
          fieldExtractors: [(u) => u.name, (u) => u.email, (u) => u.role],
        );

        expect(result.length, 1);
        expect(result.first.name, 'John Doe');
      });

      test('is case-insensitive', () {
        final result = TableFilterService.filter<TestUser>(
          items: users,
          query: 'JANE',
          fieldExtractors: [(u) => u.name],
        );

        expect(result.length, 1);
        expect(result.first.name, 'Jane Smith');
      });

      test('returns empty list when no matches', () {
        final result = TableFilterService.filter<TestUser>(
          items: users,
          query: 'nonexistent',
          fieldExtractors: [(u) => u.name, (u) => u.email],
        );

        expect(result, isEmpty);
      });
    });

    group('filterByFields', () {
      test('returns all items when query is empty', () {
        final result = TableFilterService.filterByFields<TestUser>(
          items: users,
          query: '',
          getSearchableFields: (u) => [u.name, u.email],
        );

        expect(result.length, 3);
      });

      test('filters across multiple fields', () {
        final result = TableFilterService.filterByFields<TestUser>(
          items: users,
          query: 'example.com',
          getSearchableFields: (u) => [u.name, u.email, u.role],
        );

        expect(result.length, 3); // All have example.com in email
      });

      test('is case-insensitive', () {
        final result = TableFilterService.filterByFields<TestUser>(
          items: users,
          query: 'TECHNICIAN',
          getSearchableFields: (u) => [u.name, u.email, u.role],
        );

        expect(result.length, 1);
        expect(result.first.role, 'technician');
      });
    });
  });
}
