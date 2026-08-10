import { useEffect, useState } from "react";

/**
 * useIsMobile
 * Tracks whether the viewport is below a breakpoint (default 900px,
 * matching the Sidebar's drawer breakpoint). Safe to call in multiple
 * components — each gets its own listener, no prop drilling required.
 */
export default function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}