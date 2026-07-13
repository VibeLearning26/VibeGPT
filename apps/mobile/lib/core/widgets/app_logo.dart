import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// The VibeGPT brand mark (assets/images/logo.png) rendered inside a rounded
/// tile. The source logo is a white monogram on a black field, so it blends
/// naturally with the dark surface; an optional red glow makes it "pop".
class AppLogo extends StatelessWidget {
  final double size;
  final double radius;
  final bool glow;

  const AppLogo({
    super.key,
    this.size = 40,
    this.radius = 12,
    this.glow = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppTheme.line),
        boxShadow: glow
            ? [
                BoxShadow(
                  color: AppTheme.brand.withValues(alpha: 0.35),
                  blurRadius: size * 0.5,
                  spreadRadius: -size * 0.12,
                ),
              ]
            : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        'assets/images/logo.png',
        fit: BoxFit.cover,
        // Graceful fallback if the asset ever fails to load.
        errorBuilder: (context, error, stackTrace) => const Center(
          child: Text(
            'V',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}
