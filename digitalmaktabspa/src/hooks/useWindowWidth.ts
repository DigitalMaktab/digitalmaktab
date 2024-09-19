import { useState, useEffect, useCallback } from "react";

// Custom hook to track window width with debouncing
const useWindowWidth = (debounceTime = 100) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    const debouncedResize = () => {
      const timeoutId = setTimeout(handleResize, debounceTime);
      return () => clearTimeout(timeoutId);
    };

    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [handleResize, debounceTime]);

  return windowWidth;
};

export default useWindowWidth;
