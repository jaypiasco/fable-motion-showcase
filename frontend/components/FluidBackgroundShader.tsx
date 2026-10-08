'use client';

import React, { useEffect, useRef } from 'react';

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

// Simplex/Perlin-style 2D noise helpers
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fluid simulation approximation with Idle harmonic emitter paths
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv;
    p.x *= aspect;
    
    float t = u_time * 0.45;
    
    // Idle harmonic emitter paths mimicking idleEmitters
    vec2 emitterA = vec2(0.5 * aspect + 0.28 * sin(0.73 * t), 0.5 + 0.22 * sin(1.09 * t + 0.4));
    vec2 emitterB = vec2(0.5 * aspect + 0.26 * sin(0.61 * t + 3.1415), 0.5 + 0.24 * sin(0.97 * t + 2.1));
    
    // Distance to emitters
    float distA = length(p - emitterA);
    float distB = length(p - emitterB);
    
    // Domain warping
    vec2 q = vec2(0.0);
    q.x = snoise(p * 2.2 + vec2(t * 0.3, t * 0.2));
    q.y = snoise(p * 2.2 + vec2(t * 0.25, -t * 0.35));
    
    vec2 r = vec2(0.0);
    r.x = snoise(p * 3.0 + 4.0 * q + vec2(1.7, 9.2) + 0.2 * t);
    r.y = snoise(p * 3.0 + 4.0 * q + vec2(8.3, 2.8) + 0.15 * t);
    
    float f = snoise(p * 2.0 + 3.5 * r + t * 0.1);
    
    // Color palettes (deep neon purple, electric blue, magenta, cyber cyan)
    vec3 colorDyeA = vec3(0.05, 0.48, 1.0);  // Cyan/blue
    vec3 colorDyeB = vec3(0.98, 0.12, 0.65);  // Neon pink/magenta
    vec3 colorDyeC = vec3(0.55, 0.15, 0.95);  // Purple
    vec3 colorBase = vec3(0.02, 0.015, 0.045);
    
    // Dye contribution from emitters & noise field
    float dyeA = exp(-distA * 4.2) * 1.5 + clamp(r.x * 0.5 + 0.5, 0.0, 1.0) * 0.4;
    float dyeB = exp(-distB * 4.2) * 1.5 + clamp(r.y * 0.5 + 0.5, 0.0, 1.0) * 0.4;
    
    vec3 col = colorBase;
    col += mix(colorDyeA, colorDyeC, clamp(f * 0.5 + 0.5, 0.0, 1.0)) * dyeA * 0.85;
    col += mix(colorDyeB, colorDyeC, clamp(q.x * 0.5 + 0.5, 0.0, 1.0)) * dyeB * 0.85;
    
    // Soft fluid highlights & glow
    col += vec3(0.9, 0.7, 1.0) * pow(clamp(f * 0.5 + 0.5, 0.0, 1.0), 3.0) * 0.35;
    
    // Vignette
    vec2 centerUV = uv - 0.5;
    float vignette = 0.6 + 0.4 * pow(max(0.0, 1.0 - dot(centerUV, centerUV) * 1.8), 1.4);
    col *= vignette;
    
    gl_FragColor = vec4(col, 1.0);
}
`;

export function FluidBackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let resizeObserver: ResizeObserver | null = null;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    function compileShader(type: number, src: string) {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Program link failed:', gl.getProgramInfoLog(prog));
      return;
    }

    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    function render(t: number) {
      if (!gl || !canvas) return;
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      if (gl) {
        if (buf) gl.deleteBuffer(buf);
        if (prog) gl.deleteProgram(prog);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ display: 'block' }}>
      <canvas
        ref={canvasRef}
        id="shader-canvas-ANIMATION_18"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
