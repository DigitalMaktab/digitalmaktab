import React, { useCallback } from "react";
import { EditorProps } from "../../properties/EditorProps";
import { useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { ClassSubject } from "../../../../models/ClassSubject";
import { ResponseResult } from "../../../../dtos/ResultEnum";
import AppBaseEditor from "../../../../components/AppBaseEditor";
import AppFormSelect from "../../../../components/form/AppFormSelect";
import AppSubjectSelect from "../../../../components/select/AppSubjectSelect";
import AppClassSelect from "../../../../components/select/AppClassSelect";

const SubjectEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addClassSubject } = useSchoolOperations();

  const initialFormData = {
    classId: "",
    subjectId: "",
  } as ClassSubject;

  const validationSchemaConfig = {
    classId: { label: t("subject.subjectName.label") },
    subjectId: { label: t("class.className.label") },
  } as Record<keyof ClassSubject, { label: string }>;

  const submitData = useCallback(
    async (classSubject: ClassSubject) => {
      let result;
      if (id) {
        // TODO: Update the Subject
        result = {};
        return;
      }

      result = await addClassSubject(classSubject);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/class-subject-list");
      }
    },
    [id, navigate, addClassSubject]
  );

  return (
    <AppBaseEditor<ClassSubject>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) =>
        data.subject && data.class
          ? `${data.subject.subjectName}`
          : t("classSubject.add.label")
      }
    >
      {(props) => (
        <div className="row">
          <div className="col-md-6">
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
          <div className="col-md-6">
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
        </div>
      )}
    </AppBaseEditor>
  );
};

export default SubjectEditor;
