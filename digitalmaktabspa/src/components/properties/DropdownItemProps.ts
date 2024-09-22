import { CSSProperties } from "react";

export interface DropdownItemProps {
  dropdownKey: string;
  icon: string;
  badge?: string;
  refIndex: number;
  isOpen: boolean;
  toggleDropdown: (dropdownKey: string) => void;
  dropdownRefs: React.MutableRefObject<(HTMLLIElement | null)[]>;
  children: React.ReactNode;
  className?: string;
  badgeClassName?: string;
  style?: CSSProperties;
}
