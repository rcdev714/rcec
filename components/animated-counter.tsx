'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
  targetNumber: number;
  duration?: number;
  className?: string;
  startOnVisible?: boolean;
}

export function AnimatedCounter({
  targetNumber,
  duration = 2000,
  className = '',
  startOnVisible = true
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    if (startOnVisible && !inView) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const currentCount = Math.floor(targetNumber * percentage);
      setCount(currentCount);
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(targetNumber);
      }
    };

    requestAnimationFrame(animate);

  }, [inView, startOnVisible, targetNumber, duration]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-EC').format(num);
  };

  return (
    <span ref={ref} className={className}>
      {formatNumber(count)}
    </span>
  );
} 