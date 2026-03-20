/// Tests for MutationResult model
///
/// Verifies success/failure construction and equality
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/models/mutation_result.dart';

void main() {
  group('MutationResult', () {
    group('success constructor', () {
      test('creates successful result without data', () {
        const result = MutationResult.success();

        expect(result.success, isTrue);
        expect(result.isSuccess, isTrue);
        expect(result.isFailure, isFalse);
        expect(result.data, isNull);
        expect(result.error, isNull);
      });

      test('creates successful result with data', () {
        final data = {'id': 1, 'name': 'Test'};
        final result = MutationResult.success(data);

        expect(result.success, isTrue);
        expect(result.isSuccess, isTrue);
        expect(result.data, equals(data));
        expect(result.error, isNull);
      });
    });

    group('failure constructor', () {
      test('creates failed result with error message', () {
        const result = MutationResult.failure('Something went wrong');

        expect(result.success, isFalse);
        expect(result.isSuccess, isFalse);
        expect(result.isFailure, isTrue);
        expect(result.data, isNull);
        expect(result.error, equals('Something went wrong'));
      });
    });

    group('toString', () {
      test('describes successful result without data', () {
        const result = MutationResult.success();
        expect(result.toString(), equals('MutationResult.success()'));
      });

      test('describes successful result with data', () {
        final result = MutationResult.success({'id': 1});
        expect(result.toString(), equals('MutationResult.success(with data)'));
      });

      test('describes failed result', () {
        const result = MutationResult.failure('Error message');
        expect(
          result.toString(),
          equals('MutationResult.failure(Error message)'),
        );
      });
    });

    group('equality', () {
      test('success results are equal', () {
        const result1 = MutationResult.success();
        const result2 = MutationResult.success();

        expect(result1, equals(result2));
        expect(result1.hashCode, equals(result2.hashCode));
      });

      test('failure results with same error are equal', () {
        const result1 = MutationResult.failure('Error');
        const result2 = MutationResult.failure('Error');

        expect(result1, equals(result2));
        expect(result1.hashCode, equals(result2.hashCode));
      });

      test('success and failure are not equal', () {
        const success = MutationResult.success();
        const failure = MutationResult.failure('Error');

        expect(success, isNot(equals(failure)));
      });

      test('failures with different errors are not equal', () {
        const result1 = MutationResult.failure('Error 1');
        const result2 = MutationResult.failure('Error 2');

        expect(result1, isNot(equals(result2)));
      });
    });
  });
}
