/// FormValidators Tests
///
/// Tests for Flutter form field validators that wrap Validators.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/form_validators.dart';

void main() {
  group('FormValidators', () {
    group('email', () {
      test('returns null for valid email', () {
        expect(FormValidators.email('test@example.com'), isNull);
      });

      test('returns error for invalid email', () {
        expect(FormValidators.email('not-an-email'), isNotNull);
      });

      test('returns error for non-string', () {
        expect(FormValidators.email(123), isNotNull);
      });
    });

    group('required', () {
      test('returns null for valid value', () {
        expect(FormValidators.required()('hello'), isNull);
      });

      test('returns error for null', () {
        expect(FormValidators.required()(null), isNotNull);
      });

      test('returns error for empty string', () {
        expect(FormValidators.required()(''), isNotNull);
      });

      test('includes custom field name in error', () {
        final error = FormValidators.required('Username')(null);
        expect(error, contains('Username'));
      });

      test('returns error for non-string', () {
        expect(FormValidators.required()(123), isNotNull);
      });
    });

    group('minLength', () {
      test('returns null when length is sufficient', () {
        expect(FormValidators.minLength(3)('hello'), isNull);
      });

      test('returns error when too short', () {
        expect(FormValidators.minLength(5)('hi'), isNotNull);
      });

      test('includes field name in error', () {
        final error = FormValidators.minLength(5, 'Password')('hi');
        expect(error, contains('Password'));
      });

      test('returns error for non-string', () {
        expect(FormValidators.minLength(3)(123), isNotNull);
      });
    });

    group('maxLength', () {
      test('returns null when within limit', () {
        expect(FormValidators.maxLength(10)('hello'), isNull);
      });

      test('returns error when too long', () {
        expect(FormValidators.maxLength(3)('hello'), isNotNull);
      });

      test('returns error for non-string', () {
        expect(FormValidators.maxLength(3)(12345), isNotNull);
      });
    });

    group('integer', () {
      test('returns null for valid integer string', () {
        expect(FormValidators.integer()('42'), isNull);
      });

      test('returns error for non-integer', () {
        expect(FormValidators.integer()('abc'), isNotNull);
      });

      test('returns error for non-string', () {
        expect(FormValidators.integer()(3.14), isNotNull);
      });
    });

    group('positive', () {
      test('returns null for positive integer', () {
        expect(FormValidators.positive()('5'), isNull);
      });

      test('returns error for zero', () {
        expect(FormValidators.positive()('0'), isNotNull);
      });

      test('returns error for negative', () {
        expect(FormValidators.positive()('-1'), isNotNull);
      });

      test('returns error for non-string', () {
        expect(FormValidators.positive()(-5), isNotNull);
      });
    });

    group('integerRange', () {
      test('returns null when in range', () {
        expect(FormValidators.integerRange(min: 1, max: 10)('5'), isNull);
      });

      test('returns error below min', () {
        expect(FormValidators.integerRange(min: 5)('3'), isNotNull);
      });

      test('returns error above max', () {
        expect(FormValidators.integerRange(max: 10)('15'), isNotNull);
      });

      test('returns error for non-string', () {
        expect(FormValidators.integerRange(min: 1)(5), isNotNull);
      });
    });

    group('compose', () {
      test('returns null when all validators pass', () {
        final validator = FormValidators.compose([
          (v) => v == null ? 'required' : null,
          (v) => v!.length < 3 ? 'too short' : null,
        ]);
        expect(validator('hello'), isNull);
      });

      test('returns first error', () {
        final validator = FormValidators.compose([
          (v) => v == null ? 'required' : null,
          (v) => v!.length < 10 ? 'too short' : null,
        ]);
        expect(validator('hi'), equals('too short'));
      });

      test('returns null for empty validator list', () {
        final validator = FormValidators.compose([]);
        expect(validator('anything'), isNull);
      });
    });

    group('requiredEmail', () {
      test('returns null for valid email', () {
        expect(FormValidators.requiredEmail('test@example.com'), isNull);
      });

      test('returns error for empty', () {
        expect(FormValidators.requiredEmail(''), isNotNull);
      });

      test('returns error for invalid format', () {
        expect(FormValidators.requiredEmail('invalid'), isNotNull);
      });
    });

    group('requiredName', () {
      test('returns null for valid name', () {
        expect(FormValidators.requiredName('John'), isNull);
      });

      test('returns error for empty', () {
        expect(FormValidators.requiredName(''), isNotNull);
      });

      test('returns error for too short', () {
        expect(FormValidators.requiredName('A'), isNotNull);
      });

      test('returns error for too long', () {
        final longName = 'A' * 51;
        expect(FormValidators.requiredName(longName), isNotNull);
      });

      test('uses custom field name', () {
        final error = FormValidators.requiredName('', 'Username');
        expect(error, contains('Username'));
      });
    });

    group('requiredRoleName', () {
      test('returns null for valid role name', () {
        expect(FormValidators.requiredRoleName('Admin'), isNull);
      });

      test('returns error for too short', () {
        expect(FormValidators.requiredRoleName('AB'), isNotNull);
      });

      test('returns error for too long', () {
        final longName = 'A' * 51;
        expect(FormValidators.requiredRoleName(longName), isNotNull);
      });
    });

    group('requiredPositiveInteger', () {
      test('returns null for valid positive integer', () {
        expect(FormValidators.requiredPositiveInteger('5'), isNull);
      });

      test('returns error for empty', () {
        expect(FormValidators.requiredPositiveInteger(''), isNotNull);
      });

      test('returns error for zero', () {
        expect(FormValidators.requiredPositiveInteger('0'), isNotNull);
      });

      test('returns error for negative', () {
        expect(FormValidators.requiredPositiveInteger('-1'), isNotNull);
      });
    });

    group('optionalEmail', () {
      test('returns null for valid email', () {
        expect(FormValidators.optionalEmail('test@example.com'), isNull);
      });

      test('returns null for empty', () {
        expect(FormValidators.optionalEmail(''), isNull);
      });

      test('returns null for null', () {
        expect(FormValidators.optionalEmail(null), isNull);
      });

      test('returns error for invalid format', () {
        expect(FormValidators.optionalEmail('invalid'), isNotNull);
      });
    });
  });
}
