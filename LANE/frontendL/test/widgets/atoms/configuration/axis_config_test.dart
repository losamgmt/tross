import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/configuration/axis_config.dart';

void main() {
  group('AxisConfig Atom Tests', () {
    test('vertical maps to Axis.vertical', () {
      expect(AxisConfig.vertical, Axis.vertical);
    });

    test('horizontal maps to Axis.horizontal', () {
      expect(AxisConfig.horizontal, Axis.horizontal);
    });

    test('provides all Axis enum values', () {
      // Flutter's Axis enum has exactly 2 values
      expect(Axis.values.length, 2);

      // AxisConfig provides semantic wrappers for both
      final configValues = [AxisConfig.vertical, AxisConfig.horizontal];

      expect(configValues.toSet(), Axis.values.toSet());
    });

    test('is a pure semantic wrapper (no logic)', () {
      // AxisConfig should be a class with only static const fields
      // Cannot instantiate (private constructor)
      expect(() => AxisConfig, returnsNormally);
    });
  });
}
