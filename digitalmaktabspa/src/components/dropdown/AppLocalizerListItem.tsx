import React, { memo } from "react";

import Flag from "react-world-flags";
import { LocalizerListItemProps } from "../properties/LocalizerListItemProps";

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    userSelect: "none",
    outline: "none", // Removes default focus outline for a custom one
  } as React.CSSProperties,
  containerHoverFocus: {
    backgroundColor: "#f0f0f0", // Light hover effect
    transform: "scale(1.02)", // Slight scale effect on hover/focus
  } as React.CSSProperties,
  flag: {
    width: "24px",
    height: "24px",
    marginRight: "8px",
  } as React.CSSProperties,
  text: {
    fontSize: "16px",
  } as React.CSSProperties,
};

const AppLocalizerListItem: React.FC<LocalizerListItemProps> = memo(
  ({ language, flag, onSelect }) => {
    // Handles keyboard interaction (Enter and Space keys)
    const handleKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.();
      }
    };

    return (
      <li
        role="button"
        tabIndex={0} // Makes it focusable
        onClick={() => onSelect?.()}
        onKeyDown={handleKeyDown}
        style={styles.container}
        aria-label={`Select ${language} language`}
        onFocus={(e) =>
          Object.assign(e.currentTarget.style, styles.containerHoverFocus)
        }
        onBlur={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        onMouseOver={(e) =>
          Object.assign(e.currentTarget.style, styles.containerHoverFocus)
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")} // Active state
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.02)")} // Returns to hover state
      >
        <Flag code={flag} alt={`${language} flag`} style={styles.flag} />
        <span style={styles.text}> {language} </span>
      </li>
    );
  }
);

export default AppLocalizerListItem;
