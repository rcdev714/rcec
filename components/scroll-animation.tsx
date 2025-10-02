'use client';

import { useEffect, useRef, useState } from 'react';

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  duration?: number;
  threshold?: number;
}

export function ScrollAnimation({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 600,
  threshold = 0.1
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timeoutId = setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [delay, threshold]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return 'translateY(30px)';
      case 'down':
        return 'translateY(-30px)';
      case 'left':
        return 'translateX(30px)';
      case 'right':
        return 'translateX(-30px)';
      case 'fade':
        return 'translateY(0)';
      default:
        return 'translateY(30px)';
    }
  };

  const getFinalTransform = () => {
    if (direction === 'left' || direction === 'right') {
      return 'translateX(0)';
    }
    return 'translateY(0)';
  };

  return (
    <div
      ref={elementRef}
      className={`${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? getFinalTransform() : getInitialTransform(),
        transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      }}
    >
      {children}
    </div>
  );
}
