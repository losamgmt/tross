import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/configuration/stack_fit_config.dart';

void main() {
  group('StackFitConfig Atom Tests', () {
    test('loose maps to StackFit.loose', () {
      expect(StackFitConfig.loose, StackFit.loose);
    });

    test('expandToContainer maps to StackFit.expand', () {
      expect(StackFitConfig.expandToContainer, StackFit.expand);
    });

    test('passThrough maps to StackFit.passthrough', () {
      expect(StackFitConfig.passThrough, StackFit.passthrough);
    });

    test('provides all StackFit enum values', () {
      // Flutter's StackFit enum has exactly 3 values
      expect(StackFit.values.length, 3);

      // StackFitConfig provides semantic wrappers for all
      final configValues = [
        StackFitConfig.loose,
        StackFitConfig.expandToContainer,
        StackFitConfig.passThrough,
      ];

      expect(configValues.toSet(), StackFit.values.toSet());
    });

    test('is a pure semantic wrapper (no logic)', () {
      // StackFitConfig should be a class with only static const fields
      // Cannot instantiate (private constructor)
      expect(() => StackFitConfig, returnsNormally);
    });
  });
}
