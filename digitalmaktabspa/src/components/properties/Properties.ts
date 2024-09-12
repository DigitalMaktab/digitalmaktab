import { CSSProperties } from "react";

export interface Properties {
  children: React.ReactNode;
  styles?: CSSProperties;
  refresh?: () => void;
}
