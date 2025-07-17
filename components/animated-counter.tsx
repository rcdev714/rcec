'use client';

import { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  targetNumber: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ targetNumber, duration = 2000, className = "" }: AnimatedCounterProps) {
  const [currentNumber, setCurrentNumber] = useState(0);

  useEffect(() => {
    if (targetNumber === 0) {
      setCurrentNumber(0);
      return;
    }
    
    let animationFrameId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // easeOutCubic easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const newNumber = Math.floor(easeOut * targetNumber);
      setCurrentNumber(newNumber);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Ensure the final number is exactly the target
        setCurrentNumber(targetNumber);
      }
    };
    
    // Start animation after a short delay to be noticeable
    const timer = setTimeout(() => {
      animate();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetNumber, duration]);

  const formattedNumber = currentNumber.toLocaleString('en-US');

  return (
    <span className={`inline-block tabular-nums ${className}`} style={{ color: 'inherit' }}>
      {formattedNumber}
    </span>
  );
} 