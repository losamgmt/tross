import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/utils/helpers/string_helper.dart';

void main() {
  group('StringHelper', () {
    group('capitalize', () {
      test('capitalizes first letter of lowercase string', () {
        expect(StringHelper.capitalize('admin'), 'Admin');
      });

      test('capitalizes first letter of uppercase string', () {
        expect(StringHelper.capitalize('USER'), 'USER');
      });

      test('capitalizes single character', () {
        expect(StringHelper.capitalize('a'), 'A');
      });

      test('returns empty string for empty input', () {
        expect(StringHelper.capitalize(''), '');
      });

      test('returns empty string for null input', () {
        expect(StringHelper.capitalize(null), '');
      });

      test('handles mixed case', () {
        expect(StringHelper.capitalize('hELLO'), 'HELLO');
      });
    });

    group('getInitial', () {
      test('returns first character uppercased', () {
        expect(StringHelper.getInitial('John Doe'), 'J');
      });

      test('returns uppercase for lowercase input', () {
        expect(StringHelper.getInitial('alice'), 'A');
      });

      test('returns fallback for empty string', () {
        expect(StringHelper.getInitial('', fallback: 'U'), 'U');
      });

      test('returns fallback for null', () {
        expect(StringHelper.getInitial(null), 'U');
      });

      test('uses custom fallback', () {
        expect(StringHelper.getInitial('', fallback: 'X'), 'X');
      });
    });

    group('toUpperCase', () {
      test('converts lowercase to uppercase', () {
        expect(StringHelper.toUpperCase('admin'), 'ADMIN');
      });

      test('handles already uppercase', () {
        expect(StringHelper.toUpperCase('USER'), 'USER');
      });

      test('handles mixed case', () {
        expect(StringHelper.toUpperCase('Hello World'), 'HELLO WORLD');
      });

      test('returns empty string for null', () {
        expect(StringHelper.toUpperCase(null), '');
      });

      test('returns empty string for empty input', () {
        expect(StringHelper.toUpperCase(''), '');
      });
    });

    group('toLowerCase', () {
      test('converts uppercase to lowercase', () {
        expect(StringHelper.toLowerCase('ADMIN'), 'admin');
      });

      test('handles already lowercase', () {
        expect(StringHelper.toLowerCase('user'), 'user');
      });

      test('handles mixed case', () {
        expect(StringHelper.toLowerCase('Hello World'), 'hello world');
      });

      test('returns empty string for null', () {
        expect(StringHelper.toLowerCase(null), '');
      });

      test('returns empty string for empty input', () {
        expect(StringHelper.toLowerCase(''), '');
      });
    });

    group('trim', () {
      test('trims leading and trailing whitespace', () {
        expect(StringHelper.trim('  hello  '), 'hello');
      });

      test('trims tabs and newlines', () {
        expect(StringHelper.trim('\t\nhello\n\t'), 'hello');
      });

      test('handles string without whitespace', () {
        expect(StringHelper.trim('hello'), 'hello');
      });

      test('returns empty string for null', () {
        expect(StringHelper.trim(null), '');
      });

      test('returns empty string for whitespace only', () {
        expect(StringHelper.trim('   '), '');
      });
    });

    group('snakeToTitle', () {
      test('converts snake_case to Title Case', () {
        expect(StringHelper.snakeToTitle('work_order'), 'Work Order');
      });

      test('handles multiple underscores', () {
        expect(
          StringHelper.snakeToTitle('before_photo_url'),
          'Before Photo Url',
        );
      });

      test('handles single word', () {
        expect(StringHelper.snakeToTitle('customer'), 'Customer');
      });

      test('returns empty string for null', () {
        expect(StringHelper.snakeToTitle(null), '');
      });

      test('returns empty string for empty input', () {
        expect(StringHelper.snakeToTitle(''), '');
      });

      test('handles leading underscore', () {
        expect(StringHelper.snakeToTitle('_private_field'), ' Private Field');
      });
    });
  });
}
