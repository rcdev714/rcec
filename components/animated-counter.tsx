'use client';

import { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  targetNumber: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ targetNumber, duration = 2000, className = "" }: AnimatedCounterProps) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [animatingDigit, setAnimatingDigit] = useState(0);

  useEffect(() => {
    if (targetNumber === 0) return;

    const startTime = Date.now();
    const baseNumber = Math.floor(targetNumber / 10) * 10;
    const lastDigit = targetNumber % 10;

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Ease-out animation function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      if (progress < 0.7) {
        // First 70% of animation: count up to base number
        const currentCount = Math.floor(easeOut * baseNumber);
        setCurrentNumber(currentCount);
        setAnimatingDigit(Math.floor(Math.random() * 10)); // Random digit for animation effect
      } else {
        // Last 30% of animation: animate the last digit
        const digitProgress = (progress - 0.7) / 0.3;
        const digitEase = 1 - Math.pow(1 - digitProgress, 2);
        const currentDigit = Math.floor(digitEase * (lastDigit + 1));
        
        setCurrentNumber(baseNumber);
        setAnimatingDigit(Math.min(currentDigit, lastDigit));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentNumber(targetNumber);
        setAnimatingDigit(0);
      }
    };

    // Start animation after a short delay
    const timer = setTimeout(() => {
      animate();
    }, 500);

    return () => clearTimeout(timer);
  }, [targetNumber, duration]);

  const displayNumber = currentNumber + animatingDigit;
  const formattedNumber = displayNumber.toLocaleString();

  return (
    <span className={`inline-block tabular-nums ${className}`} style={{ color: 'inherit' }}>
      {formattedNumber}
    </span>
  );
} 