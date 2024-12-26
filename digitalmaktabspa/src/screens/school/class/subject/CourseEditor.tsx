import React, { useCallback } from "react";
import { EditorProps } from "../../properties/EditorProps";
import { useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { Course } from "../../../../models/Course";
import { ResponseResult } from "../../../../dtos/ResultEnum";
import AppBaseEditor from "../../../../components/AppBaseEditor";
import AppFormSelect from "../../../../components/form/AppFormSelect";
import AppSubjectSelect from "../../../../components/select/AppSubjectSelect";
import AppClassSelect from "../../../../components/select/AppClassSelect";
import AppTeacherSelect from "../../../../components/select/AppTeacherSelect";

const CourseEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addCourse } = useSchoolOperations();

  const initialFormData = {
    classId: "",
    subjectId: "",
    teacherId: "",
  } as Course;

  const validationSchemaConfig = {
    classId: { label: t("subject.subjectName.label") },
    subjectId: { label: t("class.className.label") },
    teacherId: { label: t("teacher.firstName.label") },
  } as Record<keyof Course, { label: string }>;

  const submitData = useCallback(
    async (course: Course) => {
      let result;
      if (id) {
        // TODO: Update the Subject
        result = {};
        return;
      }

      result = await addCourse(course);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/course-list");
      }
    },
    [id, navigate, addCourse]
  );

  return (
    <AppBaseEditor<Course>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) =>
        data.subject && data.class
          ? `${data.subject.subjectName}`
          : t("course.add.label")
      }
    >
      {(props) => (
        <div className="row">
          <div className="col-md-4">
            <AppFormSelect
              required={true}
              name="classId"
              label=""
              value={id ? props.formData!.classId.toString() : ""}
            >
              <AppClassSelect
                name="subjectId"
                value={id ? props.formData!.classId.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-4">
            <AppFormSelect
              required={true}
              name="subjectId"
              label=""
              value={id ? props.formData!.subjectId.toString() : ""}
            >
              <AppSubjectSelect
                name="subjectId"
                value={id ? props.formData!.subjectId.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-4">
            <AppFormSelect
              required={true}
              name="teacherId"
              label=""
              value={id ? props.formData!.subjectId.toString() : ""}
            >
              <AppTeacherSelect
                name="teacherId"
                value={id ? props.formData!.teacherId.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
        </div>
      )}
    </AppBaseEditor>
  );
};

export default CourseEditor;
