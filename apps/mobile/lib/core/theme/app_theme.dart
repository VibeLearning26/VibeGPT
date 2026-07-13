import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ══════════════════════════════════════════════════════════════
  //  VibeGPT — Dark Design System (matches web globals.css)
  //  Black-dominant surface, red reserved for actions & highlights.
  // ══════════════════════════════════════════════════════════════

  // ── Core palette ────────────────────────────────────────────
  static const Color bg         = Color(0xFF050505);
  static const Color panel      = Color(0xFF111111);
  static const Color panel2     = Color(0xFF161616);
  static const Color panelHover = Color(0xFF1B1B1B);
  static const Color line       = Color(0xFF282828);
  static const Color lineSoft   = Color(0xFF1E1E1E);

  // ── Brand ───────────────────────────────────────────────────
  static const Color brand       = Color(0xFFE50914);
  static const Color brandAccent = Color(0xFFFF2A2A);
  static const Color brandDim    = Color(0xFF7A0A10);

  // ── Text ────────────────────────────────────────────────────
  static const Color fg          = Color(0xFFF5F5F5);
  static const Color muted       = Color(0xFFA8A8A8);
  static const Color faint       = Color(0xFF6B6B6B);

  // ── Status ──────────────────────────────────────────────────
  static const Color statusSuccess = Color(0xFF22C55E);
  static const Color statusWarning = Color(0xFFF5A623);
  static const Color statusError   = Color(0xFFFF4D4F);
  static const Color statusInfo    = Color(0xFF4F9DFF);

  // ── Legacy aliases (keep old references compiling) ──────────
  static const Color navy950       = bg;
  static const Color navy900       = panel;
  static const Color navy800       = panel2;
  static const Color navy700       = line;
  static const Color emerald500    = brand;
  static const Color emerald600    = brandDim;
  static const Color emerald400    = brandAccent;
  static const Color purple500     = Color(0xFF8B5CF6);
  static const Color surface       = panel;
  static const Color surfaceSecondary = panel2;
  static const Color textPrimary   = fg;
  static const Color textSecondary = muted;
  static const Color textMuted     = faint;
  static const Color border        = line;

  // ══════════════════════════════════════════════════════════════
  //  Light theme — placeholder that mirrors dark (app is dark-only)
  // ══════════════════════════════════════════════════════════════
  static ThemeData get lightTheme => darkTheme;

  // ══════════════════════════════════════════════════════════════
  //  Dark theme — the real theme
  // ══════════════════════════════════════════════════════════════
  static ThemeData get darkTheme {
    final base = ThemeData.dark();
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,

      colorScheme: const ColorScheme.dark(
        primary: brand,
        secondary: brandAccent,
        surface: panel,
        onSurface: fg,
        error: statusError,
        primaryContainer: brandDim,
        onPrimary: Colors.white,
      ),

      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: fg,
        displayColor: fg,
      ),

      scaffoldBackgroundColor: bg,

      // ── App bar ─────────────────────────────────────────────
      appBarTheme: const AppBarTheme(
        backgroundColor: panel,
        foregroundColor: fg,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: fg,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.3,
        ),
      ),

      // ── Cards ───────────────────────────────────────────────
      cardTheme: CardThemeData(
        color: panel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: line),
        ),
        margin: EdgeInsets.zero,
      ),

      // ── Elevated buttons (primary red gradient feel) ────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brand,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            letterSpacing: -0.2,
          ),
        ),
      ),

      // ── Outlined buttons ────────────────────────────────────
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: muted,
          side: const BorderSide(color: line),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      // ── Text buttons ────────────────────────────────────────
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: brandAccent,
        ),
      ),

      // ── Input fields ────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: panel2,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: brand, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: statusError),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        labelStyle: const TextStyle(color: muted, fontSize: 13),
        hintStyle: const TextStyle(color: faint, fontSize: 14),
        prefixIconColor: faint,
        suffixIconColor: faint,
      ),

      // ── Chips ───────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: panel2,
        selectedColor: brandDim,
        side: const BorderSide(color: line),
        labelStyle: const TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.w500),
        secondaryLabelStyle: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),

      // ── Bottom nav ──────────────────────────────────────────
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: panel,
        surfaceTintColor: Colors.transparent,
        indicatorColor: brandDim.withValues(alpha: 0.3),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(color: brandAccent, fontSize: 11, fontWeight: FontWeight.w600);
          }
          return const TextStyle(color: faint, fontSize: 11, fontWeight: FontWeight.w500);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: brandAccent, size: 22);
          }
          return const IconThemeData(color: faint, size: 22);
        }),
      ),

      // ── Dialogs ─────────────────────────────────────────────
      dialogTheme: DialogThemeData(
        backgroundColor: panel,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),

      // ── Bottom sheets ───────────────────────────────────────
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: panel,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),

      // ── Snackbar ────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        backgroundColor: panel2,
        contentTextStyle: const TextStyle(color: fg, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),

      // ── Divider ─────────────────────────────────────────────
      dividerTheme: const DividerThemeData(color: lineSoft, thickness: 1),

      // ── Progress ────────────────────────────────────────────
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: brandAccent,
      ),

      // ── Scrollbar ───────────────────────────────────────────
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(const Color(0xFF2A2A2A)),
        radius: const Radius.circular(999),
        thickness: WidgetStateProperty.all(4),
      ),

      // ── ListTile ────────────────────────────────────────────
      listTileTheme: const ListTileThemeData(
        textColor: fg,
        iconColor: muted,
        tileColor: Colors.transparent,
      ),
    );
  }
}
