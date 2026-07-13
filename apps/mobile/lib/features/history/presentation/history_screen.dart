import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: AppTheme.panel,
        title: const Text('Question History'),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.panel,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.line),
              ),
              child: const Icon(Icons.history, size: 26, color: AppTheme.faint),
            ),
            const SizedBox(height: 16),
            const Text('No questions yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.fg),
            ),
            const SizedBox(height: 6),
            const Text('Your question history will appear here',
              style: TextStyle(fontSize: 13, color: AppTheme.muted),
            ),
          ],
        ),
      ),
    );
  }
}
