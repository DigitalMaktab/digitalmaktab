import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Class } from "../../../models/Class";
import AppBranchSelect from "../../../components/select/AppBranchSelect";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppClassTypeSelect from "../../../components/select/AppClassTypeSelect";
import AppShiftSelect from "../../../components/select/AppShiftSelect";
import { EditorProps } from "../properties/EditorProps";
import AppTeacherSelect from "../../../components/select/AppTeacherSelect";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { ResponseResult } from "../../../dtos/ResultEnum";
import AppClassNameSelect from "../../../components/select/AppClassNameSelect";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import AppBaseEditor from "../../../components/AppBaseEditor";

const ClassEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useAppLocalizer();
  const { addClass } = useSchoolOperations();

  const initialFormData = {
    className: "",
    branchId: "",
    classType: "",
    shift: "",
    teacherId: "",
  } as unknown as Class;

  const validationSchemaConfig = {
    className: { label: t("class.className.label") },
    branchId: { label: t("branch.branchName.label") },
    classType: { label: t("class.classType.label") },
    shift: { label: t("class.shift.label") },
    teacherId: { label: t("teacher.firstName.label") },
  } as Record<keyof Class, { label: string }>;

  const submitData = useCallback(
    async (newClass: Class) => {
      try {
        let result;
        if (id) {
          // If id exists, update the existing record
          // result = await updateTeacher(id, teacher); // Assuming `updateTeacher` is available
          result = {};
        } else {
          // If no id, create a new record
          result = await addClass(newClass);
        }

        if (result.status === ResponseResult.SUCCESS) {
          navigate("/class-list");
        }
      } catch (error) {
        console.error("Submission failed:", error);
      }
    },
    [id, addClass, navigate]
  );

  return (
    <>
      <AppBaseEditor<Class>
        initialData={initialData}
        initialFormData={initialFormData}
        validationSchemaConfig={validationSchemaConfig}
        onSubmit={submitData}
        title={(data) =>
          data.className && data.branch?.branchName
            ? `${data.className} ${data.branch.branchName}`
            : t("class.addClass.label")
        }
      >
        {(props) => (
          <div className="row">
            <div className="col-md-4">
              <AppFormSelect
                name="className"
                label=""
                value={id ? props.formData!.className.toString() : ""}
              >
                <AppClassNameSelect
                  name="className"
                  value={id ? props.formData!.className.toString() : ""}
                  onChange={() => {}}
                />
              </AppFormSelect>
            </div>
            <div className="col-md-4">
              <AppFormSelect
                name="branchId"
                label=""
                value={id ? props.formData!.branchId : ""}
              >
                <AppBranchSelect
                  name="branchId"
                  value={id ? props.formData!.branchId : ""}
                  onChange={() => {}}
                />
              </AppFormSelect>
            </div>
            <div className="col-md-4">
              <AppFormSelect
                name="classType"
                label=""
                value={id ? props.formData!.classType.toString() : ""}
              >
                <AppClassTypeSelect
                  name="classType"
                  value={id ? props.formData!.classType.toString() : ""}
                  onChange={() => {}}
                />
              </AppFormSelect>
            </div>
            <div className="col-md-6">
              <AppFormSelect
                name="shift"
                label=""
                value={id ? props.formData!.classType.toString() : ""}
              >
                <AppShiftSelect
                  name="shift"
                  value={id ? props.formData!.classType.toString() : ""}
                  onChange={() => {}}
                />
              </AppFormSelect>
            </div>

            <div className="col-md-6">
              <AppFormSelect
                name="teacherId"
                label=""
                value={id ? props.formData!.teacherId.toString() : ""}
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
    </>
  );
};

export default ClassEditor;
