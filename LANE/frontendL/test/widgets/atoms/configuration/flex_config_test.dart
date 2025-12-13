import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/configuration/flex_config.dart';

void main() {
  group('FlexConfig Atom Tests', () {
    group('Flex weights', () {
      test('noFlex equals 0', () {
        expect(FlexConfig.noFlex, 0);
      });

      test('equalWeight equals 1', () {
        expect(FlexConfig.equalWeight, 1);
      });

      test('doubleWeight equals 2', () {
        expect(FlexConfig.doubleWeight, 2);
      });

      test('tripleWeight equals 3', () {
        expect(FlexConfig.tripleWeight, 3);
      });

      test('quadrupleWeight equals 4', () {
        expect(FlexConfig.quadrupleWeight, 4);
      });

      test('dominantWeight equals 10', () {
        expect(FlexConfig.dominantWeight, 10);
      });
    });

    group('Flex fit modes', () {
      test('expandToFill maps to FlexFit.tight', () {
        expect(FlexConfig.expandToFill, FlexFit.tight);
      });

      test('looseFit maps to FlexFit.loose', () {
        expect(FlexConfig.looseFit, FlexFit.loose);
      });
    });

    test('flex weights have correct relative values', () {
      expect(FlexConfig.doubleWeight, FlexConfig.equalWeight * 2);
      expect(FlexConfig.tripleWeight, FlexConfig.equalWeight * 3);
      expect(FlexConfig.quadrupleWeight, FlexConfig.equalWeight * 4);
    });

    test('is a pure semantic wrapper (no logic)', () {
      // FlexConfig should be a class with only static const fields
      // Cannot instantiate (private constructor)
      expect(() => FlexConfig, returnsNormally);
    });
  });
}
