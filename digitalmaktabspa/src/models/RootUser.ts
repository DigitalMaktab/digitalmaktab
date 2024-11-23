import { UserRole } from "./UserRole";

export interface RootUser {
  userRole: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}
