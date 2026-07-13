// Basic smoke test for the VibeGPT mobile app.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:vibegpt_mobile/main.dart';

void main() {
  testWidgets('App builds and shows the splash screen', (
    WidgetTester tester,
  ) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: VibeGPTApp()));

    // The splash screen shows the app name on launch.
    expect(find.text('VibeGPT'), findsOneWidget);
  });
}
