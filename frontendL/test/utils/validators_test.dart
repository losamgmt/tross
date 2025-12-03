/// Validators Test Suite
///
/// Comprehensive tests for all data validators.
/// Defensive testing: Focus on edge cases that would cause crashes.
///
/// Testing strategy matches backend:
/// - null, undefined, empty strings
/// - Wrong types (objects, booleans as integers)
/// - Range violations
/// - Malformed data
///
/// Goal: Prevent runtime errors from API responses
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/validators.dart';

void main() {
  group('Validators - Data Validation (toSafe* methods)', () {
    // ========================================================================
    // toSafeInt - Integer validation and coercion
    // ========================================================================
    group('toSafeInt()', () {
      group('✅ Valid inputs', () {
        test('accepts valid integer', () {
          expect(Validators.toSafeInt(42, 'id'), 42);
        });

        test('accepts integer as string and coerces', () {
          expect(Validators.toSafeInt('123', 'id'), 123);
        });

        test('accepts string with whitespace', () {
          expect(Validators.toSafeInt('  42  ', 'id'), 42);
        });

        test('coerces double to integer (3.14 → 3)', () {
          expect(Validators.toSafeInt(3.14, 'value'), 3);
        });

        test('accepts minimum value with custom min', () {
          expect(Validators.toSafeInt(0, 'page', min: 0), 0);
        });

        test('accepts value within custom range', () {
          expect(Validators.toSafeInt(50, 'limit', min: 1, max: 100), 50);
        });

        test('accepts null when allowNull is true', () {
          expect(Validators.toSafeInt(null, 'id', allowNull: true), null);
        });

        test('accepts empty string when allowNull is true', () {
          expect(Validators.toSafeInt('', 'id', allowNull: true), null);
        });
      });

      group('❌ Invalid inputs - null/empty', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeInt(null, 'id'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                'id is required but received null',
              ),
            ),
          );
        });

        test('rejects empty string by default', () {
          expect(
            () => Validators.toSafeInt('', 'id'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                'id is required but received empty string',
              ),
            ),
          );
        });
      });

      group('❌ Invalid inputs - wrong types', () {
        test('rejects non-numeric string', () {
          expect(
            () => Validators.toSafeInt('abc', 'id'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid integer'),
              ),
            ),
          );
        });

        test('rejects boolean', () {
          expect(
            () => Validators.toSafeInt(true, 'id'),
            throwsA(isA<ArgumentError>()),
          );
        });
      });

      group('❌ Invalid inputs - range violations', () {
        test('rejects value below min', () {
          expect(
            () => Validators.toSafeInt(-5, 'id', min: 1),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be at least 1'),
              ),
            ),
          );
        });

        test('rejects value above max', () {
          expect(
            () => Validators.toSafeInt(150, 'limit', max: 100),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be at most 100'),
              ),
            ),
          );
        });
      });
    });

    // ========================================================================
    // toSafeDouble - Floating-point validation
    // ========================================================================
    group('toSafeDouble()', () {
      group('✅ Valid inputs', () {
        test('accepts valid double', () {
          expect(Validators.toSafeDouble(3.14, 'value'), 3.14);
        });

        test('coerces integer to double', () {
          expect(Validators.toSafeDouble(42, 'value'), 42.0);
        });

        test('accepts double as string', () {
          expect(Validators.toSafeDouble('3.14', 'value'), 3.14);
        });

        test('accepts string with whitespace', () {
          expect(Validators.toSafeDouble('  2.5  ', 'value'), 2.5);
        });

        test('accepts null when allowNull is true', () {
          expect(Validators.toSafeDouble(null, 'value', allowNull: true), null);
        });

        test('validates min range', () {
          expect(Validators.toSafeDouble(5.0, 'value', min: 0.0), 5.0);
        });

        test('validates max range', () {
          expect(Validators.toSafeDouble(50.0, 'value', max: 100.0), 50.0);
        });
      });

      group('❌ Invalid inputs', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeDouble(null, 'value'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects non-numeric string', () {
          expect(
            () => Validators.toSafeDouble('not_a_number', 'value'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid number'),
              ),
            ),
          );
        });

        test('rejects value below min', () {
          expect(
            () => Validators.toSafeDouble(-5.0, 'value', min: 0.0),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be at least'),
              ),
            ),
          );
        });
      });
    });

    // ========================================================================
    // toSafeString - String validation with length constraints
    // ========================================================================
    group('toSafeString()', () {
      group('✅ Valid inputs', () {
        test('accepts valid string', () {
          expect(Validators.toSafeString('hello', 'name'), 'hello');
        });

        test('trims whitespace', () {
          expect(Validators.toSafeString('  hello  ', 'name'), 'hello');
        });

        test('coerces number to string', () {
          expect(Validators.toSafeString(123, 'value'), '123');
        });

        test('accepts null when allowNull is true', () {
          expect(Validators.toSafeString(null, 'name', allowNull: true), null);
        });

        test('validates minLength', () {
          expect(Validators.toSafeString('abc', 'code', minLength: 3), 'abc');
        });

        test('validates maxLength', () {
          expect(
            Validators.toSafeString('hello', 'name', maxLength: 10),
            'hello',
          );
        });
      });

      group('❌ Invalid inputs', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeString(null, 'name'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects empty string by default', () {
          expect(
            () => Validators.toSafeString('', 'name'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects whitespace-only string', () {
          expect(
            () => Validators.toSafeString('   ', 'name'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects string below minLength', () {
          expect(
            () => Validators.toSafeString('ab', 'code', minLength: 3),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be at least 3 characters'),
              ),
            ),
          );
        });

        test('rejects string above maxLength', () {
          expect(
            () =>
                Validators.toSafeString('verylongstring', 'code', maxLength: 5),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be at most 5 characters'),
              ),
            ),
          );
        });
      });
    });

    // ========================================================================
    // toSafeBool - Boolean validation and coercion
    // ========================================================================
    group('toSafeBool()', () {
      group('✅ Valid inputs', () {
        test('accepts true', () {
          expect(Validators.toSafeBool(true, 'flag'), true);
        });

        test('accepts false', () {
          expect(Validators.toSafeBool(false, 'flag'), false);
        });

        test('coerces "true" string to true', () {
          expect(Validators.toSafeBool('true', 'flag'), true);
        });

        test('coerces "false" string to false', () {
          expect(Validators.toSafeBool('false', 'flag'), false);
        });

        test('coerces "1" to true', () {
          expect(Validators.toSafeBool('1', 'flag'), true);
        });

        test('coerces "0" to false', () {
          expect(Validators.toSafeBool('0', 'flag'), false);
        });

        test('coerces "yes" to true', () {
          expect(Validators.toSafeBool('yes', 'flag'), true);
        });

        test('coerces "no" to false', () {
          expect(Validators.toSafeBool('no', 'flag'), false);
        });

        test('coerces integer 1 to true', () {
          expect(Validators.toSafeBool(1, 'flag'), true);
        });

        test('coerces integer 0 to false', () {
          expect(Validators.toSafeBool(0, 'flag'), false);
        });

        test('accepts null when allowNull is true', () {
          expect(Validators.toSafeBool(null, 'flag', allowNull: true), null);
        });
      });

      group('❌ Invalid inputs', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeBool(null, 'flag'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects invalid string', () {
          expect(
            () => Validators.toSafeBool('invalid', 'flag'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid boolean'),
              ),
            ),
          );
        });
      });
    });

    // ========================================================================
    // toSafeDateTime - DateTime validation
    // ========================================================================
    group('toSafeDateTime()', () {
      group('✅ Valid inputs', () {
        test('accepts DateTime object', () {
          final dt = DateTime(2025, 1, 1);
          expect(Validators.toSafeDateTime(dt, 'timestamp'), dt);
        });

        test('parses ISO8601 string', () {
          final result = Validators.toSafeDateTime(
            '2025-01-01T00:00:00.000Z',
            'timestamp',
          );
          expect(result!.year, 2025);
          expect(result.month, 1);
          expect(result.day, 1);
        });

        test('accepts null when allowNull is true', () {
          expect(
            Validators.toSafeDateTime(null, 'timestamp', allowNull: true),
            null,
          );
        });

        test('accepts empty string when allowNull is true', () {
          expect(
            Validators.toSafeDateTime('', 'timestamp', allowNull: true),
            null,
          );
        });
      });

      group('❌ Invalid inputs', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeDateTime(null, 'timestamp'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects empty string by default', () {
          expect(
            () => Validators.toSafeDateTime('', 'timestamp'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects invalid date string', () {
          expect(
            () => Validators.toSafeDateTime('not-a-date', 'timestamp'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid ISO8601 date string'),
              ),
            ),
          );
        });

        test('rejects wrong type', () {
          expect(
            () => Validators.toSafeDateTime(12345, 'timestamp'),
            throwsA(isA<ArgumentError>()),
          );
        });
      });
    });

    // ========================================================================
    // toSafeEmail - Email validation
    // ========================================================================
    group('toSafeEmail()', () {
      group('✅ Valid emails', () {
        test('accepts standard email', () {
          expect(
            Validators.toSafeEmail('user@example.com', 'email'),
            'user@example.com',
          );
        });

        test('accepts email with plus sign', () {
          expect(
            Validators.toSafeEmail('user+tag@example.com', 'email'),
            'user+tag@example.com',
          );
        });

        test('accepts email with numbers', () {
          expect(
            Validators.toSafeEmail('user123@example.com', 'email'),
            'user123@example.com',
          );
        });

        test('trims whitespace', () {
          expect(
            Validators.toSafeEmail('  user@example.com  ', 'email'),
            'user@example.com',
          );
        });
      });

      group('❌ Invalid emails', () {
        test('rejects null', () {
          expect(
            () => Validators.toSafeEmail(null, 'email'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects email without @', () {
          expect(
            () => Validators.toSafeEmail('userexample.com', 'email'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid email'),
              ),
            ),
          );
        });

        test('rejects email without domain', () {
          expect(
            () => Validators.toSafeEmail('user@', 'email'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects email without TLD', () {
          expect(
            () => Validators.toSafeEmail('user@example', 'email'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects empty string', () {
          expect(
            () => Validators.toSafeEmail('', 'email'),
            throwsA(isA<ArgumentError>()),
          );
        });
      });
    });

    // ========================================================================
    // toSafeUuid - UUID v4 validation
    // ========================================================================
    group('toSafeUuid()', () {
      group('✅ Valid UUIDs', () {
        test('accepts valid UUID v4', () {
          const uuid = '550e8400-e29b-41d4-a716-446655440000';
          expect(Validators.toSafeUuid(uuid, 'token'), uuid);
        });

        test('accepts UUID with uppercase', () {
          const uuid = '550E8400-E29B-41D4-A716-446655440000';
          expect(Validators.toSafeUuid(uuid, 'token'), uuid);
        });

        test('accepts null when allowNull is true', () {
          expect(Validators.toSafeUuid(null, 'token', allowNull: true), null);
        });

        test('accepts empty string when allowNull is true', () {
          expect(Validators.toSafeUuid('', 'token', allowNull: true), null);
        });
      });

      group('❌ Invalid UUIDs', () {
        test('rejects null by default', () {
          expect(
            () => Validators.toSafeUuid(null, 'token'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects non-string', () {
          expect(
            () => Validators.toSafeUuid(123, 'token'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid UUID string'),
              ),
            ),
          );
        });

        test('rejects invalid UUID format', () {
          expect(
            () => Validators.toSafeUuid('not-a-uuid', 'token'),
            throwsA(
              isA<ArgumentError>().having(
                (e) => e.message,
                'message',
                contains('must be a valid UUID v4'),
              ),
            ),
          );
        });

        test('rejects UUID v1 (wrong version)', () {
          // UUID v1 has different version bit (1 instead of 4)
          const uuidV1 = '550e8400-e29b-11d4-a716-446655440000';
          expect(
            () => Validators.toSafeUuid(uuidV1, 'token'),
            throwsA(isA<ArgumentError>()),
          );
        });

        test('rejects empty string by default', () {
          expect(
            () => Validators.toSafeUuid('', 'token'),
            throwsA(isA<ArgumentError>()),
          );
        });
      });
    });
  });

  // ==========================================================================
  // USER INPUT VALIDATION (Form Field Validators)
  // ==========================================================================
  group('Validators - Form Validation (String? return)', () {
    group('required()', () {
      test('returns null for valid input', () {
        expect(Validators.required('hello'), null);
      });

      test('returns error for null', () {
        expect(Validators.required(null), 'Field is required');
      });

      test('returns error for empty string', () {
        expect(Validators.required(''), 'Field is required');
      });

      test('returns error for whitespace', () {
        expect(Validators.required('   '), 'Field is required');
      });

      test('uses custom field name', () {
        expect(
          Validators.required(null, fieldName: 'Email'),
          'Email is required',
        );
      });
    });

    group('email()', () {
      test('returns null for valid email', () {
        expect(Validators.email('user@example.com'), null);
      });

      test('returns error for invalid email', () {
        expect(Validators.email('invalid'), isNotNull);
      });

      test('returns error for null', () {
        expect(Validators.email(null), isNotNull);
      });
    });

    group('minLength()', () {
      test('returns null for valid length', () {
        expect(Validators.minLength('hello', 3), null);
      });

      test('returns error for too short', () {
        final result = Validators.minLength('hi', 3);
        expect(result, contains('must be at least 3 characters'));
      });

      test('returns error for null', () {
        expect(Validators.minLength(null, 3), isNotNull);
      });
    });

    group('maxLength()', () {
      test('returns null for valid length', () {
        expect(Validators.maxLength('hello', 10), null);
      });

      test('returns error for too long', () {
        final result = Validators.maxLength('verylongstring', 5);
        expect(result, contains('must be at most 5 characters'));
      });

      test('returns null for null', () {
        expect(Validators.maxLength(null, 5), null);
      });
    });

    group('integer()', () {
      test('returns null for valid integer', () {
        expect(Validators.integer('42'), null);
      });

      test('returns error for non-integer', () {
        final result = Validators.integer('abc');
        expect(result, contains('must be a valid integer'));
      });

      test('returns null for empty', () {
        expect(Validators.integer(''), null);
      });
    });

    group('positive()', () {
      test('returns null for positive integer', () {
        expect(Validators.positive('5'), null);
      });

      test('returns error for zero', () {
        final result = Validators.positive('0');
        expect(result, contains('must be at least 1'));
      });

      test('returns error for negative', () {
        final result = Validators.positive('-5');
        expect(result, contains('must be at least 1'));
      });
    });

    group('integerRange()', () {
      test('returns null for value in range', () {
        expect(Validators.integerRange('50', min: 1, max: 100), null);
      });

      test('returns error for value below min', () {
        final result = Validators.integerRange('0', min: 1);
        expect(result, contains('must be at least 1'));
      });

      test('returns error for value above max', () {
        final result = Validators.integerRange('150', max: 100);
        expect(result, contains('must be at most 100'));
      });
    });

    group('combine()', () {
      test('returns first error', () {
        final result = Validators.combine([
          () => Validators.required(null),
          () => Validators.minLength('hi', 5),
        ]);
        expect(result, 'Field is required');
      });

      test('returns null if all pass', () {
        final result = Validators.combine([
          () => Validators.required('hello'),
          () => Validators.minLength('hello', 3),
          () => Validators.maxLength('hello', 10),
        ]);
        expect(result, null);
      });
    });
  });
}
