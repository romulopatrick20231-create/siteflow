/**
 * shaderLibrary.js — Production GLSL shaders for WebGL visual effects.
 *
 * Four shader sets:
 *   aurora          — flowing animated aurora bands (clinica, servicos, educacao)
 *   liquid_gradient — organic color blobs with distortion (restaurante, beleza, petshop)
 *   noise_particles — energetic displacement particles (fitness, oficina)
 *   glass_frost     — frosted glass with refraction (odontologia, premium)
 *
 * Each shader is a Three.js ShaderMaterial descriptor:
 *   { vertexShader, fragmentShader, uniforms, setup }
 *
 * All shaders target WebGL 1.0 (widest device support).
 * Fragment shaders use mediump precision for mobile performance.
 */

// ── Shared vertex (fullscreen quad) ────────────────────────────────────────
// Used by aurora, liquid_gradient, glass_frost — applied to PlaneGeometry.

const QUAD_VERTEX = /* glsl */`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`.trim();

// ── Shared noise functions ──────────────────────────────────────────────────
// Injected into fragment shaders that need them.

const NOISE_GLSL = /* glsl */`
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    f += a * valueNoise(p);
    p = rot * p;
    a *= 0.5;
  }
  return f;
}
`.trim();

// ── AURORA shader ──────────────────────────────────────────────────────────

const AURORA_FRAGMENT = /* glsl */`
precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec3  u_color_a;
uniform vec3  u_color_b;
uniform vec3  u_color_c;
uniform float u_speed;
uniform float u_intensity;

${NOISE_GLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t  = u_time * u_speed;

  // Layered noise for organic aurora shape
  float n1 = fbm(uv * 1.8 + vec2(t * 0.18, 0.0));
  float n2 = fbm(uv * 3.2 + vec2(-t * 0.12, t * 0.08));

  // Vertical mask — aurora lives in the upper-middle band
  float band = smoothstep(0.15, 0.55, uv.y) * smoothstep(1.0, 0.55, uv.y);

  // Flowing wave shape
  float wave  = sin(uv.x * 5.5  + t * 0.7 + n1 * 2.8) * 0.5 + 0.5;
  float wave2 = sin(uv.x * 3.8  - t * 0.5 + n2 * 2.2) * 0.5 + 0.5;

  float aurora = (wave * 0.65 + wave2 * 0.35) * band * u_intensity;
  aurora = pow(clamp(aurora, 0.0, 1.0), 1.4);

  // Color composition
  vec3 base = mix(u_color_a * 0.4, u_color_a, uv.y);
  vec3 glow  = mix(u_color_b, u_color_c, wave2 * 0.6);
  glow += u_color_b * 0.25 * (n1 * 0.5 + 0.5);

  vec3 col = mix(base, glow, aurora);

  // Subtle edge vignette
  float vign = 1.0 - smoothstep(0.55, 1.0, length((uv - 0.5) * vec2(1.0, 1.6)));
  col *= 0.8 + 0.2 * vign;

  gl_FragColor = vec4(col, 1.0);
}
`.trim();

// ── LIQUID GRADIENT shader ─────────────────────────────────────────────────

const LIQUID_FRAGMENT = /* glsl */`
precision mediump float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec3  u_color_a;
uniform vec3  u_color_b;
uniform vec3  u_color_c;
uniform float u_speed;
uniform float u_distortion;

${NOISE_GLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t  = u_time * u_speed;

  // Animated distortion field
  float n1 = valueNoise(uv * 2.2 + vec2(t * 0.28, t * 0.12));
  float n2 = valueNoise(uv * 3.5 + vec2(-t * 0.18, t * 0.24));
  float n3 = fbm(uv * 1.6 + vec2(t * 0.10, -t * 0.15));

  vec2 distorted = uv + vec2(n1, n2) * u_distortion * 0.18;

  // Color blob positions drift over time
  vec2 p1 = vec2(0.28 + sin(t * 0.3) * 0.08, 0.38 + cos(t * 0.2) * 0.06);
  vec2 p2 = vec2(0.70 + cos(t * 0.25) * 0.10, 0.62 + sin(t * 0.35) * 0.08);
  vec2 p3 = vec2(0.50 + n3 * 0.12, 0.25 + sin(t * 0.4) * 0.07);

  float b1 = smoothstep(0.38, 0.0, length(distorted - p1));
  float b2 = smoothstep(0.42, 0.0, length(distorted - p2));
  float b3 = smoothstep(0.32, 0.0, length(distorted - p3));

  vec3 col = u_color_a;
  col = mix(col, u_color_b, b1 * 0.9);
  col = mix(col, u_color_c, b2 * 0.75);
  col = mix(col, mix(u_color_b, u_color_c, 0.5), b3 * 0.55);

  // Glow highlight on top of blobs
  float glow = b1 * 0.12 + b2 * 0.10;
  col += glow;

  // Soft vignette
  float vign = smoothstep(0.85, 0.3, length(uv - 0.5));
  col = mix(u_color_a * 0.6, col, vign * 0.5 + 0.5);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`.trim();

// ── NOISE PARTICLES shaders ────────────────────────────────────────────────
// Vertex displaces point positions; fragment colors by speed.

const PARTICLES_VERTEX = /* glsl */`
attribute float a_index;
attribute vec3  a_offset;

uniform float u_time;
uniform float u_speed;
uniform float u_displacement;

varying float v_alpha;
varying float v_energy;

float rand(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float noise1d(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(rand(i), rand(i + 1.0), u);
}

void main() {
  float t   = u_time * u_speed;
  float idx = a_index;

  // Per-particle phase offset for organic variation
  float phase = idx * 0.618033; // golden ratio offset

  vec3 pos = a_offset;
  pos.x += noise1d(pos.x * 0.4 + t * 0.8 + phase)       * u_displacement;
  pos.y += noise1d(pos.y * 0.4 + t * 0.6 + phase + 5.0)  * u_displacement;
  pos.z += noise1d(pos.z * 0.4 + t * 0.5 + phase + 10.0) * u_displacement * 0.5;

  // Energy drives particle size and alpha
  float energy = noise1d(idx + t * 0.3);
  v_energy  = energy;
  v_alpha   = 0.3 + energy * 0.5;

  gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 1.5 + energy * 3.5;
}
`.trim();

const PARTICLES_FRAGMENT = /* glsl */`
precision mediump float;

uniform vec3  u_color_a;
uniform vec3  u_color_b;

varying float v_alpha;
varying float v_energy;

void main() {
  // Circular soft point
  vec2  coord = gl_PointCoord - 0.5;
  float r     = length(coord);
  if (r > 0.5) discard;

  float alpha = v_alpha * smoothstep(0.5, 0.15, r);
  vec3  col   = mix(u_color_a, u_color_b, v_energy);

  gl_FragColor = vec4(col, alpha);
}
`.trim();

// ── GLASS / FROST shader ───────────────────────────────────────────────────

const GLASS_FRAGMENT = /* glsl */`
precision mediump float;

uniform float     u_time;
uniform vec2      u_resolution;
uniform sampler2D u_texture;     // background render target
uniform float     u_blur;        // 0.0–1.0 frost intensity
uniform float     u_refraction;  // 0.0–1.0 refraction strength
uniform vec3      u_tint;        // subtle color tint

varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float t = u_time * 0.08;

  // Micro normal map from noise (simulates surface irregularities)
  float nx = fbm(vUv * 6.0 + vec2(t, 0.0));
  float ny = fbm(vUv * 6.0 + vec2(0.0, t) + 3.7);
  vec2  normal = vec2(nx, ny) * 2.0 - 1.0;

  // Refracted UV
  vec2 refractedUV = vUv + normal * u_refraction * 0.025;

  // Approximate Gaussian blur by averaging shifted samples
  vec4 col = vec4(0.0);
  float spread = u_blur * 0.012;
  float total  = 0.0;

  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      float w = exp(-float(i*i + j*j) * 0.4);
      col   += texture2D(u_texture, refractedUV + vec2(float(i), float(j)) * spread) * w;
      total += w;
    }
  }
  col /= total;

  // Specular highlight (simulates glass sheen)
  vec2  lightDir = normalize(vec2(0.5, 0.8));
  float spec     = pow(max(dot(normalize(normal), lightDir), 0.0), 12.0) * 0.25;
  col.rgb += spec;

  // Frost tint
  col.rgb = mix(col.rgb, u_tint, 0.12);

  // Edge darkening (depth cue)
  float edge = 1.0 - smoothstep(0.0, 0.08, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  col.rgb *= 1.0 - edge * 0.3;

  gl_FragColor = col;
}
`.trim();

// ── Shader definitions ─────────────────────────────────────────────────────

export const SHADERS = {

  aurora: {
    id:             "aurora",
    label:          "Aurora Background",
    vertexShader:   QUAD_VERTEX,
    fragmentShader: AURORA_FRAGMENT,
    geometry:       "PlaneGeometry",    // fullscreen quad
    renderOrder:    -1,                 // behind everything
    uniforms: {
      u_time:       { type: "float", value: 0.0 },
      u_resolution: { type: "vec2",  value: [1920, 1080] },
      u_color_a:    { type: "vec3",  value: [0.04, 0.06, 0.14] },
      u_color_b:    { type: "vec3",  value: [0.12, 0.28, 0.60] },
      u_color_c:    { type: "vec3",  value: [0.05, 0.55, 0.75] },
      u_speed:      { type: "float", value: 0.25 },
      u_intensity:  { type: "float", value: 0.70 },
    },
    setup: {
      transparent: false,
      depthWrite:  false,
      update:      "u_time += delta * 0.001",    // instruction for render loop
    },
  },

  liquid_gradient: {
    id:             "liquid_gradient",
    label:          "Liquid Gradient",
    vertexShader:   QUAD_VERTEX,
    fragmentShader: LIQUID_FRAGMENT,
    geometry:       "PlaneGeometry",
    renderOrder:    -1,
    uniforms: {
      u_time:       { type: "float", value: 0.0 },
      u_resolution: { type: "vec2",  value: [1920, 1080] },
      u_color_a:    { type: "vec3",  value: [0.06, 0.03, 0.08] },
      u_color_b:    { type: "vec3",  value: [0.55, 0.12, 0.35] },
      u_color_c:    { type: "vec3",  value: [0.20, 0.08, 0.60] },
      u_speed:      { type: "float", value: 0.30 },
      u_distortion: { type: "float", value: 0.70 },
    },
    setup: {
      transparent: false,
      depthWrite:  false,
      update:      "u_time += delta * 0.001",
    },
  },

  noise_particles: {
    id:             "noise_particles",
    label:          "Noise Particle Field",
    vertexShader:   PARTICLES_VERTEX,
    fragmentShader: PARTICLES_FRAGMENT,
    geometry:       "Points",           // Three.js Points object
    renderOrder:    0,
    particleCount:  800,
    uniforms: {
      u_time:         { type: "float", value: 0.0 },
      u_speed:        { type: "float", value: 0.40 },
      u_displacement: { type: "float", value: 0.30 },
      u_color_a:      { type: "vec3",  value: [0.90, 0.42, 0.12] },
      u_color_b:      { type: "vec3",  value: [1.00, 0.80, 0.20] },
    },
    attributes: {
      a_index:  { type: "float",  generate: "index" },         // particle index
      a_offset: { type: "vec3",   generate: "randomBox(2.0)" },// random position in [-2,2]³
    },
    setup: {
      transparent:   true,
      depthWrite:    false,
      sizeAttenuation: true,
      update:        "u_time += delta * 0.001",
    },
  },

  glass_frost: {
    id:             "glass_frost",
    label:          "Frosted Glass",
    vertexShader:   QUAD_VERTEX,
    fragmentShader: GLASS_FRAGMENT,
    geometry:       "PlaneGeometry",
    renderOrder:    1,                  // renders on top, needs background texture
    requiresRenderTarget: true,         // must render scene to texture first
    uniforms: {
      u_time:       { type: "float",    value: 0.0 },
      u_resolution: { type: "vec2",     value: [1920, 1080] },
      u_texture:    { type: "sampler2D",value: null },         // set at runtime
      u_blur:       { type: "float",    value: 0.60 },
      u_refraction: { type: "float",    value: 0.50 },
      u_tint:       { type: "vec3",     value: [0.90, 0.95, 1.00] },
    },
    setup: {
      transparent: true,
      depthWrite:  false,
      update:      "u_time += delta * 0.001",
    },
  },

};

// ── Niche → effect + color mapping ────────────────────────────────────────

const NICHE_VISUAL_MAP = {
  odontologia: {
    shader:   "glass_frost",
    colorA:   [0.04, 0.08, 0.16],   // deep navy
    colorB:   [0.20, 0.55, 0.90],   // bright blue
    colorC:   [0.90, 0.97, 1.00],   // near white
    bgShader: "aurora",              // aurora as background, glass as overlay
    particleEnabled: false,
    intensity: 0.65,
    speed:     0.20,
  },
  clinica: {
    shader:   "aurora",
    colorA:   [0.04, 0.07, 0.18],
    colorB:   [0.15, 0.40, 0.75],
    colorC:   [0.35, 0.75, 0.90],
    particleEnabled: false,
    intensity: 0.55,
    speed:     0.22,
  },
  restaurante: {
    shader:   "liquid_gradient",
    colorA:   [0.12, 0.05, 0.02],
    colorB:   [0.75, 0.28, 0.08],
    colorC:   [0.90, 0.60, 0.15],
    particleEnabled: false,
    intensity: 0.75,
    speed:     0.28,
  },
  petshop: {
    shader:   "liquid_gradient",
    colorA:   [0.02, 0.10, 0.06],
    colorB:   [0.15, 0.65, 0.38],
    colorC:   [0.60, 0.88, 0.45],
    particleEnabled: true,
    particleCount: 400,
    intensity: 0.60,
    speed:     0.35,
  },
  beleza: {
    shader:   "liquid_gradient",
    colorA:   [0.10, 0.04, 0.12],
    colorB:   [0.72, 0.22, 0.55],
    colorC:   [0.98, 0.78, 0.88],
    particleEnabled: false,
    intensity: 0.70,
    speed:     0.25,
  },
  servicos: {
    shader:   "aurora",
    colorA:   [0.06, 0.06, 0.10],
    colorB:   [0.25, 0.25, 0.55],
    colorC:   [0.50, 0.65, 0.95],
    particleEnabled: false,
    intensity: 0.45,
    speed:     0.18,
  },
  fitness: {
    shader:   "noise_particles",
    colorA:   [0.95, 0.38, 0.08],
    colorB:   [1.00, 0.75, 0.10],
    particleEnabled: true,
    particleCount: 800,
    intensity: 1.00,
    speed:     0.50,
  },
  educacao: {
    shader:   "aurora",
    colorA:   [0.04, 0.06, 0.16],
    colorB:   [0.20, 0.45, 0.80],
    colorC:   [0.50, 0.80, 0.95],
    particleEnabled: false,
    intensity: 0.50,
    speed:     0.20,
  },
  oficina: {
    shader:   "noise_particles",
    colorA:   [0.08, 0.08, 0.08],
    colorB:   [0.90, 0.40, 0.10],
    particleEnabled: true,
    particleCount: 600,
    intensity: 0.85,
    speed:     0.45,
  },
  generico: {
    shader:   "aurora",
    colorA:   [0.05, 0.05, 0.12],
    colorB:   [0.20, 0.35, 0.70],
    colorC:   [0.40, 0.65, 0.90],
    particleEnabled: false,
    intensity: 0.50,
    speed:     0.22,
  },
};

/**
 * Build the complete WebGL shader config for a niche.
 * Returns the shaders block for the site JSON.
 */
export function buildShaderConfig(category, colorMood) {
  const map    = NICHE_VISUAL_MAP[category] || NICHE_VISUAL_MAP.generico;
  const shader = { ...SHADERS[map.shader] };

  // Apply niche-specific colors and parameters
  if (shader.uniforms.u_color_a) shader.uniforms.u_color_a.value = map.colorA;
  if (shader.uniforms.u_color_b) shader.uniforms.u_color_b.value = map.colorB;
  if (shader.uniforms.u_color_c && map.colorC) shader.uniforms.u_color_c.value = map.colorC;
  if (shader.uniforms.u_speed)     shader.uniforms.u_speed.value     = map.speed;
  if (shader.uniforms.u_intensity) shader.uniforms.u_intensity.value = map.intensity;
  if (map.particleCount)           shader.particleCount               = map.particleCount;

  const config = {
    enabled:  true,
    renderer: "three.js",
    version:  "r168",
    camera: {
      type: "OrthographicCamera",
      near: -1,
      far:  1,
    },
    effects: [shader],
  };

  // Add background aurora for glass effect (glass renders on top of aurora)
  if (map.bgShader && map.bgShader !== map.shader) {
    const bg = { ...SHADERS[map.bgShader] };
    const bgMap = NICHE_VISUAL_MAP.clinica;
    bg.uniforms.u_color_a.value = map.colorA;
    bg.uniforms.u_color_b.value = map.colorB;
    bg.uniforms.u_color_c.value = map.colorC || [0.9, 0.95, 1.0];
    config.effects.unshift(bg);  // bg renders first
  }

  // Particle layer (optional overlay — only when main shader is NOT already particles)
  if (map.particleEnabled && map.shader !== "noise_particles") {
    const particles = { ...SHADERS.noise_particles };
    particles.uniforms.u_color_a.value = map.colorA;
    particles.uniforms.u_color_b.value = map.colorB;
    particles.particleCount = map.particleCount || 600;
    config.effects.push(particles);
  }

  return config;
}
