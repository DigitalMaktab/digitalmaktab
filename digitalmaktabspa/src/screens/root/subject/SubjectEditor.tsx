import React, { useCallback } from "react";
import { EditorProps } from "../../school/properties/EditorProps";
import { useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import useRootOperations from "../../../hooks/useRootOperations";
import { Subject } from "../../../models/Subject";
import { ResponseResult } from "../../../dtos/ResultEnum";
import AppBaseEditor from "../../../components/AppBaseEditor";
import AppFormInput from "../../../components/form/AppFormInput";
import AppBookSelect from "../../../components/select/AppBookSelect";
import AppFormSelect from "../../../components/form/AppFormSelect";

const SubjectEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addSubject } = useRootOperations();

  const initialFormData = {
    subjectName: "",
    bookId: "",
  } as Subject;

  const validationSchemaConfig = {
    subjectName: { label: t("subject.subjectName.label") },
    bookId: { label: t("book.bookTitle.label") },
  } as Record<keyof Subject, { label: string }>;

  const submitData = useCallback(
    async (subject: Subject) => {
      let result;
      if (id) {
        // TODO: Update the Subject
        result = {};
        return;
      }

      result = await addSubject(subject);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/subject-list");
      }
    },
    [id, navigate, addSubject]
  );

  return (
    <AppBaseEditor<Subject>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) => data.subjectName || t("subject.add.label")}
    >
      {(props) => (
        <div className="row">
          <div className="col-md-6">
            <AppFormInput
              label={t("subject.subjectName.label")}
              name="subjectName"
              type="text"
              required={true}
              placeholder={t("subject.subjectName.label")}
            />
          </div>
          <div className="col-md-6">
            <AppFormSelect
              required={true}
              name="bookId"
              label=""
              value={id ? props.formData!.bookId.toString() : ""}
            >
              <AppBookSelect
                name="bookId"
                value={id ? props.formData!.bookId.toString() : ""}
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
