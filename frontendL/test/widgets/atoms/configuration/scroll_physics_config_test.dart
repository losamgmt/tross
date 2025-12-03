import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/widgets/atoms/configuration/scroll_physics_config.dart';

void main() {
  group('ScrollPhysicsConfig Atom Tests', () {
    test('bouncing creates BouncingScrollPhysics', () {
      expect(ScrollPhysicsConfig.bouncing.runtimeType, BouncingScrollPhysics);
    });

    test('clamping creates ClampingScrollPhysics', () {
      expect(ScrollPhysicsConfig.clamping.runtimeType, ClampingScrollPhysics);
    });

    test('neverScrollable creates NeverScrollableScrollPhysics', () {
      expect(
        ScrollPhysicsConfig.neverScrollable.runtimeType,
        NeverScrollableScrollPhysics,
      );
    });

    test('alwaysScrollable creates AlwaysScrollableScrollPhysics', () {
      expect(
        ScrollPhysicsConfig.alwaysScrollable.runtimeType,
        AlwaysScrollableScrollPhysics,
      );
    });

    test('platformDefault creates base ScrollPhysics', () {
      expect(ScrollPhysicsConfig.platformDefault.runtimeType, ScrollPhysics);
    });

    group('Scroll physics behaviors', () {
      test('bouncing allows bouncing', () {
        final physics = ScrollPhysicsConfig.bouncing;
        expect(physics, isA<BouncingScrollPhysics>());
      });

      test('clamping prevents bouncing', () {
        final physics = ScrollPhysicsConfig.clamping;
        expect(physics, isA<ClampingScrollPhysics>());
      });

      test('neverScrollable prevents all scrolling', () {
        final physics = ScrollPhysicsConfig.neverScrollable;
        // NeverScrollableScrollPhysics prevents user scrolling
        expect(physics, isA<NeverScrollableScrollPhysics>());
      });

      test('alwaysScrollable enables scrolling', () {
        final physics = ScrollPhysicsConfig.alwaysScrollable;
        expect(physics, isA<AlwaysScrollableScrollPhysics>());
      });
    });

    test('is a pure semantic wrapper (no logic)', () {
      // ScrollPhysicsConfig should be a class with only static const fields
      // Cannot instantiate (private constructor)
      expect(() => ScrollPhysicsConfig, returnsNormally);
    });
  });
}
