'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface StarFieldProps {
  className?: string;
}

interface Star {
  position: THREE.Vector3;
  brightness: number;
  twinkleSpeed: number;
  size: number;
}

export function StarField({ className }: StarFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  // Initialize Three.js scene for night sky
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not available, falling back to static background');
        setIsAnimating(false);
        return;
      }
    } catch (e) {
      console.warn('WebGL initialization failed:', e);
      setIsAnimating(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = null; // Transparent background

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position camera to look at the sky from ground level
    camera.position.set(0, -2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power'
    });

    const isMobile = window.innerWidth < 768;
    const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    mount.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Create star field
    createStarField(scene);

    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && mount) {
        mount.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starsRef.current.geometry.dispose();
        if (starsRef.current.material instanceof THREE.Material) {
          starsRef.current.material.dispose();
        }
      }
    };
  }, []);

  const createStarField = (scene: THREE.Scene) => {
    const starCount = 200; // Number of stars (reduced for better performance)
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const stars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      // Create stars in a dome shape above the horizon
      const radius = 15 + Math.random() * 10; // Distance from center
      const theta = Math.random() * Math.PI * 0.6; // Angle from vertical (dome shape)
      const phi = Math.random() * Math.PI * 2; // Horizontal angle

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(phi);

      // Store star data
      const star: Star = {
        position: new THREE.Vector3(x, y, z),
        brightness: 0.1 + Math.random() * 0.4, // Much dimmer
        twinkleSpeed: 0.005 + Math.random() * 0.01, // Slower twinkling
        size: 0.3 + Math.random() * 0.8 // Much smaller
      };
      stars.push(star);

      // Set positions
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Set colors (indigo-500 for consistency with theme)
      const colorVariation = Math.random();
      colors[i * 3] = 0.388 + colorVariation * 0.1;     // R (indigo-500 base with variation)
      colors[i * 3 + 1] = 0.400 + colorVariation * 0.1; // G (indigo-500 base with variation)
      colors[i * 3 + 2] = 0.945 + colorVariation * 0.05; // B (indigo-500 base with variation)

      sizes[i] = star.size * 0.3; // Much smaller for subtle effect
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 starColor;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float time;

        void main() {
          vColor = starColor;
          vTwinkle = sin(time * 2.0 + position.x * 0.1) * 0.3 + 0.7;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (120.0 / -mvPosition.z); // Much smaller particles
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float r = distance(gl_PointCoord, center);

          // Create thin, matrix-like appearance
          if (r > 0.15) discard;

          // Very thin and sharp falloff for matrix effect
          float core = 1.0 - smoothstep(0.0, 0.08, r);
          float alpha = core * vTwinkle * 0.6; // Much more subtle

          // Minimal color variation
          vec3 finalColor = vColor;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(geometry, material);
    scene.add(starField);
    starsRef.current = starField;
  };

  // Animation loop for Earth rotation effect
  useEffect(() => {
    if (!isAnimating || !sceneRef.current || !rendererRef.current || !cameraRef.current || !starsRef.current) return;

    const animate = (time: number) => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !starsRef.current) return;

      try {
        // Update shader time for twinkling
        if (starsRef.current.material instanceof THREE.ShaderMaterial) {
          starsRef.current.material.uniforms.time.value = time * 0.001;
        }

        // Earth rotation effect - rotate around offset axis (bottom left)
        const rotationSpeed = 0.0005; // Slow rotation
        starsRef.current.rotation.y += rotationSpeed;

        // Add slight wobble for more natural movement
        starsRef.current.rotation.x = Math.sin(time * 0.0002) * 0.05;
        starsRef.current.rotation.z = Math.cos(time * 0.0003) * 0.03;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (error) {
        console.error("Error in animation loop:", error);
        // Stop the animation loop if an error occurs
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsAnimating(false);
      }
      
      if (isAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none ${className || ''}`}
      style={{
        zIndex: 0,
        background: `
          linear-gradient(135deg,
            rgba(15, 23, 42, 0.02) 0%,
            rgba(30, 58, 138, 0.01) 25%,
            rgba(79, 70, 229, 0.005) 50%,
            rgba(30, 58, 138, 0.01) 75%,
            rgba(15, 23, 42, 0.02) 100%
          ),
          radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(139, 92, 246, 0.01) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.005) 0%, transparent 70%)
        `
      }}
    />
  );
}
