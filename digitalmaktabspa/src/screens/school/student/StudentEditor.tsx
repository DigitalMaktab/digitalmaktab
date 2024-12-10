import React, { useCallback } from "react";
import AppCard from "../../../components/card/AppCard";
import AppTab from "../../../components/tab/AppTab";
import AppFormInput from "../../../components/form/AppFormInput";
import AppAddressForm from "../../../components/form/AppAddressForm";
import AppGenderSelect from "../../../components/select/AppGenderSelects";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { TabItem } from "../../../components/tab/properties/TabProps";
import * as AIIcons from "react-icons/ai";
import * as SIIcons from "react-icons/si";
import { Gender } from "../../../models/Gender";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Student } from "../../../models/Student";
import { EditorProps } from "../properties/EditorProps";
import AppBaseEditor from "../../../components/AppBaseEditor";
import AppFormSelect from "../../../components/form/AppFormSelect";

const StudentEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { t } = useAppLocalizer();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerStudent } = useSchoolOperations();

  const validationSchemaConfig = {
    firstNameNative: { label: t("student.firstNameNative.label") },
    lastNameNative: { label: t("student.lastNameNative.label") },
    fatherNameNative: { label: t("student.fatherNameNative.label") },
    grandFatherNameNative: { label: t("student.grandFatherNameNative.label") },
    firstNameEnglish: { label: t("student.firstNameEnglish.label") },
    lastNameEnglish: { label: t("student.lastNameEnglish.label") },
    fatherNameEnglish: { label: t("student.fatherNameEnglish.label") },
    grandFatherNameEnglish: {
      label: t("student.grandFatherNameEnglish.label"),
    },
    asasNumber: { label: t("student.asasNumber.label") },
    gender: { label: t("gender.label") },
    dateOfBirth: { label: t("student.dateOfBirth.label") },
    primaryAddress: {
      label: t("addressForm.label"),
      nested: {
        street: { label: t("addressForm.street.label") },
        region: { label: t("addressForm.region.label") },
        village: { label: t("addressForm.village.label") },
      },
    },
    secondaryAddress: {
      label: t("addressForm.label"),
      nested: {
        street: { label: t("addressForm.street.label") },
        region: { label: t("addressForm.region.label") },
        village: { label: t("addressForm.village.label") },
      },
    },
  } as unknown as Record<
    keyof Student,
    { label: string; nested?: Record<string, any> }
  >;

  const initialFormData = {
    firstNameNative: "",
    lastNameNative: "",
    fatherNameNative: "",
    grandFatherNameNative: "",
    firstNameEnglish: "",
    lastNameEnglish: "",
    fatherNameEnglish: "",
    grandFatherNameEnglish: "",
    asasNumber: "",
    calendarYearId: "",
    joiningClassId: "",
    primaryAddress: { street: "", region: "", village: "" },
    secondaryAddress: { street: "", region: "", village: "" },
    gender: Gender.EMPTY,
    dateOfBirth: "",
    email: "",
  } as unknown as Student;

  const handleSubmit = useCallback(
    async (formData: any) => {
      try {
        if (id) {
          // Update existing student
          // await updateStudent(id, formData);
        } else {
          // Register a new student
          await registerStudent(formData);
        }
        navigate("/student-list");
      } catch (error) {
        console.error("Error saving student:", error);
      }
    },
    [id, registerStudent, navigate]
  );

  const profileTabContent = (
    <AppBaseEditor<Student>
      validationSchemaConfig={validationSchemaConfig}
      initialData={initialData}
      initialFormData={initialFormData}
      title={(data) => ""}
      onSubmit={handleSubmit}
    >
      {(props) => (
        <>
          <div className="row">
            <div className="col-md-3">
              <AppFormInput
                name="firstNameNative"
                required
                label={t("student.firstNameNative.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="lastNameNative"
                required
                label={t("student.lastNameNative.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="fatherNameNative"
                required
                label={t("student.fatherNameNative.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="grandFatherNameNative"
                required
                label={t("student.grandFatherNameNative.label")}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <AppFormInput
                name="firstNameEnglish"
                required
                label={t("student.firstNameEnglish.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="lastNameEnglish"
                required
                label={t("student.lastNameEnglish.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="fatherNameEnglish"
                required
                label={t("student.fatherNameEnglish.label")}
              />
            </div>
            <div className="col-md-3">
              <AppFormInput
                name="grandFatherNameEnglish"
                required
                label={t("student.grandFatherNameEnglish.label")}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* <AppFormSelect
            name="calendarYearId"
            label={t("student.calendarYear.label")}
            options={[]} // Options from API
          /> */}
            </div>
            <div className="col-md-6">
              {/* <AppFormSelect
            name="joiningClassId"
            label={t("student.joiningClass.label")}
            options={[]} // Options from API
          /> */}
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <AppFormInput
                name="asasNumber"
                required
                label={t("student.asasNumber.label")}
              />
            </div>
            <div className="col-md-4">
              <AppFormSelect
                name="gender"
                label=""
                value={id ? props.formData!.gender.toString() : Gender.EMPTY}
              >
                <AppGenderSelect
                  name="gender"
                  value={id ? props.formData!.gender.toString() : Gender.EMPTY}
                  onChange={() => {}}
                />
              </AppFormSelect>
            </div>
            <div className="col-md-4">
              <AppFormInput
                name="dateOfBirth"
                type="date"
                label={t("student.dateOfBirth.label")}
              />
            </div>
          </div>
          <AppAddressForm prefix="primaryAddress" />
          <AppAddressForm
            prefix="secondaryAddress"
            title={t("addressForm.secondaryAddressTitle")}
          />
        </>
      )}
    </AppBaseEditor>
  );

  const tabData: TabItem[] = [
    {
      id: "profile",
      title: t("student.studentEditor.tabs.profile.label"),
      content: profileTabContent,
      icon: <AIIcons.AiOutlineProfile className="stroke-icon" />,
    },
  ];

  return (
    <AppCard title={t("student.studentEditor.label")}>
      <AppTab tabs={tabData} defaultActiveTab="profile" />
    </AppCard>
  );
};

export default StudentEditor;
