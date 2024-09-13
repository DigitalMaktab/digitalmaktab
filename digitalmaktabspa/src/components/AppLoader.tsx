import React, { useEffect, useRef } from "react";

const AppLoader = () => {
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loaderElement = loaderRef.current;

    if (loaderElement) {
      setTimeout(() => {
        loaderElement.style.transition = "opacity 0.5s ease";
        loaderElement.style.opacity = "0";

        setTimeout(() => {
          if (loaderElement.parentElement) {
            loaderElement.parentElement.removeChild(loaderElement);
          }
        }, 500); // Match the fade-out duration
      }, 1000); // Delay before the fade-out begins
    }
  }, []);
  return (
    <div className="loader-wrapper" ref={loaderRef}>
      <div className="loader"></div>
    </div>
  );
};

export default AppLoader;
