import { UserRole } from "../../../models/UserRole";
import { Properties } from "../../properties/Properties";

export interface TabItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  roles?: UserRole[];
}

export interface TabProps extends Properties {
  tabs: TabItem[];
  defaultActiveTab?: string;
}
