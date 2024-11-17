import { useEffect, useMemo, useState, useCallback } from "react";
import useWindowWidth from "./useWindowWidth";

const useHome = () => {
  const windowWidth = useWindowWidth();

  // Memoize isMobileView to determine if the screen width indicates a mobile view
  const isMobileView = useMemo(() => windowWidth <= 1199, [windowWidth]);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Toggle sidebar state
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Update sidebar state on window resize
  useEffect(() => {
    setSidebarOpen(!isMobileView);
  }, [isMobileView]);

  return {
    isSidebarOpen,
    handleSidebarToggle,
  };
};

export default useHome;
