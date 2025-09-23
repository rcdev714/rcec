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
    const starCount = 25000; // Number of stars (more for density with smaller particles)
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
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        size: 0.5 + Math.random() * 1.5
      };
      stars.push(star);

      // Set positions
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Set colors (dark gray/blue for visibility on white background)
      const colorVariation = Math.random();
      colors[i * 3] = 0.2 + colorVariation * 0.3;     // R (darker)
      colors[i * 3 + 1] = 0.3 + colorVariation * 0.4; // G (darker)
      colors[i * 3 + 2] = 0.6 + colorVariation * 0.4; // B (more blue)

      sizes[i] = star.size * 0.3; // Make stars much smaller
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

          // Create atomic-like appearance with sharper falloff
          if (r > 0.4) discard;

          // More defined particle shape with center brightness
          float core = 1.0 - smoothstep(0.0, 0.15, r); // Bright core
          float halo = (1.0 - smoothstep(0.15, 0.4, r)) * 0.8; // Brighter halo
          float alpha = (core + halo) * vTwinkle * 2.0; // Even higher opacity for small particles

          // Add slight blue tint variation for atomic feel
          vec3 finalColor = vColor + vec3(0.0, 0.1, 0.2) * (1.0 - r * 2.0);

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
      style={{ zIndex: 0 }}
    />
  );
}
