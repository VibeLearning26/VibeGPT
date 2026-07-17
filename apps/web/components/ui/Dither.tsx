"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  /** Internal render resolution scale (0–1). Lower = faster. Dither look hides the downscale. */
  renderScale?: number;
}

const vertexShader = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform float time;
uniform vec2 resolution;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;

varying vec2 vUv;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

// 4 octaves is visually identical to 8 at amplitude ~0.3 (0.3^4 ≈ 0.008
// residual) and roughly halves fragment cost.
const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p - fbm(p + fbm(p2)));
}

// 8x8 Bayer matrix packed row-by-row; indexed without dynamic array access
// (not portable in GLSL ES 1.0).
float bayer(int x, int y) {
  int i = y * 8 + x;
  if (i ==  0) return  0.0/64.0; if (i ==  1) return 48.0/64.0;
  if (i ==  2) return 12.0/64.0; if (i ==  3) return 60.0/64.0;
  if (i ==  4) return  3.0/64.0; if (i ==  5) return 51.0/64.0;
  if (i ==  6) return 15.0/64.0; if (i ==  7) return 63.0/64.0;
  if (i ==  8) return 32.0/64.0; if (i ==  9) return 16.0/64.0;
  if (i == 10) return 44.0/64.0; if (i == 11) return 28.0/64.0;
  if (i == 12) return 35.0/64.0; if (i == 13) return 19.0/64.0;
  if (i == 14) return 47.0/64.0; if (i == 15) return 31.0/64.0;
  if (i == 16) return  8.0/64.0; if (i == 17) return 56.0/64.0;
  if (i == 18) return  4.0/64.0; if (i == 19) return 52.0/64.0;
  if (i == 20) return 11.0/64.0; if (i == 21) return 59.0/64.0;
  if (i == 22) return  7.0/64.0; if (i == 23) return 55.0/64.0;
  if (i == 24) return 40.0/64.0; if (i == 25) return 24.0/64.0;
  if (i == 26) return 36.0/64.0; if (i == 27) return 20.0/64.0;
  if (i == 28) return 43.0/64.0; if (i == 29) return 27.0/64.0;
  if (i == 30) return 39.0/64.0; if (i == 31) return 23.0/64.0;
  if (i == 32) return  2.0/64.0; if (i == 33) return 50.0/64.0;
  if (i == 34) return 14.0/64.0; if (i == 35) return 62.0/64.0;
  if (i == 36) return  1.0/64.0; if (i == 37) return 49.0/64.0;
  if (i == 38) return 13.0/64.0; if (i == 39) return 61.0/64.0;
  if (i == 40) return 34.0/64.0; if (i == 41) return 18.0/64.0;
  if (i == 42) return 46.0/64.0; if (i == 43) return 30.0/64.0;
  if (i == 44) return 33.0/64.0; if (i == 45) return 17.0/64.0;
  if (i == 46) return 45.0/64.0; if (i == 47) return 29.0/64.0;
  if (i == 48) return 10.0/64.0; if (i == 49) return 58.0/64.0;
  if (i == 50) return  6.0/64.0; if (i == 51) return 54.0/64.0;
  if (i == 52) return  9.0/64.0; if (i == 53) return 57.0/64.0;
  if (i == 54) return  5.0/64.0; if (i == 55) return 53.0/64.0;
  if (i == 56) return 42.0/64.0; if (i == 57) return 26.0/64.0;
  if (i == 58) return 38.0/64.0; if (i == 59) return 22.0/64.0;
  if (i == 60) return 41.0/64.0; if (i == 61) return 25.0/64.0;
  if (i == 62) return 37.0/64.0; if (i == 63) return 21.0/64.0;
  return 0.0;
}

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayer(x, y) - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= resolution.x / resolution.y;

  float f = pattern(centeredUv);

  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(centeredUv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }

  vec3 col = mix(vec3(0.0), waveColor, f);
  col = dither(uv, col);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  renderScale = 0.5,
}: DitherProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Latest props readable from the render loop without re-initializing WebGL.
  const propsRef = useRef({
    waveSpeed,
    waveFrequency,
    waveAmplitude,
    waveColor,
    colorNum,
    pixelSize,
    disableAnimation,
    enableMouseInteraction,
    mouseRadius,
  });
  useEffect(() => {
    propsRef.current = {
      waveSpeed,
      waveFrequency,
      waveAmplitude,
      waveColor,
      colorNum,
      pixelSize,
      disableAnimation,
      enableMouseInteraction,
      mouseRadius,
    };
  }, [
    waveSpeed,
    waveFrequency,
    waveAmplitude,
    waveColor,
    colorNum,
    pixelSize,
    disableAnimation,
    enableMouseInteraction,
    mouseRadius,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // dpr locked to 1: the dither aesthetic gains nothing from retina
    // resolution and it's the main source of lag on high-DPI screens.
    const renderer = new Renderer({ alpha: true, dpr: 1 });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        time: { value: 0 },
        resolution: { value: new Float32Array([1, 1]) },
        waveSpeed: { value: waveSpeed },
        waveFrequency: { value: waveFrequency },
        waveAmplitude: { value: waveAmplitude },
        waveColor: { value: new Color(...waveColor) },
        mousePos: { value: new Float32Array([0, 0]) },
        enableMouseInteraction: { value: enableMouseInteraction ? 1 : 0 },
        mouseRadius: { value: mouseRadius },
        colorNum: { value: colorNum },
        pixelSize: { value: pixelSize },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    // Renders below CSS size; pixelated upscale keeps the retro look crisp.
    canvas.style.imageRendering = "pixelated";
    // Fade the canvas in once the first frame is drawn — hides WebGL
    // context/shader-compile latency instead of popping in late.
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.5s ease";
    container.appendChild(canvas);

    let animationId = 0;
    let firstFrame = true;
    const currentMouse = [0, 0];
    let targetMouse = [0, 0];

    const resize = () => {
      const w = Math.max(1, Math.round(container.clientWidth * renderScale));
      const h = Math.max(1, Math.round(container.clientHeight * renderScale));
      renderer.setSize(w, h);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      program.uniforms.resolution.value[0] = w;
      program.uniforms.resolution.value[1] = h;
      targetMouse = [w / 2, h / 2];
      currentMouse[0] = targetMouse[0];
      currentMouse[1] = targetMouse[1];
    };

    // Window-level listener so overlaid content (forms, cards) doesn't
    // swallow mouse movement over the background.
    const handleMouseMove = (e: MouseEvent) => {
      if (!propsRef.current.enableMouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * gl.canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * gl.canvas.height;
      targetMouse = [x, y];
    };

    const update = (t: number) => {
      animationId = requestAnimationFrame(update);
      const p = propsRef.current;

      if (p.enableMouseInteraction) {
        const smoothing = 0.05;
        currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1]);
        program.uniforms.mousePos.value[0] = currentMouse[0];
        program.uniforms.mousePos.value[1] = currentMouse[1];
      } else {
        program.uniforms.mousePos.value[0] = gl.canvas.width / 2;
        program.uniforms.mousePos.value[1] = gl.canvas.height / 2;
      }

      if (!p.disableAnimation) {
        program.uniforms.time.value = t * 0.001;
      }

      program.uniforms.waveSpeed.value = p.waveSpeed;
      program.uniforms.waveFrequency.value = p.waveFrequency;
      program.uniforms.waveAmplitude.value = p.waveAmplitude;
      program.uniforms.waveColor.value.r = p.waveColor[0];
      program.uniforms.waveColor.value.g = p.waveColor[1];
      program.uniforms.waveColor.value.b = p.waveColor[2];
      program.uniforms.enableMouseInteraction.value = p.enableMouseInteraction ? 1 : 0;
      program.uniforms.mouseRadius.value = p.mouseRadius;
      program.uniforms.colorNum.value = p.colorNum;
      program.uniforms.pixelSize.value = p.pixelSize;

      renderer.render({ scene: mesh });

      if (firstFrame) {
        firstFrame = false;
        canvas.style.opacity = "1";
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("mousemove", handleMouseMove);

    resize();
    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Scene is created once; prop changes flow through propsRef → uniforms,
    // avoiding a full WebGL teardown/re-init per keystroke of state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderScale]);

  return <div ref={containerRef} className="w-full h-full absolute top-0 left-0" />;
}
