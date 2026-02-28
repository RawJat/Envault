"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Suspense } from "react";
import { useTheme } from "next-themes";

interface Particle {
  angle: number;
  radius: number;
  localY: number;
  orbitSpeed: number;
  rotation: THREE.Euler;
  scale: number;
  brightness: number;
  rotationSpeed: THREE.Vector3;
}

// Global cache to preserve state across Next.js route navigations where Scene remounts
let cachedParticles: Particle[] | null = null;
const globalPlanetRotation = { x: 0, y: 0 };

// Simple seeded PRNG for consistent particle generation
function createPRNG(seed: number) {
  return function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

// Vertex Shader - Enhanced for realistic stone texture
const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;
varying float vCrater;
uniform float uTime;

// Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    vUv = uv;
    vPosition = position;
    
    // Multi-layered noise for realistic stone texture
    float noise1 = snoise(position * 2.0 + uTime * 0.08);
    float noise2 = snoise(position * 5.0 + uTime * 0.04);
    float noise3 = snoise(position * 10.0);
    float noise4 = snoise(position * 20.0);  // Fine detail
    
    // Combine noise layers for organic texture
    vNoise = noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.2 + noise4 * 0.1;
    
    // Create crater-like features
    vCrater = snoise(position * 3.0) * 0.5 + 0.5;
    float craterDepth = smoothstep(0.3, 0.5, vCrater) * 0.3;
    
    // Enhanced displacement for rocky surface
    vec3 newPos = position + normal * (vNoise * 0.18 - craterDepth);
    vNormal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

// Fragment Shader - Realistic stone dithered texture
const fragmentShader = `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;
varying float vCrater;

float bayer8(vec2 uv) {
    ivec2 p = ivec2(mod(uv, 8.0));
    int m[64] = int[64](
        0, 32,  8, 40,  2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
        3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21
    );
    return float(m[p.y * 8 + p.x]) / 64.0;
}

void main() {
    // Multiple light sources for realistic stone appearance
    vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
    vec3 lightDir2 = normalize(vec3(-0.5, -0.5, 1.0));
    
    float dotNL1 = dot(normalize(vNormal), lightDir1);
    float dotNL2 = dot(normalize(vNormal), lightDir2);
    
    // Combine lighting with crater depth
    float craterShadow = smoothstep(0.3, 0.5, vCrater) * 0.4;
    
    // Add noise-based texture variation for grainy stone look
    float textureVariation = vNoise * 0.4;
    float brightness = clamp(
        dotNL1 * 0.7 + 
        dotNL2 * 0.3 + 
        textureVariation - 
        craterShadow + 
        0.25, 
        0.0, 
        1.0
    );
    
    // Fine-grained dithering for halftone effect
    float threshold = bayer8(gl_FragCoord.xy * 1.5);  // Increased frequency
    float dither = brightness > threshold ? 1.0 : 0.0;
    
    // Keep planet light-colored (don't invert)
    vec3 lightStone = vec3(0.95, 0.95, 0.95);
    vec3 darkStone = vec3(0.1, 0.1, 0.1);
    vec3 finalColor = mix(darkStone, lightStone, dither);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

function StonePlanet() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { resolvedTheme } = useTheme();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Planet stays light-colored in both themes
  useEffect(() => {
    if (materialRef.current) {
      // Keep planet light/stone colored regardless of theme
      materialRef.current.uniforms.uColor.value.setHex(0xf5f5f5);
    }
  }, [resolvedTheme]);

  useFrame((state, delta) => {
    if (meshRef.current && materialRef.current) {
      // Use global rotation state to prevent snapping back to 0 on route transitions
      globalPlanetRotation.y += delta * 0.15;
      globalPlanetRotation.x += delta * 0.05;

      meshRef.current.rotation.y = globalPlanetRotation.y;
      meshRef.current.rotation.x = globalPlanetRotation.x;
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }

    if (groupRef.current) {
      // Smooth subtle mouse parallax
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        mouse.x * 0.5,
        0.05,
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        mouse.y * 0.3,
        0.05,
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        {/* Smaller planet for better proportion */}
        <sphereGeometry args={[2.0, 150, 150]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            uColor: { value: new THREE.Color(0xf5f5f5) },
            uTime: { value: 0 },
          }}
        />
      </mesh>
    </group>
  );
}

const particleCount = 2000; // Increased for denser compressed tube

// Debris ring orbiting around the stone planet
function OrbitingDebris() {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { resolvedTheme } = useTheme();

  // Update material color based on theme
  useEffect(() => {
    if (materialRef.current) {
      const isDark = resolvedTheme === "dark";
      materialRef.current.color.setHex(isDark ? 0xffffff : 0x000000);
      materialRef.current.opacity = isDark ? 0.7 : 0.8;
    }
  }, [resolvedTheme]);

  const [particles] = useState<Particle[]>(() => {
    if (cachedParticles) {
      return cachedParticles;
    }

    const prng = createPRNG(42); // deterministic seed
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      // Create narrow compressed tube-like ring
      const angle = (i / particleCount) * Math.PI * 2;

      // Very tight radial distribution - compressed into narrow band
      const radiusBase = 3.0 + prng() * 0.5; // Closer to planet, narrow band

      // Very narrow thickness for tight tube - only local Y displacement
      const localY = (prng() - 0.5) * 0.8; // Even tighter tube vertically

      // Varied particle sizes (some large chunks, mostly small)
      const sizeRandom = prng();
      const scale =
        sizeRandom > 0.9
          ? 0.06 + prng() * 0.08
          : 0.015 + prng() * 0.035;

      temp.push({
        angle: angle,
        radius: radiusBase,
        localY: localY, // Store local Y offset for ring thickness
        orbitSpeed: 0.08 + prng() * 0.32,
        rotation: new THREE.Euler(
          prng() * Math.PI * 2,
          prng() * Math.PI * 2,
          prng() * Math.PI * 2,
        ),
        scale: scale,
        brightness: 0.3 + prng() * 0.7,
        rotationSpeed: new THREE.Vector3(
          (prng() - 0.5) * 0.025,
          (prng() - 0.5) * 0.025,
          (prng() - 0.5) * 0.025,
        ),
      });
    }
    cachedParticles = temp;
    return temp;
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const velocity = Math.abs(currentScroll - lastScroll.current) * 0.001;
      setScrollVelocity(velocity);
      lastScroll.current = currentScroll;

      setTimeout(() => setScrollVelocity(0), 150);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return;

    // Reintroduce tilt to exactly match the requested look
    const tiltX = Math.PI / 5.5; // Forward tilt
    const tiltZ = Math.PI / 8.5; // Tilt sideways

    particles.forEach((particle, i) => {
      // Update orbital angle - consistent smooth rotation
      particle.angle += delta * particle.orbitSpeed + scrollVelocity * 2;

      // Base circle in XY plane (if tilt was 0)
      const baseRadius = particle.radius;
      const x = Math.cos(particle.angle) * baseRadius;
      const z = Math.sin(particle.angle) * baseRadius;
      // Y is just local variance (thickness)
      const y = particle.localY;

      // Apply 3D rotation matrix for the tilt
      // Rotate around Z axis first, then X axis

      // 1. Z-axis rotation (tilt)
      const x1 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
      const y1 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
      const z1 = z;

      // 2. X-axis rotation (forward dip)
      const finalX = x1;
      const finalY = y1 * Math.cos(tiltX) - z1 * Math.sin(tiltX);
      const finalZ = y1 * Math.sin(tiltX) + z1 * Math.cos(tiltX);

      // Update particle rotation
      particle.rotation.x += particle.rotationSpeed.x * delta;
      particle.rotation.y += particle.rotationSpeed.y * delta;
      particle.rotation.z += particle.rotationSpeed.z * delta;

      dummy.position.set(finalX, finalY, finalZ);
      dummy.rotation.copy(particle.rotation);
      dummy.scale.setScalar(particle.scale);
      dummy.updateMatrix();

      instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const isDark = resolvedTheme === "dark";

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, particleCount]}
    >
      {/* Very small icosahedron for varied particle shapes */}
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        ref={materialRef}
        color={isDark ? "#ffffff" : "#000000"}
        transparent
        opacity={isDark ? 0.7 : 0.8}
      />
    </instancedMesh>
  );
}

function SceneContent() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 12]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <StonePlanet />
      <OrbitingDebris />
    </>
  );
}

export function Scene({ isAuthPage }: { isAuthPage?: boolean }) {
  const { resolvedTheme } = useTheme();
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Only fade on scroll for the landing page
    if (isAuthPage) return;
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      const scrollY = window.scrollY;
      // Fade out as we scroll past hero section
      const newOpacity = Math.max(0, 1 - (scrollY / heroHeight) * 1.5);
      setOpacity(newOpacity);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthPage]);

  return (
    <div
      className={isAuthPage ? 'absolute inset-0 pointer-events-none z-0' : 'absolute inset-0 pointer-events-none z-0 hidden md:block'}
      style={
        {
          opacity,
          viewTransitionName: 'auth-scene',
        } as React.CSSProperties & { viewTransitionName?: string }
      }
    >
      <Canvas gl={{ preserveDrawingBuffer: true }} key={resolvedTheme}>
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
