/// Mock HTTP Client for API testing
///
/// Generates MockClient using mockito's code generation.
/// Run: flutter pub run build_runner build --delete-conflicting-outputs
library;

import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';

// This will generate http_client_mock.mocks.dart
@GenerateMocks([http.Client])
void main() {}
