'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface StockArrowProps {
  position: [number, number, number];
  direction: [number, number, number];
  length: number;
  color: string;
  scene: THREE.Scene;
}

export function StockArrow({ position, direction, length, color, scene }: StockArrowProps) {
  const arrowRef = useRef<THREE.ArrowHelper | null>(null);

  useEffect(() => {
    // Create arrow helper
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(...direction),
      new THREE.Vector3(...position),
      length,
      color
    );

    // Style the arrow to look more like a stock market trend
    arrowHelper.line.material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2,
    });

    arrowHelper.cone.material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
    });

    scene.add(arrowHelper);
    arrowRef.current = arrowHelper;

    return () => {
      if (arrowRef.current) {
        scene.remove(arrowRef.current);
        // Dispose of materials to prevent memory leaks
        if (arrowRef.current.line.material instanceof THREE.Material) {
          arrowRef.current.line.material.dispose();
        }
        if (arrowRef.current.cone.material instanceof THREE.Material) {
          arrowRef.current.cone.material.dispose();
        }
      }
    };
  }, [position, direction, length, color, scene]);

  return null; // This component doesn't render anything itself
}
