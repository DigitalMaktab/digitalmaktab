import React, { useMemo, useState } from "react";
import { BranchEditorProps } from "./properties/BranchEditorProps";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { Branch } from "../../../models/Branch";
import * as Yup from "yup";
import AppFormCard from "../../../components/card/AppFormCard";
import AppFormInput from "../../../components/form/AppFormInput";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { ResponseResult } from "../../../dtos/ResultEnum";
import { useFormData } from "../../../hooks/useFormData";
import { EditorProps } from "../properties/EditorProps";
import { getValidationSchema } from "../../../helper/helper";

const ClassEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useAppLocalizer();

  const initialFormData = useMemo(
    () =>
      ({
        branchName: "",
      } as unknown as Branch),
    []
  );
  const [formData] = useFormData<Branch>(initialData, initialFormData);

  const { addBranch } = useSchoolOperations();

  const validationSchema = getValidationSchema(
    {
      branchName: { label: t("branch.branchName.label") },
    },
    t
  );

  const submitData = async (data: Branch) => {
    if (id) {
      //TODO: Update the data
    } else {
      // Enter new branch
      const result = await addBranch(data);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/branch-list");
      }
    }
  };

  return (
    <>
      <AppFormCard
        title={
          formData?.branchName
            ? `${formData.branchName}`
            : t("branch.addBranch.label")
        }
        initialValues={formData}
        onSubmit={submitData}
        validationSchema={validationSchema}
      >
        <div className="row">
          <div className="col-md-12">
            <AppFormInput
              name="branchName"
              label={t("branch.branchName.label")}
              value={formData?.branchName}
            />
          </div>
        </div>
      </AppFormCard>
    </>
  );
};

export default ClassEditor;
