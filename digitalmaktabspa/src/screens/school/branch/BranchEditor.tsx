import React, { useState } from "react";
import { BranchEditorProps } from "./properties/BranchEditorProps";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { Branch } from "../../../models/Branch";
import * as Yup from "yup";
import AppFormCard from "../../../components/card/AppFormCard";
import AppFormInput from "../../../components/form/AppFormInput";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { ResponseResult } from "../../../dtos/ResultEnum";

const ClassEditor: React.FC<BranchEditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useAppLocalizer();
  const dataFromState = location.state?.initialData as Branch;
  const [formData, setFormData] = useState<Branch>(
    initialData || dataFromState || {}
  );

  const { addBranch, data } = useSchoolOperations();

  const validationSchema: Yup.AnyObjectSchema = Yup.object().shape({
    branchName: Yup.string().required(
      t("branch.branchName.validation.required")
    ),
  });

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
