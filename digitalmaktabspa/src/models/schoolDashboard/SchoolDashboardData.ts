import { ClassEnrollmentChart } from "./ClassEnrollmentChart";
import { GenderChart } from "./GenderChart";

export interface SchoolDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalBranches: number;
  genderChart: GenderChart;
  teachersGenderChart: GenderChart;
  classEnrollmentChart: ClassEnrollmentChart[];
}
