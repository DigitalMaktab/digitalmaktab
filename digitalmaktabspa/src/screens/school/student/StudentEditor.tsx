import React, { useMemo, useCallback, useState } from "react";
import AppCard from "../../../components/card/AppCard";
import AppTab from "../../../components/tab/AppTab";
import AppFormCard from "../../../components/card/AppFormCard";
import AppFormInput from "../../../components/form/AppFormInput";
import AppAddressForm from "../../../components/form/AppAddressForm";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppGenderSelect from "../../../components/select/AppGenderSelects";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { TabItem } from "../../../components/tab/properties/TabProps";
import * as AIIcons from "react-icons/ai";
import * as SIIcons from "react-icons/si";
import * as Yup from "yup";
import { Gender } from "../../../models/Gender";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Student } from "../../../models/Student";
import { EditorProps } from "../properties/EditorProps";

const getStudentValidationSchema = (t: any) =>
  Yup.object().shape({
    firstNameNative: Yup.string().required(
      t("validation.required", { value: t("student.firstNameNative.label") })
    ),
    lastNameNative: Yup.string().required(
      t("validation.required", { value: t("student.lastNameNative.label") })
    ),
    fatherNameNative: Yup.string().required(
      t("validation.required", { value: t("student.fatherNameNative.label") })
    ),
    grandFatherNameNative: Yup.string().required(
      t("validation.required", {
        value: t("student.grandFatherNameNative.label"),
      })
    ),
    firstNameEnglish: Yup.string().required(
      t("validation.required", { value: t("student.firstNameEnglish.label") })
    ),
    lastNameEnglish: Yup.string().required(
      t("validation.required", { value: t("student.lastNameEnglish.label") })
    ),
    asasNumber: Yup.number().required(
      t("validation.required", { value: t("student.asasNumber.label") })
    ),
    calendarYearId: Yup.string()
      .required(
        t("validation.required", { value: t("student.calendarYear.label") })
      )
      .uuid(t("validation.invalidUuid")),
    joiningClassId: Yup.string()
      .required(
        t("validation.required", { value: t("student.joiningClass.label") })
      )
      .uuid(t("validation.invalidUuid")),
    primaryAddress: Yup.object().required(
      t("validation.required", { value: t("address.primary.label") })
    ),
    secondaryAddress: Yup.object().required(
      t("validation.required", { value: t("address.secondary.label") })
    ),
    gender: Yup.string().required(
      t("validation.required", { value: t("gender.label") })
    ),
    dateOfBirth: Yup.date().required(
      t("validation.required", { value: t("student.dateOfBirth.label") })
    ),
    email: Yup.string()
      .email(t("validation.invalidEmail"))
      .required(t("validation.required", { value: t("auth.email.label") })),
  });

const StudentEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { t } = useAppLocalizer();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerStudent } = useSchoolOperations();

  const initialFormData = useMemo(
    () => ({
      firstNameNative: "",
      lastNameNative: "",
      fatherNameNative: "",
      grandFatherNameNative: "",
      firstNameEnglish: "",
      lastNameEnglish: "",
      asasNumber: "",
      calendarYearId: "",
      joiningClassId: "",
      primaryAddress: { street: "", region: "", village: "" },
      secondaryAddress: { street: "", region: "", village: "" },
      gender: Gender.EMPTY,
      dateOfBirth: "",
      email: "",
    }),
    []
  );

  const [formData] = useState<Student>(
    (initialData as Student) || location.state?.initialData || initialFormData
  );

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
    <AppFormCard
      validationSchema={getStudentValidationSchema(t)}
      initialValues={formData}
      onSubmit={handleSubmit}
    >
      <div className="row">
        <div className="col-md-4">
          <AppFormInput
            name="firstNameNative"
            label={t("student.firstNameNative.label")}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="lastNameNative"
            label={t("student.lastNameNative.label")}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="fatherNameNative"
            label={t("student.fatherNameNative.label")}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <AppFormInput
            name="firstNameEnglish"
            label={t("student.firstNameEnglish.label")}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="lastNameEnglish"
            label={t("student.lastNameEnglish.label")}
          />
        </div>
        <div className="col-md-4">
          <AppFormInput
            name="asasNumber"
            label={t("student.asasNumber.label")}
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
        <div className="col-md-6">
          <AppGenderSelect
            name="gender"
            value={formData?.gender?.toString() || ""}
            onChange={() => {}}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            name="dateOfBirth"
            type="date"
            label={t("student.dateOfBirth.label")}
          />
        </div>
      </div>
      <AppAddressForm prefix="primaryAddress" />
      <AppAddressForm prefix="secondaryAddress" />
    </AppFormCard>
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
