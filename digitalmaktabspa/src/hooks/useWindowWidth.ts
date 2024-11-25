import { useState, useEffect, useCallback } from "react";

// Custom hook to track window width with debouncing
const useWindowWidth = (debounceTime = 100) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, debounceTime);
    };

    window.addEventListener("resize", debouncedResize);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedResize);
    };
  }, [handleResize, debounceTime]);

  return windowWidth;
};

export default useWindowWidth;
