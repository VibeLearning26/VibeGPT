/// API base URL configured via --dart-define
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

/// API version prefix
const String apiPrefix = '/api/v1';

/// Full API URL
String get apiUrl => '$apiBaseUrl$apiPrefix';
