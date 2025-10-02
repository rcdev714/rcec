'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  targetNumber: number;
  duration?: number;
  className?: string;
  trigger?: boolean;
}

export function AnimatedCounter({ targetNumber, duration = 2000, className = "", trigger = true }: AnimatedCounterProps) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!trigger || hasAnimated || targetNumber === 0) return;

    const element = elementRef.current;
    if (!element) return;

    const startAnimation = () => {
      let animationFrameId: number;
      const startTime = Date.now();

      const animate = () => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newNumber = Math.floor(easeOut * targetNumber);
        setCurrentNumber(newNumber);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setCurrentNumber(targetNumber);
        }
      };

      const timer = setTimeout(() => {
        animate();
      }, 300);

      return () => {
        clearTimeout(timer);
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            startAnimation();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [trigger, hasAnimated, targetNumber, duration]);

  const formattedNumber = currentNumber.toLocaleString('en-US');

  return (
    <span ref={elementRef} className={`inline-block tabular-nums ${className}`} style={{ color: 'inherit' }}>
      {formattedNumber}
    </span>
  );
} 