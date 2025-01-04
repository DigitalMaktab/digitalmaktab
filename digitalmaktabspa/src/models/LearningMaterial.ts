import { Base } from "./Base";
import { CourseSection } from "./CourseSection";
import { LearningMaterialType } from "./LearningMaterialType";

export interface LearningMaterial extends Base {
  title: string;
  description: string;
  filePath?: string;
  file?: File | null;
  fileName?: string;
  contentType?: string;
  learningMaterialType: LearningMaterialType;
  learningMaterialTypeValue?: string;
  thumbnailPath?: string;
  thumbnail?: File | null;
  courseSectionId?: string;
  courseSection?: CourseSection;
}
