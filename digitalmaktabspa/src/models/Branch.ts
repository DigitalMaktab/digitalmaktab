import { Base } from "./Base";
import { School } from "./School";

export interface Branch extends Base {
  branchName: string;
  schoolId: string;
  school: School;
}
