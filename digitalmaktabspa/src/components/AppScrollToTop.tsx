import React, { useEffect, useRef } from "react";
import { AiOutlineArrowUp } from "react-icons/ai";

const AppScrollToTop = () => {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const button = buttonRef.current;

    const displayButton = () => {
      window.addEventListener("scroll", () => {
        if (window.scrollY > 600) {
          if (button) button.style.display = "block";
        } else {
          if (button) button.style.display = "none";
        }
      });
    };

    const scrollToTop = () => {
      if (button) {
        button.addEventListener("click", () => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
        });
      }
    };

    displayButton();
    scrollToTop();

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("scroll", displayButton);
      if (button) button.removeEventListener("click", scrollToTop);
    };
  }, []);
  return (
    <div
      className="tap-top"
      ref={buttonRef}
      style={{ display: "none", cursor: "pointer" }}
    >
      <AiOutlineArrowUp />
    </div>
  );
};

export default AppScrollToTop;
