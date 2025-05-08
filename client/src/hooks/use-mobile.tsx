import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized
 * @param breakpoint - Breakpoint width in pixels (default: 768px)
 * @returns boolean indicating if screen width is below the breakpoint
 */
export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Clean up
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}
