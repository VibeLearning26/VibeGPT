import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: AppTheme.panel,
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar with red gradient
          Center(
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppTheme.brand, AppTheme.brandAccent],
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.brand.withValues(alpha: 0.3),
                    blurRadius: 24,
                    spreadRadius: -6,
                  ),
                ],
              ),
              child: const Center(
                child: Text('S', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Center(child: Text('Student Account',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.fg),
          )),
          const SizedBox(height: 4),
          const Center(child: Text('student@vibegpt.local',
            style: TextStyle(fontSize: 13, color: AppTheme.muted),
          )),
          const SizedBox(height: 32),

          // Settings card
          Container(
            decoration: BoxDecoration(
              color: AppTheme.panel,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.line),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.dark_mode_outlined, color: AppTheme.muted, size: 20),
                  title: const Text('Theme', style: TextStyle(fontSize: 14, color: AppTheme.fg)),
                  trailing: const Text('Dark', style: TextStyle(color: AppTheme.faint, fontSize: 13)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                const Divider(height: 1, color: AppTheme.lineSoft),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined, color: AppTheme.muted, size: 20),
                  title: const Text('Notifications', style: TextStyle(fontSize: 14, color: AppTheme.fg)),
                  trailing: const Text('On', style: TextStyle(color: AppTheme.faint, fontSize: 13)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                const Divider(height: 1, color: AppTheme.lineSoft),
                ListTile(
                  leading: const Icon(Icons.info_outline, color: AppTheme.muted, size: 20),
                  title: const Text('About VibeGPT', style: TextStyle(fontSize: 14, color: AppTheme.fg)),
                  trailing: const Text('v0.1.0', style: TextStyle(color: AppTheme.faint, fontSize: 13)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Logout button — red accent
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.brand.withValues(alpha: 0.3)),
            ),
            child: OutlinedButton.icon(
              onPressed: () async {
                const storage = FlutterSecureStorage();
                await storage.deleteAll();
                if (context.mounted) context.go('/login');
              },
              icon: const Icon(Icons.logout, color: AppTheme.brandAccent, size: 18),
              label: const Text('Sign Out', style: TextStyle(color: AppTheme.brandAccent, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Footer
          const Center(child: Text('© 2026 VibeGPT · Campus Study Agent',
            style: TextStyle(fontSize: 11, color: AppTheme.faint),
          )),
        ],
      ),
    );
  }
}
