import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Animated dither background — Flutter port of the web app's
/// `components/ui/Dither.tsx` (perlin fbm waves + Bayer dithering).
///
/// Performance notes (mirrors the web component's optimizations):
///  * The FragmentProgram is loaded once and cached statically. Call
///    [DitherBackground.warmUp] at app startup (before the login route is
///    pushed) so the shader is compiled while the splash screen is showing —
///    the animation then starts instantly with zero first-open lag.
///  * Renders at a reduced internal resolution ([renderScale] of *physical*
///    pixels) and upscales with `FilterQuality.none`; the dither aesthetic
///    hides the downscale and it slashes fragment cost on high-DPI screens
///    (same trick as the web version's dpr:1 + renderScale:0.5).
///  * The render loop is driven by a [Ticker] into a [ValueNotifier] used as
///    the painter's `repaint` listenable — no setState per frame — and the
///    whole thing sits behind a [RepaintBoundary] so the form UI above never
///    forces the shader to repaint (and vice versa).
class DitherBackground extends StatefulWidget {
  const DitherBackground({
    super.key,
    this.waveSpeed = 0.05,
    this.waveFrequency = 3,
    this.waveAmplitude = 0.3,
    this.waveColor = const Color(0xFFE60A14), // red — matches web [0.9,0.04,0.08]
    this.colorNum = 4,
    this.pixelSize = 2,
    this.renderScale = 0.5,
    this.disableAnimation = false,
  });

  final double waveSpeed;
  final double waveFrequency;
  final double waveAmplitude;
  final Color waveColor;
  final double colorNum;
  final double pixelSize;

  /// Internal render resolution as a fraction of physical pixels (0–1).
  /// Lower = faster. The dither look hides the downscale.
  final double renderScale;

  final bool disableAnimation;

  static ui.FragmentProgram? _program;
  static Future<ui.FragmentProgram>? _loader;

  /// Loads + compiles the shader ahead of time. Fire-and-forget from
  /// `main()`; by the time the user reaches the login screen the program
  /// is ready and the first frame draws immediately.
  static Future<void> warmUp() async {
    _loader ??= ui.FragmentProgram.fromAsset('shaders/dither.frag');
    _program ??= await _loader!;
  }

  @override
  State<DitherBackground> createState() => _DitherBackgroundState();
}

class _DitherBackgroundState extends State<DitherBackground>
    with SingleTickerProviderStateMixin {
  Ticker? _ticker;
  final _time = ValueNotifier<double>(0);
  ui.FragmentShader? _shader;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // Usually resolves synchronously thanks to warmUp() at app startup.
    if (DitherBackground._program == null) await DitherBackground.warmUp();
    if (!mounted) return;
    setState(() => _shader = DitherBackground._program!.fragmentShader());
    if (!widget.disableAnimation) {
      _ticker = createTicker((elapsed) {
        _time.value = elapsed.inMicroseconds / 1e6;
      })..start();
    }
  }

  @override
  void dispose() {
    _ticker?.dispose();
    _time.dispose();
    _shader?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shader = _shader;
    if (shader == null) {
      // Shader still compiling (cold start without warmUp) — hold the page
      // background color; the TweenAnimationBuilder below fades the canvas
      // in on arrival instead of popping.
      return const ColoredBox(color: Color(0xFF050505));
    }

    final dpr = MediaQuery.devicePixelRatioOf(context);
    // Child logical size such that its physical raster is renderScale of
    // the full-resolution raster.
    final logicalScale = widget.renderScale / dpr;

    return RepaintBoundary(
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOut,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final w = constraints.maxWidth;
            final h = constraints.maxHeight;
            return ClipRect(
              child: OverflowBox(
                alignment: Alignment.topLeft,
                maxWidth: double.infinity,
                maxHeight: double.infinity,
                child: Transform.scale(
                  alignment: Alignment.topLeft,
                  scale: 1 / logicalScale,
                  // Nearest-neighbour upscale keeps the retro look crisp
                  // (equivalent of the web canvas's image-rendering:pixelated).
                  filterQuality: FilterQuality.none,
                  child: SizedBox(
                    width: w * logicalScale,
                    height: h * logicalScale,
                    child: CustomPaint(
                      isComplex: true,
                      willChange: !widget.disableAnimation,
                      painter: _DitherPainter(
                        shader: shader,
                        time: _time,
                        dpr: dpr,
                        waveSpeed: widget.waveSpeed,
                        waveFrequency: widget.waveFrequency,
                        waveAmplitude: widget.waveAmplitude,
                        waveColor: widget.waveColor,
                        colorNum: widget.colorNum,
                        pixelSize: widget.pixelSize,
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        builder: (context, opacity, child) =>
            Opacity(opacity: opacity, child: child),
      ),
    );
  }
}

class _DitherPainter extends CustomPainter {
  _DitherPainter({
    required this.shader,
    required this.time,
    required this.dpr,
    required this.waveSpeed,
    required this.waveFrequency,
    required this.waveAmplitude,
    required this.waveColor,
    required this.colorNum,
    required this.pixelSize,
  }) : super(repaint: time);

  final ui.FragmentShader shader;
  final ValueNotifier<double> time;
  final double dpr;
  final double waveSpeed;
  final double waveFrequency;
  final double waveAmplitude;
  final Color waveColor;
  final double colorNum;
  final double pixelSize;

  final _paint = Paint();

  @override
  void paint(Canvas canvas, Size size) {
    shader
      ..setFloat(0, size.width) // uResolution.x
      ..setFloat(1, size.height) // uResolution.y
      ..setFloat(2, time.value) // uTime
      ..setFloat(3, waveSpeed) // uWaveSpeed
      ..setFloat(4, waveFrequency) // uWaveFrequency
      ..setFloat(5, waveAmplitude) // uWaveAmplitude
      ..setFloat(6, waveColor.r) // uWaveColor.r
      ..setFloat(7, waveColor.g) // uWaveColor.g
      ..setFloat(8, waveColor.b) // uWaveColor.b
      ..setFloat(9, colorNum) // uColorNum
      ..setFloat(10, pixelSize); // uPixelSize
    _paint.shader = shader;
    canvas.drawRect(Offset.zero & size, _paint);
  }

  @override
  bool shouldRepaint(_DitherPainter oldDelegate) =>
      oldDelegate.shader != shader ||
      oldDelegate.waveSpeed != waveSpeed ||
      oldDelegate.waveFrequency != waveFrequency ||
      oldDelegate.waveAmplitude != waveAmplitude ||
      oldDelegate.waveColor != waveColor ||
      oldDelegate.colorNum != colorNum ||
      oldDelegate.pixelSize != pixelSize;
}
