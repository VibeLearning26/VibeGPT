import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/dither_background.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Demo credentials accepted by the frontend-only mock auth (no backend).
  static const _demoAccounts = <String, String>{
    'student@vibegpt.local': 'student123',
    'admin@vibegpt.local': 'admin123',
  };

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    // Frontend-only mock auth: validate against demo credentials locally,
    // no API call. Lets the app run standalone on a device with no backend.
    await Future.delayed(const Duration(milliseconds: 600));

    final email = _emailController.text.trim().toLowerCase();
    final password = _passwordController.text;
    final expected = _demoAccounts[email];

    if (expected == null || expected != password) {
      setState(() {
        _loading = false;
        _error = 'Invalid email or password. Try the demo credentials below.';
      });
      return;
    }

    // Store a dummy token so downstream screens see an authenticated session.
    const storage = FlutterSecureStorage();
    await storage.write(key: 'access_token', value: 'demo-token-$email');

    if (!mounted) return;
    setState(() { _loading = false; });
    context.go('/chat');
  }

  void _fillCredentials(String email, String password) {
    _emailController.text = email;
    _passwordController.text = password;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: Stack(
        children: [
          // Animated dither background — red on black (matches web login).
          // Shader is pre-warmed in main(), so it starts with no lag.
          const Positioned.fill(
            child: DitherBackground(
              waveColor: Color(0xFFE60A14),
              waveSpeed: 0.05,
              waveFrequency: 3,
              waveAmplitude: 0.3,
              colorNum: 4,
              pixelSize: 2,
            ),
          ),
          // Vignette so the form area stays readable over the animation.
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.bg.withValues(alpha: 0.35),
                      AppTheme.bg.withValues(alpha: 0.75),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.only(bottom: 8),
                            child: AppLogo(size: 64, radius: 18, glow: true),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Auth card — translucent panel over the animated
                        // background (mirrors the web login's glass card).
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0A0A0A).withValues(alpha: 0.82),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: AppTheme.line),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.brand.withValues(alpha: 0.18),
                                blurRadius: 60,
                                spreadRadius: -20,
                                offset: const Offset(0, 24),
                              ),
                              const BoxShadow(
                                color: Color(0x99000000),
                                blurRadius: 40,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text('Welcome back',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppTheme.fg,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text('Sign in to access your study materials',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.muted, fontSize: 14),
                        ),
                        const SizedBox(height: 32),

                        // Error
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.statusError.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.statusError.withValues(alpha: 0.3)),
                            ),
                            child: Text(_error!, style: const TextStyle(color: AppTheme.statusError, fontSize: 13)),
                          ),

                        // Email field
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          style: const TextStyle(color: AppTheme.fg, fontSize: 14),
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            hintText: 'you@college.edu',
                            prefixIcon: Icon(Icons.email_outlined, size: 20),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Email is required' : null,
                        ),
                        const SizedBox(height: 16),

                        // Password field
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          autofillHints: const [AutofillHints.password],
                          style: const TextStyle(color: AppTheme.fg, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            hintText: '••••••••',
                            prefixIcon: const Icon(Icons.lock_outline, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                size: 20,
                                color: AppTheme.faint,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Password is required' : null,
                        ),
                        const SizedBox(height: 24),

                        // Login button with red gradient
                        Container(
                          height: 50,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.brand, AppTheme.brandAccent],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _loading ? [] : [
                              BoxShadow(
                                color: AppTheme.brand.withValues(alpha: 0.35),
                                blurRadius: 20,
                                spreadRadius: -4,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: _loading ? null : _login,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              minimumSize: const Size.fromHeight(50),
                            ),
                            child: _loading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Demo credentials
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.panel,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Demo accounts — tap to fill',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.muted),
                              ),
                              const SizedBox(height: 10),
                              _demoCred(
                                label: 'Student',
                                email: 'student@vibegpt.local',
                                password: 'student123',
                                badgeColor: AppTheme.panel2,
                              ),
                              const SizedBox(height: 6),
                              _demoCred(
                                label: 'Admin',
                                email: 'admin@vibegpt.local',
                                password: 'admin123',
                                badgeColor: AppTheme.brandDim,
                              ),
                            ],
                          ),
                        ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _demoCred({
    required String label,
    required String email,
    required String password,
    required Color badgeColor,
  }) {
    return InkWell(
      onTap: () => _fillCredentials(email, password),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.panel2,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.lineSoft),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: label == 'Admin'
                      ? AppTheme.brand.withValues(alpha: 0.3)
                      : AppTheme.line,
                ),
              ),
              child: Text(label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: label == 'Admin' ? AppTheme.brandAccent : AppTheme.muted,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text('$email · $password',
                style: const TextStyle(fontSize: 11, color: AppTheme.faint),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
