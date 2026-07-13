import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: AppTheme.panel,
        title: const Text('Saved Answers'),
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
              child: Icon(Icons.bookmark_outline, size: 26, color: AppTheme.brand.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 16),
            const Text('No saved answers',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.fg),
            ),
            const SizedBox(height: 6),
            const Text('Bookmark answers to find them here',
              style: TextStyle(fontSize: 13, color: AppTheme.muted),
            ),
          ],
        ),
      ),
    );
  }
}
