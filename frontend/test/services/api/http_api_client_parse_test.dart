/// HttpApiClient response-envelope parsing tests.
///
/// Exercises the pure parseSuccessResponse / parseSuccessListResponse helpers
/// (no HTTP required) to lock in fail-loud behaviour on malformed success
/// envelopes: a typed [ApiException] is thrown, surfacing the backend's own
/// `code`/`message` when the 2xx body carries them.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tross/services/api/api_exception.dart';
import 'package:tross/services/api/http_api_client.dart';

void main() {
  final client = HttpApiClient();

  Map<String, dynamic> identity(Map<String, dynamic> json) => json;

  group('HttpApiClient.parseSuccessResponse', () {
    test('returns parsed data for a well-formed success envelope', () {
      final result = client.parseSuccessResponse({
        'success': true,
        'data': {'id': 7},
      }, identity);
      expect(result, {'id': 7});
    });

    test('throws ApiException when the success envelope is missing', () {
      expect(
        () => client.parseSuccessResponse({'foo': 'bar'}, identity),
        throwsA(isA<ApiException>()),
      );
    });

    test('throws ApiException when success is false', () {
      expect(
        () => client.parseSuccessResponse({
          'success': false,
          'data': {'id': 1},
        }, identity),
        throwsA(isA<ApiException>()),
      );
    });

    test('surfaces the backend code and message from a 2xx error envelope', () {
      try {
        client.parseSuccessResponse({
          'success': false,
          'code': 'VALIDATION_FAILED',
          'message': 'Name is required',
        }, identity);
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'VALIDATION_FAILED');
        expect(e.message, 'Name is required');
      }
    });

    test('falls back to a MALFORMED_RESPONSE code when none is provided', () {
      try {
        client.parseSuccessResponse({'success': true}, identity); // no data
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'MALFORMED_RESPONSE');
        expect(e.message, contains('Malformed success response'));
      }
    });
  });

  group('HttpApiClient.parseSuccessListResponse', () {
    test('returns parsed list for a well-formed success envelope', () {
      final result = client.parseSuccessListResponse({
        'success': true,
        'data': [
          {'id': 1},
          {'id': 2},
        ],
      }, identity);
      expect(result, [
        {'id': 1},
        {'id': 2},
      ]);
    });

    test('throws ApiException when the success envelope is malformed', () {
      expect(
        () => client.parseSuccessListResponse({'data': null}, identity),
        throwsA(isA<ApiException>()),
      );
    });
  });
}
