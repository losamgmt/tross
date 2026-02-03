import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/platform_utilities.dart';

void main() {
  group('PlatformUtilities', () {
    test('minTouchTarget is 48dp per Material Design', () {
      expect(PlatformUtilities.minTouchTarget, equals(48.0));
    });

    test('minPointerTarget is 24dp', () {
      expect(PlatformUtilities.minPointerTarget, equals(24.0));
    });

    test('minInteractiveSize returns valid value', () {
      final size = PlatformUtilities.minInteractiveSize;
      expect([24.0, 48.0], contains(size));
    });

    test('adaptive returns value based on platform', () {
      final result = PlatformUtilities.adaptive(
        pointer: 'pointer_value',
        touch: 'touch_value',
      );
      expect(['pointer_value', 'touch_value'], contains(result));
    });

    test('adaptiveSize returns double values', () {
      final result = PlatformUtilities.adaptiveSize(pointer: 8.0, touch: 48.0);
      expect(result, isA<double>());
      expect([8.0, 48.0], contains(result));
    });

    test('isTouchDevice equals isMobile', () {
      expect(
        PlatformUtilities.isTouchDevice,
        equals(PlatformUtilities.isMobile),
      );
    });

    test('isPointerDevice equals isWeb or isDesktop', () {
      expect(
        PlatformUtilities.isPointerDevice,
        equals(PlatformUtilities.isWeb || PlatformUtilities.isDesktop),
      );
    });
  });
}
