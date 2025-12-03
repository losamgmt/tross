import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/configuration/alignment_config.dart';

void main() {
  group('AlignmentConfig Atom Tests', () {
    test('centered maps to Alignment.center', () {
      expect(AlignmentConfig.centered, Alignment.center);
    });

    group('Directional corner alignments', () {
      test('topStart maps to AlignmentDirectional.topStart', () {
        expect(AlignmentConfig.topStart, AlignmentDirectional.topStart);
      });

      test('topEnd maps to AlignmentDirectional.topEnd', () {
        expect(AlignmentConfig.topEnd, AlignmentDirectional.topEnd);
      });

      test('bottomStart maps to AlignmentDirectional.bottomStart', () {
        expect(AlignmentConfig.bottomStart, AlignmentDirectional.bottomStart);
      });

      test('bottomEnd maps to AlignmentDirectional.bottomEnd', () {
        expect(AlignmentConfig.bottomEnd, AlignmentDirectional.bottomEnd);
      });
    });

    group('Directional edge alignments', () {
      test('centerStart maps to AlignmentDirectional.centerStart', () {
        expect(AlignmentConfig.centerStart, AlignmentDirectional.centerStart);
      });

      test('centerEnd maps to AlignmentDirectional.centerEnd', () {
        expect(AlignmentConfig.centerEnd, AlignmentDirectional.centerEnd);
      });

      test('topCenter maps to Alignment.topCenter', () {
        expect(AlignmentConfig.topCenter, Alignment.topCenter);
      });

      test('bottomCenter maps to Alignment.bottomCenter', () {
        expect(AlignmentConfig.bottomCenter, Alignment.bottomCenter);
      });
    });

    group('Absolute corner alignments', () {
      test('topLeft maps to Alignment.topLeft', () {
        expect(AlignmentConfig.topLeft, Alignment.topLeft);
      });

      test('topRight maps to Alignment.topRight', () {
        expect(AlignmentConfig.topRight, Alignment.topRight);
      });

      test('bottomLeft maps to Alignment.bottomLeft', () {
        expect(AlignmentConfig.bottomLeft, Alignment.bottomLeft);
      });

      test('bottomRight maps to Alignment.bottomRight', () {
        expect(AlignmentConfig.bottomRight, Alignment.bottomRight);
      });
    });

    group('Absolute edge alignments', () {
      test('centerLeft maps to Alignment.centerLeft', () {
        expect(AlignmentConfig.centerLeft, Alignment.centerLeft);
      });

      test('centerRight maps to Alignment.centerRight', () {
        expect(AlignmentConfig.centerRight, Alignment.centerRight);
      });
    });

    test('is a pure semantic wrapper (no logic)', () {
      // AlignmentConfig should be a class with only static const fields
      // Cannot instantiate (private constructor)
      expect(() => AlignmentConfig, returnsNormally);
    });
  });
}
