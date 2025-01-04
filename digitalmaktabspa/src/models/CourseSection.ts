import { Base } from "./Base";
import { Course } from "./Course";
import { LearningMaterial } from "./LearningMaterial";

export interface CourseSection extends Base {
  courseId: string;
  course?: Course;
  title: string;
  description: string;
  learningMaterials?: LearningMaterial[];
}
