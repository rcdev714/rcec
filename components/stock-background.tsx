'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { StockArrow } from './stock-arrow';

interface StockBackgroundProps {
  className?: string;
}

interface ArrowData {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  length: number;
  speed: number; // Movement speed
  createdAt: number; // Creation timestamp
}

export function StockBackground({ className }: StockBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  // Initialize Three.js scene
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
    scene.background = null; // Transparent background to show arrows on white

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable for better performance
      alpha: true,
      powerPreference: 'low-power', // Prefer integrated graphics
      failIfMajorPerformanceCaveat: false // Allow software rendering fallback
    });

    // Performance optimizations based on device capabilities
    const isMobile = window.innerWidth < 768;
    const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Performance settings
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    mount.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Start with empty arrows - they'll be created dynamically
    setArrows([]);

    console.log('StockBackground initialized - arrows will be created dynamically from center');

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
        // Clear geometries and materials
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    let lastArrowCreation = 0;
    const baseInterval = 600; // Base interval between arrow creations
    let arrowCreationInterval = baseInterval + Math.random() * 400; // 600-1000ms random interval

    const animate = (time: number) => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

      // Create new arrows randomly across the screen periodically
      if (time - lastArrowCreation > arrowCreationInterval) {
        setArrows(prevArrows => {
          // Limit total arrows to prevent overcrowding (max 6-8 arrows)
          if (prevArrows.length >= 8) return prevArrows;

          // Create 1-3 arrows at random positions
          const newArrows = [];
          const arrowCount = Math.floor(Math.random() * 3) + 1; // 1-3 arrows

          for (let i = 0; i < arrowCount; i++) {
            // Random X position across the screen width (-8 to 8 range for better distribution)
            const randomX = (Math.random() - 0.5) * 16; // -8 to 8 range

            const newArrow: ArrowData = {
              id: `arrow-${Date.now()}-${i}`,
              position: [randomX, -8, 0], // Start from bottom at random X
              direction: [0, 1, 0], // Point upward
              length: 1.2 + Math.random() * 0.8, // Vary length (1.2-2.0)
              speed: 0.008 + Math.random() * 0.006, // Vary speed (0.008-0.014)
              createdAt: time
            };
            newArrows.push(newArrow);
          }

          return [...prevArrows, ...newArrows];
        });
        lastArrowCreation = time;
        // Randomize next interval for more natural timing
        arrowCreationInterval = baseInterval + Math.random() * 400;
      }

      // Update arrow positions - move upward and remove when off screen
      setArrows(prevArrows =>
        prevArrows
          .map(arrow => ({
            ...arrow,
            position: [
              arrow.position[0],
              arrow.position[1] + arrow.speed, // Move upward
              arrow.position[2]
            ] as [number, number, number]
          }))
          .filter(arrow => arrow.position[1] < 10) // Remove when off screen (top)
      );

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

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
    >
      {sceneRef.current && arrows.map(arrow => (
        <StockArrow
          key={arrow.id}
          position={arrow.position}
          direction={arrow.direction}
          length={arrow.length}
          color="#374151" // Darker gray for better visibility on white background
          scene={sceneRef.current!}
        />
      ))}
    </div>
  );
}
