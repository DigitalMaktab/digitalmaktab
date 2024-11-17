import React, { useState } from "react";
import { ClassEditorProps } from "./properties/ClassEditorProps";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";
import { Class } from "../../../models/Class";
import { useTranslation } from "react-i18next";
import AppFormInput from "../../../components/form/AppFormInput";
import AppBranchSelect from "../../../components/select/AppBranchSelect";
import AppFormCard from "../../../components/card/AppFormCard";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppClassTypeSelect from "../../../components/select/AppClassTypeSelect";
import AppShiftSelect from "../../../components/select/AppShiftSelect";
import { EditorProps } from "../properties/EditorProps";

const ClassEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dataFromState = location.state?.initialData as Class;
  const [formData, setFormData] = useState<Class>(
    (initialData as Class) || dataFromState || {}
  );

  const validationSchema: Yup.AnyObjectSchema = Yup.object().shape({
    className: Yup.string().required(t("class.className.validation.required")),
    branchId: Yup.string().required(t("branch.branchName.validation.required")),
    classType: Yup.string().required(t("class.classType.validation.required")),
  });

  return (
    <>
      <AppFormCard
        title={
          formData?.className && formData.branch?.branchName
            ? `${formData.className} ${formData.branch.branchName}`
            : t("class.addClass.label")
        }
        initialValues={formData}
        onSubmit={(data: Class) => {
          console.log(data);
        }}
        validationSchema={validationSchema}
      >
        <div className="row">
          <div className="col-md-3">
            <AppFormInput
              name="className"
              label={t("class.className.label")}
              value={formData?.classNameValue}
            />
          </div>
          <div className="col-md-3">
            <AppFormSelect
              name="branchId"
              label=""
              value={id ? formData!.branchId : ""}
            >
              <AppBranchSelect
                name="branchId"
                value={id ? formData!.branchId : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-3">
            <AppFormSelect
              name="classType"
              label=""
              value={id ? formData!.classType.toString() : ""}
            >
              <AppClassTypeSelect
                name="classType"
                value={id ? formData!.classType.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-3">
            <AppFormSelect
              name="shift"
              label=""
              value={id ? formData!.classType.toString() : ""}
            >
              <AppShiftSelect
                name="shift"
                value={id ? formData!.classType.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
        </div>
      </AppFormCard>
    </>
  );
};

export default ClassEditor;
