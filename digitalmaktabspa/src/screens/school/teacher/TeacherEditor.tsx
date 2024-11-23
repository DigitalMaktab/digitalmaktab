import React, { useCallback, useMemo } from "react";
import AppCard from "../../../components/card/AppCard";
import AppTab from "../../../components/tab/AppTab";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import * as AIIcons from "react-icons/ai";
import * as SIIcons from "react-icons/si";
import { useNavigate, useParams } from "react-router-dom";
import AppFormCard from "../../../components/card/AppFormCard";
import AppFormInput from "../../../components/form/AppFormInput";
import AppTable from "../../../components/table/AppTable";
import AppAddressForm from "../../../components/form/AppAddressForm";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppGenderSelect from "../../../components/select/AppGenderSelects";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { TabItem } from "../../../components/tab/properties/TabProps";
import { Teacher } from "../../../models/Teacher";
import { Class } from "../../../models/Class";
import { Branch } from "../../../models/Branch";
import { Column } from "../../../components/table/properties/TableProps";
import { ResponseResult } from "../../../dtos/ResultEnum";
import { EditorProps } from "../properties/EditorProps";
import { PhoneNumberValue } from "../../../components/properties/InputProps";
import { Gender } from "../../../models/Gender";
import { useFormData } from "../../../hooks/useFormData";
import { getValidationSchema } from "../../../helper/helper";

const TeacherEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { t } = useAppLocalizer();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Initialize form data
  const initialFormData = useMemo(
    () =>
      ({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: { countryId: "", number: "" },
        gender: Gender.EMPTY,
        primaryAddress: { region: "", street: "", village: "" },
      } as Teacher),
    []
  );

  const [formData] = useFormData<Teacher>(initialData, initialFormData);

  const validationSchema = getValidationSchema(
    {
      firstName: { label: t("teacher.firstName.label") },
      lastName: { label: t("teacher.lastName.label") },
      email: { label: t("auth.email.label") },
      gender: { label: t("gender.label") },
      phoneNumber: {
        label: "",
        nested: {
          number: {
            label: t("auth.signup.phoneNumber.label"),
          },
        },
      },
      primaryAddress: {
        label: t("addressForm.label"),
        nested: {
          street: { label: t("addressForm.street.label") },
          region: { label: t("addressForm.region.label") },
          village: { label: t("addressForm.village.label") },
        },
      },
    },
    t
  );

  const phoneNumberValue: PhoneNumberValue = useMemo(
    () => ({
      countryId: formData.phoneNumber?.countryId || "",
      number: formData.phoneNumber?.number || "",
    }),
    [formData.phoneNumber]
  );

  const { registerTeacher } = useSchoolOperations();

  const columns: Column<Class>[] = useMemo(
    () => [
      { header: t("class.className.label"), accessor: "classNameValue" },
      {
        header: t("branch.branchName.label"),
        accessor: "branch",
        render: (branch: Branch) => branch?.branchName || "",
      },
      { header: t("class.classType.label"), accessor: "classTypeValue" },
      { header: t("shift.label"), accessor: "shiftValue" },
    ],
    [t]
  );

  const submitData = useCallback(
    async (teacher: Teacher) => {
      try {
        let result;
        if (id) {
          // If id exists, update the existing record
          // result = await updateTeacher(id, teacher); // Assuming `updateTeacher` is available
          result = {};
        } else {
          // If no id, create a new record
          result = await registerTeacher(teacher);
        }

        if (result.status === ResponseResult.SUCCESS) {
          navigate("/teacher-list");
        }
      } catch (error) {
        console.error("Submission failed:", error);
      }
    },
    [id, registerTeacher, navigate]
  );

  const profileTabContent = (
    <AppFormCard
      validationSchema={validationSchema}
      initialValues={formData}
      onSubmit={submitData}
    >
      <div className="row">
        <div className="col-md-4">
          <AppFormInput
            name="firstName"
            label={t("teacher.firstName.label")}
            value={formData?.firstName}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="lastName"
            label={t("teacher.lastName.label")}
            value={formData?.lastName}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="email"
            label={t("auth.email.label")}
            value={formData?.email}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("auth.signup.phoneNumber.label")}
            name="phoneNumber.number"
            placeholder={t("auth.signup.phoneNumber.placeholder")}
            type="phoneNumber"
            required
            phoneNumber={phoneNumberValue}
          />
        </div>
        <div className="col-md-6">
          <AppFormSelect
            name="gender"
            label=""
            value={formData?.gender?.toString() || ""}
          >
            <AppGenderSelect
              name="gender"
              value={formData?.gender?.toString() || ""}
              onChange={() => {}}
            />
          </AppFormSelect>
        </div>
      </div>
      <AppAddressForm prefix="primaryAddress" />
    </AppFormCard>
  );

  const classesTabContent = (
    <AppCard>
      {formData.classes && (
        <AppTable
          rowLink="/class-editor/{id}"
          data={formData.classes as Class[]}
          columns={columns}
          totalPages={1}
          fetchPageData={() => {}}
        />
      )}
    </AppCard>
  );

  const tabData: TabItem[] = [
    {
      id: "profile",
      title: t("teacher.teacherEditor.tabs.profile.label"),
      content: profileTabContent,
      icon: <AIIcons.AiOutlineProfile className="stroke-icon" />,
    },
    {
      id: "classes",
      title: t("teacher.teacherEditor.tabs.classes.label"),
      content: classesTabContent,
      icon: <SIIcons.SiGoogleclassroom className="stroke-icon" />,
    },
  ];

  return (
    <AppCard
      title={
        formData?.firstName && formData.lastName
          ? `${formData.firstName} ${formData.lastName}`
          : t("teacher.teacherEditor.label")
      }
    >
      <AppTab tabs={tabData} defaultActiveTab="profile" />
    </AppCard>
  );
};

export default TeacherEditor;
