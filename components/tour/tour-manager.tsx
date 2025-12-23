"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TourOverlay } from "./tour-overlay";
import { TOUR_STEPS } from "./tour-steps";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Versioning to re-show tour if we update it
const TOUR_VERSION = "v2";

export default function TourManager() {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Determine current route key (e.g., 'dashboard', 'chat')
  const routeSegment = pathname.split("/")[1] || "dashboard"; // default to dashboard for root
  const steps = TOUR_STEPS[routeSegment];

  const storageKey = userId ? `tour:${TOUR_VERSION}:${userId}:${routeSegment}` : null;

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Check if user has seen tour for this page
  useEffect(() => {
    if (!storageKey || !steps) return;
    
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      // Auto-start tour if not seen
      // Wait a bit for UI to settle
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey, routeSegment, steps]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleClose = () => {
    setIsActive(false);
    setStepIndex(0);
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
  };

  const handleRestart = () => {
    setStepIndex(0);
    setIsActive(true);
  };

  if (!mounted || !steps || steps.length === 0) return null;

  return (
    <>
      {/* Help Trigger - Always visible on supported pages */}
      <div className="fixed bottom-6 right-6 z-40">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 bg-white shadow-md border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200"
                onClick={handleRestart}
              >
                <HelpCircle size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Ver tour de esta página</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isActive && (
        <TourOverlay
          step={steps[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </>
  );
}

