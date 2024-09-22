import { useState, useEffect, useCallback, useRef } from "react";

interface DropdownState {
  [key: string]: boolean;
}

export const useDropdowns = () => {
  const [dropdownState, setDropdownState] = useState<DropdownState>({});
  const dropdownRefs = useRef<(HTMLLIElement | null)[]>([]);

  const toggleDropdown = useCallback((dropdownKey: string) => {
    setDropdownState((prevState) => ({
      ...prevState,
      [dropdownKey]: !prevState[dropdownKey],
    }));
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setDropdownState({});
  }, []);

  useEffect(() => {
    const handleBodyClick = (event: MouseEvent) => {
      if (
        !dropdownRefs.current.some((dropdown) =>
          dropdown?.contains(event.target as Node)
        )
      ) {
        closeAllDropdowns();
      }
    };

    document.body.addEventListener("click", handleBodyClick);
    return () => document.body.removeEventListener("click", handleBodyClick);
  }, [closeAllDropdowns]);

  return {
    dropdownState,
    toggleDropdown,
    dropdownRefs,
  };
};
