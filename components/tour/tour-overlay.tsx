"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TourStep } from "./tour-types";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function TourOverlay({ step, stepIndex, totalSteps, onNext, onPrev, onClose }: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle window resize and scroll
  const updateRect = useCallback(() => {
    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Add some padding
        const padding = 8;
        setTargetRect(new DOMRect(
          rect.x - padding,
          rect.y - padding,
          rect.width + padding * 2,
          rect.height + padding * 2
        ));
      } else {
        // Fallback if element not found: Center modal style
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.targetId]);

  useEffect(() => {
    setMounted(true);
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    
    // Mutation observer to handle dynamic content changes
    const observer = new MutationObserver(updateRect);
    observer.observe(document.body, { subtree: true, childList: true });

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      observer.disconnect();
    };
  }, [updateRect]);

  if (!mounted) return null;

  // Modal steps: no target OR has image/video (welcome screens)
  const isModal = !step.targetId || !targetRect || !!step.image;

  // Tooltip positioning logic
  const getTooltipStyle = () => {
    if (isModal) {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "600px",
        width: "90vw",
        maxHeight: "90vh",
        zIndex: 50
      };
    }

    if (!targetRect) return {};

    const margin = 12;
    const tooltipWidth = 320;

    let top = 0;
    let left = 0;
    let transform = "";

    switch (step.position) {
      case "top":
        top = targetRect.top - margin;
        left = targetRect.left + targetRect.width / 2;
        transform = "translate(-50%, -100%)";
        break;
      case "bottom":
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2;
        transform = "translate(-50%, 0)";
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - margin;
        transform = "translate(-100%, -50%)";
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + margin;
        transform = "translate(0, -50%)";
        break;
      default: // bottom default
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2;
        transform = "translate(-50%, 0)";
    }

    // Viewport boundary checks to prevent overflow
    // We only check horizontal overflow for simplicity in this iteration
    // If left is too far left
    if (left < tooltipWidth / 2) {
      left = margin;
      transform = transform.replace("translate(-50%", "translate(0");
      transform = transform.replace("translate(-100%", "translate(0"); // Reset if needed
      // Adjust transform based on position logic if needed, but simple clamp is safer:
      // If we change 'left', we must ensure 'transform' doesn't shift it back off-screen.
      // Easiest is to clear horizontal translation and set specific left.
      // But preserving the 'pointer' centered logic is hard without more complex UI.
      // Let's just clamp the calculated 'left' and trust translation? 
      // No, translate(-50%) relies on 'left' being the center.
      // If 'left' is near 0, 'left - 50% width' is negative.
      
      // Better strategy: Keep standard positioning but clamp the final box.
      // Actually, let's just use the calculated values but ensure units are added.
    }

    return { 
      position: "fixed" as const,
      top: `${top}px`, 
      left: `${left}px`, 
      transform, 
      width: "320px",
      maxWidth: "90vw",
      zIndex: 50 
    };
  };

  const tooltipStyle = getTooltipStyle();

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Backdrop with cutout */}
      {!isModal && targetRect && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.x}
                y={targetRect.y}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#tour-mask)"
          />
          {/* Highlight border */}
          <rect
            x={targetRect.x}
            y={targetRect.y}
            width={targetRect.width}
            height={targetRect.height}
            rx="8"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Full backdrop for modal steps */}
      {isModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        {isModal ? (
          // Modal: Centered with flexbox
          <div
            key={`modal-wrapper-${stepIndex}`}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 50,
            }}
          >
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                pointerEvents: "auto",
                maxWidth: "600px",
                width: "90vw",
                maxHeight: "90vh",
              }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col overflow-y-auto mx-4 my-4"
            >
              {step.image && (
                <div className="relative w-full bg-black aspect-video">
                  <video
                    src={step.image}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                  <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <p className="text-gray-700 text-base leading-relaxed">
                  {step.content}
                </p>

                <div className="flex items-center justify-between pt-2 mt-2">
                  <div className="flex gap-1">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    {stepIndex > 0 && (
                      <Button variant="outline" size="sm" onClick={onPrev} className="h-8 px-3">
                        <ChevronLeft size={14} className="mr-1" />
                        Atrás
                      </Button>
                    )}
                    <Button size="sm" onClick={onNext} className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                      {stepIndex === totalSteps - 1 ? "Finalizar" : "Siguiente"}
                      {stepIndex !== totalSteps - 1 && <ChevronRight size={14} className="ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Tooltip: Fixed positioning relative to target
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={tooltipStyle as React.CSSProperties}
            className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {step.image && (
              <div className="relative w-full bg-black aspect-video">
                <video
                  src={step.image}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            )}

            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-700 text-base leading-relaxed">
                {step.content}
              </p>

              <div className="flex items-center justify-between pt-2 mt-2">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'}`}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {stepIndex > 0 && (
                    <Button variant="outline" size="sm" onClick={onPrev} className="h-8 px-3">
                      <ChevronLeft size={14} className="mr-1" />
                      Atrás
                    </Button>
                  )}
                  <Button size="sm" onClick={onNext} className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                    {stepIndex === totalSteps - 1 ? "Finalizar" : "Siguiente"}
                    {stepIndex !== totalSteps - 1 && <ChevronRight size={14} className="ml-1" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

