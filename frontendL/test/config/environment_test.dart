import 'package:flutter_test/flutter_test.dart';
import 'package:tross_app/config/environment.dart';

void main() {
  group('Environment Configuration', () {
    test('has default API base URL for development', () {
      expect(Environment.apiBaseUrl, 'http://localhost:3001/api');
    });

    test('has default frontend URL for development', () {
      expect(Environment.frontendUrl, 'http://localhost:8080');
    });

    test('development mode is enabled in tests', () {
      expect(Environment.isDevelopment, true);
      expect(Environment.isProduction, false);
    });

    test('debug features enabled in development', () {
      expect(Environment.enableDevTools, true);
      expect(Environment.enableDebugLogging, true);
    });

    test('has reasonable API timeout values', () {
      expect(Environment.apiTimeout.inSeconds, 30);
      expect(Environment.apiConnectionTimeout.inSeconds, 10);
    });
  });
}
