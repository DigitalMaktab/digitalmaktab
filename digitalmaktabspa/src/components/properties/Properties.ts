import { CSSProperties } from "react";
import { UserRole } from "../../models/UserRole";

export interface Properties {
  children?: React.ReactNode;
  styles?: CSSProperties;
  refresh?: () => void;
  title?: string;
  id?: string;
  actions?: React.ReactNode;
  roles?: UserRole[];
}
