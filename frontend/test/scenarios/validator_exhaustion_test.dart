/// Validator Data Type Exhaustion Tests (Strategy 5)
///
/// Mass-gain pattern: Test ALL toSafe* validator methods with
/// systematic input permutations for maximum coverage.
///
/// Coverage target: validators.dart (118 uncovered lines)
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/utils/validators.dart';

void main() {
  group('Strategy 5: Validator Data Type Exhaustion', () {
    group('toSafeInt', () {
      test('returns int when given int', () {
        expect(Validators.toSafeInt(42, 'test'), 42);
      });

      test('returns null when given null with allowNull', () {
        expect(Validators.toSafeInt(null, 'test', allowNull: true), isNull);
      });

      test('throws when given null without allowNull', () {
        expect(() => Validators.toSafeInt(null, 'test'), throwsArgumentError);
      });

      test('coerces double to int', () {
        expect(Validators.toSafeInt(3.14, 'test'), 3);
      });

      test('parses string to int', () {
        expect(Validators.toSafeInt('42', 'test'), 42);
      });

      test('parses string with whitespace', () {
        expect(Validators.toSafeInt('  42  ', 'test'), 42);
      });

      test('throws for invalid string', () {
        expect(() => Validators.toSafeInt('abc', 'test'), throwsArgumentError);
      });

      test('throws for empty string without allowNull', () {
        expect(() => Validators.toSafeInt('', 'test'), throwsArgumentError);
      });

      test('returns null for empty string with allowNull', () {
        expect(Validators.toSafeInt('', 'test', allowNull: true), isNull);
      });

      test('validates min constraint', () {
        expect(Validators.toSafeInt(5, 'test', min: 1), 5);
        expect(
          () => Validators.toSafeInt(0, 'test', min: 1),
          throwsArgumentError,
        );
      });

      test('validates max constraint', () {
        expect(Validators.toSafeInt(5, 'test', max: 10), 5);
        expect(
          () => Validators.toSafeInt(15, 'test', max: 10),
          throwsArgumentError,
        );
      });

      test('validates min/max on double coercion', () {
        expect(
          () => Validators.toSafeInt(0.5, 'test', min: 1),
          throwsArgumentError,
        );
      });
    });

    group('toSafeDouble', () {
      test('returns double when given double', () {
        expect(Validators.toSafeDouble(3.14, 'test'), 3.14);
      });

      test('returns null when given null with allowNull', () {
        expect(Validators.toSafeDouble(null, 'test', allowNull: true), isNull);
      });

      test('throws when given null without allowNull', () {
        expect(
          () => Validators.toSafeDouble(null, 'test'),
          throwsArgumentError,
        );
      });

      test('coerces int to double', () {
        expect(Validators.toSafeDouble(42, 'test'), 42.0);
      });

      test('parses string to double', () {
        expect(Validators.toSafeDouble('3.14', 'test'), 3.14);
      });

      test('parses string with whitespace', () {
        expect(Validators.toSafeDouble('  3.14  ', 'test'), 3.14);
      });

      test('throws for invalid string', () {
        expect(
          () => Validators.toSafeDouble('abc', 'test'),
          throwsArgumentError,
        );
      });

      test('returns null for empty string with allowNull', () {
        expect(Validators.toSafeDouble('', 'test', allowNull: true), isNull);
      });

      test('validates min constraint', () {
        expect(Validators.toSafeDouble(5.0, 'test', min: 1.0), 5.0);
        expect(
          () => Validators.toSafeDouble(0.5, 'test', min: 1.0),
          throwsArgumentError,
        );
      });

      test('validates max constraint', () {
        expect(Validators.toSafeDouble(5.0, 'test', max: 10.0), 5.0);
        expect(
          () => Validators.toSafeDouble(15.0, 'test', max: 10.0),
          throwsArgumentError,
        );
      });

      test('validates min/max on int coercion', () {
        expect(
          () => Validators.toSafeDouble(0, 'test', min: 1.0),
          throwsArgumentError,
        );
      });

      test('throws for invalid type', () {
        expect(
          () => Validators.toSafeDouble(['array'], 'test'),
          throwsArgumentError,
        );
      });
    });

    group('toSafeString', () {
      test('returns trimmed string', () {
        expect(Validators.toSafeString('  hello  ', 'test'), 'hello');
      });

      test('returns null when given null with allowNull', () {
        expect(Validators.toSafeString(null, 'test', allowNull: true), isNull);
      });

      test('throws when given null without allowNull', () {
        expect(
          () => Validators.toSafeString(null, 'test'),
          throwsArgumentError,
        );
      });

      test('returns null for empty string with allowNull', () {
        expect(Validators.toSafeString('', 'test', allowNull: true), isNull);
      });

      test('throws for empty string without allowNull', () {
        expect(() => Validators.toSafeString('', 'test'), throwsArgumentError);
      });

      test('converts non-string to string', () {
        expect(Validators.toSafeString(42, 'test'), '42');
      });

      test('validates minLength constraint', () {
        expect(Validators.toSafeString('hello', 'test', minLength: 3), 'hello');
        expect(
          () => Validators.toSafeString('hi', 'test', minLength: 3),
          throwsArgumentError,
        );
      });

      test('validates maxLength constraint', () {
        expect(
          Validators.toSafeString('hello', 'test', maxLength: 10),
          'hello',
        );
        expect(
          () => Validators.toSafeString('hello world', 'test', maxLength: 5),
          throwsArgumentError,
        );
      });
    });

    group('toSafeBool', () {
      test('returns bool when given bool', () {
        expect(Validators.toSafeBool(true, 'test'), true);
        expect(Validators.toSafeBool(false, 'test'), false);
      });

      test('returns null when given null with allowNull', () {
        expect(Validators.toSafeBool(null, 'test', allowNull: true), isNull);
      });

      test('throws when given null without allowNull', () {
        expect(() => Validators.toSafeBool(null, 'test'), throwsArgumentError);
      });

      test('parses string true values', () {
        expect(Validators.toSafeBool('true', 'test'), true);
        expect(Validators.toSafeBool('TRUE', 'test'), true);
        expect(Validators.toSafeBool('1', 'test'), true);
        expect(Validators.toSafeBool('yes', 'test'), true);
      });

      test('parses string false values', () {
        expect(Validators.toSafeBool('false', 'test'), false);
        expect(Validators.toSafeBool('FALSE', 'test'), false);
        expect(Validators.toSafeBool('0', 'test'), false);
        expect(Validators.toSafeBool('no', 'test'), false);
      });

      test('throws for invalid string', () {
        expect(
          () => Validators.toSafeBool('maybe', 'test'),
          throwsArgumentError,
        );
      });

      test('coerces int to bool', () {
        expect(Validators.toSafeBool(1, 'test'), true);
        expect(Validators.toSafeBool(0, 'test'), false);
        expect(Validators.toSafeBool(-1, 'test'), true);
      });

      test('throws for invalid type', () {
        expect(
          () => Validators.toSafeBool(['array'], 'test'),
          throwsArgumentError,
        );
      });
    });

    group('toSafeDateTime', () {
      test('returns DateTime when given DateTime', () {
        final now = DateTime.now();
        expect(Validators.toSafeDateTime(now, 'test'), now);
      });

      test('returns null when given null with allowNull', () {
        expect(
          Validators.toSafeDateTime(null, 'test', allowNull: true),
          isNull,
        );
      });

      test('throws when given null without allowNull', () {
        expect(
          () => Validators.toSafeDateTime(null, 'test'),
          throwsArgumentError,
        );
      });

      test('parses ISO8601 string', () {
        final result = Validators.toSafeDateTime(
          '2025-01-13T10:30:00Z',
          'test',
        );
        expect(result, isA<DateTime>());
        expect(result!.year, 2025);
      });

      test('returns null for empty string with allowNull', () {
        expect(Validators.toSafeDateTime('', 'test', allowNull: true), isNull);
      });

      test('throws for empty string without allowNull', () {
        expect(
          () => Validators.toSafeDateTime('', 'test'),
          throwsArgumentError,
        );
      });

      test('throws for invalid date string', () {
        expect(
          () => Validators.toSafeDateTime('not-a-date', 'test'),
          throwsArgumentError,
        );
      });

      test('throws for invalid type', () {
        expect(
          () => Validators.toSafeDateTime(12345, 'test'),
          throwsArgumentError,
        );
      });
    });

    group('toSafeEmail', () {
      test('returns valid email', () {
        expect(
          Validators.toSafeEmail('test@example.com', 'email'),
          'test@example.com',
        );
      });

      test('throws for invalid email format', () {
        expect(
          () => Validators.toSafeEmail('not-an-email', 'email'),
          throwsArgumentError,
        );
      });

      test('throws for missing domain', () {
        expect(
          () => Validators.toSafeEmail('test@', 'email'),
          throwsArgumentError,
        );
      });

      test('throws for null', () {
        expect(
          () => Validators.toSafeEmail(null, 'email'),
          throwsArgumentError,
        );
      });

      test('accepts complex valid emails', () {
        expect(
          Validators.toSafeEmail('user.name+tag@sub.domain.com', 'email'),
          'user.name+tag@sub.domain.com',
        );
      });
    });

    group('toSafeUuid', () {
      test('returns valid UUID v4', () {
        const validUuid = '550e8400-e29b-41d4-a716-446655440000';
        expect(Validators.toSafeUuid(validUuid, 'id'), validUuid);
      });

      test('returns null when given null with allowNull', () {
        expect(Validators.toSafeUuid(null, 'id', allowNull: true), isNull);
      });

      test('throws when given null without allowNull', () {
        expect(() => Validators.toSafeUuid(null, 'id'), throwsArgumentError);
      });

      test('returns null for empty string with allowNull', () {
        expect(Validators.toSafeUuid('', 'id', allowNull: true), isNull);
      });

      test('throws for empty string without allowNull', () {
        expect(() => Validators.toSafeUuid('', 'id'), throwsArgumentError);
      });

      test('throws for invalid UUID format', () {
        expect(
          () => Validators.toSafeUuid('not-a-uuid', 'id'),
          throwsArgumentError,
        );
      });

      test('throws for non-v4 UUID', () {
        // Version 1 UUID (has 1 instead of 4)
        expect(
          () => Validators.toSafeUuid(
            '550e8400-e29b-11d4-a716-446655440000',
            'id',
          ),
          throwsArgumentError,
        );
      });

      test('throws for non-string type', () {
        expect(() => Validators.toSafeUuid(12345, 'id'), throwsArgumentError);
      });
    });

    // Form Validators (return String? for TextFormField)
    group('required (form)', () {
      test('returns null for valid input', () {
        expect(Validators.required('hello'), isNull);
      });

      test('returns error for null', () {
        expect(Validators.required(null), isNotNull);
      });

      test('returns error for empty string', () {
        expect(Validators.required(''), isNotNull);
      });

      test('returns error for whitespace only', () {
        expect(Validators.required('   '), isNotNull);
      });

      test('uses custom field name', () {
        final error = Validators.required(null, fieldName: 'Email');
        expect(error, contains('Email'));
      });
    });

    group('email (form)', () {
      test('returns null for valid email', () {
        expect(Validators.email('test@example.com'), isNull);
      });

      test('returns error for invalid email', () {
        expect(Validators.email('not-an-email'), isNotNull);
      });

      test('returns error for null', () {
        expect(Validators.email(null), isNotNull);
      });

      test('accepts complex valid emails', () {
        expect(Validators.email('user.name+tag@domain.com'), isNull);
      });
    });

    group('minLength', () {
      test('returns null for sufficient length', () {
        expect(Validators.minLength('hello', 3), isNull);
      });

      test('returns error for too short', () {
        expect(Validators.minLength('hi', 3), isNotNull);
      });

      test('returns error for null', () {
        expect(Validators.minLength(null, 3), isNotNull);
      });
    });

    group('maxLength', () {
      test('returns null for acceptable length', () {
        expect(Validators.maxLength('hello', 10), isNull);
      });

      test('returns error for too long', () {
        expect(Validators.maxLength('hello world', 5), isNotNull);
      });

      test('returns null for null input', () {
        expect(Validators.maxLength(null, 10), isNull);
      });
    });

    group('integer (form)', () {
      test('returns null for valid integer string', () {
        expect(Validators.integer('42'), isNull);
      });

      test('returns null for empty string', () {
        expect(Validators.integer(''), isNull);
      });

      test('returns error for non-integer', () {
        expect(Validators.integer('abc'), isNotNull);
      });
    });

    group('positive', () {
      test('returns null for positive integer', () {
        expect(Validators.positive('5'), isNull);
      });

      test('returns error for zero', () {
        expect(Validators.positive('0'), isNotNull);
      });

      test('returns error for negative', () {
        expect(Validators.positive('-1'), isNotNull);
      });

      test('returns null for empty string', () {
        expect(Validators.positive(''), isNull);
      });
    });

    group('integerRange', () {
      test('returns null for value in range', () {
        expect(Validators.integerRange('5', min: 1, max: 10), isNull);
      });

      test('returns error for below min', () {
        expect(Validators.integerRange('0', min: 1), isNotNull);
      });

      test('returns error for above max', () {
        expect(Validators.integerRange('15', max: 10), isNotNull);
      });

      test('returns null for empty string', () {
        expect(Validators.integerRange(''), isNull);
      });
    });

    group('combine', () {
      test('returns first error found', () {
        final error = Validators.combine([
          () => null, // passes
          () => 'Error 1',
          () => 'Error 2',
        ]);
        expect(error, 'Error 1');
      });

      test('returns null if all pass', () {
        final error = Validators.combine([() => null, () => null]);
        expect(error, isNull);
      });
    });
  });
}
