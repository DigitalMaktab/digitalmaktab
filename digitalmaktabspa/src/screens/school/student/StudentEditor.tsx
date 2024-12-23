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
import { Gender } from "../../../models/Gender";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Student } from "../../../models/Student";
import { EditorProps } from "../properties/EditorProps";
import AppBaseEditor from "../../../components/AppBaseEditor";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppNationalIdForm from "../../../components/form/AppNationalIdForm";
import AppFormSectionContainer from "../../../components/form/AppFormSectionContainer";
import { BloodGroup } from "../../../models/BloodGroup";
import AppBloodGroupSelect from "../../../components/select/AppBloodGroupSelect";
import { DisabilityType } from "../../../models/DisabilityType";
import AppDisabilityTypeSelect from "../../../components/select/AppDisabilityTypeSelect";
import { IsOrphan } from "../../../models/IsOrphan";
import AppIsOrphanSelect from "../../../components/select/AppIsOrphanSelect";
import AppLanguageSelect from "../../../components/select/AppLanguageSelect";
import { Language } from "../../../models/Language";
import AppClassSelect from "../../../components/select/AppClassSelect";
import useUser from "../../../hooks/useUser";
import { SchoolType } from "../../../models/SchoolType";
import { cond } from "lodash";

const StudentEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { t } = useAppLocalizer();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerStudent } = useSchoolOperations();
  const user = useUser();

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
    disabilityType: { label: t("disabilityType.label") },
    isOrphan: { label: t("isOrphan.label") },
    motherTongue: { label: t("language.label") },
    email: { label: t("auth.email.label") },
    monthlyFee: {
      label: t("student.monthlyFee.label"),
      condition: () => user?.school?.schoolType === SchoolType.PRIVATE, // Conditional validation based on 'schoolType'
    },
  } as unknown as Record<
    keyof Student,
    {
      label: string;
      nested?: Record<string, any>;
      condition?: boolean | ((values: Record<string, any>) => boolean);
    }
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
    gender: Gender.EMPTY,
    dateOfBirth: "",
    joiningClassId: "",
    primaryAddress: { street: "", region: "", village: "" },
    secondaryAddress: { street: "", region: "", village: "" },
    nationalId: {
      electronicNationalIdNumber: "",
      nationalIdNumber: "",
      volume: "",
      page: "",
      registerNumber: "",
    },
    brotherName: "",
    fUncleName: "",
    fCousinName: "",
    mUncleName: "",
    mCousinName: "",
    phoneNumber: { countryId: "", number: "" },
    bloodGroup: BloodGroup.EMPTY,
    disabilityType: DisabilityType.EMPTY,
    isOrphan: IsOrphan.EMPTY,
    motherTongue: Language.EMPTY,
    email: "",
    monthlyFee: null,
  } as unknown as Student;

  const handleSubmit = useCallback(
    async (student: Student) => {
      try {
        if (id) {
          // Update existing student
          // await updateStudent(id, student);
        } else {
          // Register a new student
          await registerStudent(student);
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
          <AppFormSectionContainer title={t("student.title")}>
            <div className="row">
              <div className="col-md-3">
                <AppFormInput
                  name="firstNameNative"
                  required
                  label={t("student.firstNameNative.label")}
                  placeholder={t("student.firstNameNative.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="lastNameNative"
                  required
                  label={t("student.lastNameNative.label")}
                  placeholder={t("student.lastNameNative.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="fatherNameNative"
                  required
                  label={t("student.fatherNameNative.label")}
                  placeholder={t("student.fatherNameNative.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="grandFatherNameNative"
                  required
                  label={t("student.grandFatherNameNative.label")}
                  placeholder={t("student.grandFatherNameNative.label")}
                />
              </div>
            </div>
            <div className="row">
              <div className="col-md-3">
                <AppFormInput
                  name="firstNameEnglish"
                  required
                  label={t("student.firstNameEnglish.label")}
                  placeholder={t("student.firstNameEnglish.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="lastNameEnglish"
                  required
                  label={t("student.lastNameEnglish.label")}
                  placeholder={t("student.lastNameEnglish.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="fatherNameEnglish"
                  required
                  label={t("student.fatherNameEnglish.label")}
                  placeholder={t("student.fatherNameEnglish.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="grandFatherNameEnglish"
                  required
                  label={t("student.grandFatherNameEnglish.label")}
                  placeholder={t("student.grandFatherNameEnglish.label")}
                />
              </div>
            </div>
            <div className="row">
              <div className="col-md-3">
                <AppFormInput
                  name="asasNumber"
                  required
                  label={t("student.asasNumber.label")}
                  placeholder={t("student.asasNumber.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormSelect
                  name="gender"
                  label=""
                  value={id ? props.formData!.gender.toString() : Gender.EMPTY}
                  required
                >
                  <AppGenderSelect
                    name="gender"
                    value={
                      id ? props.formData!.gender.toString() : Gender.EMPTY
                    }
                    onChange={() => {}}
                    required
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-3">
                <AppFormInput
                  name="dateOfBirth"
                  type="date"
                  value={props.formData.dateOfBirth}
                  label={t("student.dateOfBirth.label")}
                  placeholder={t("student.dateOfBirth.label")}
                />
              </div>
              <div className="col-md-3">
                <AppFormInput
                  label={t("auth.signup.phoneNumber.label")}
                  name="phoneNumber.number"
                  placeholder={t("auth.signup.phoneNumber.placeholder")}
                  type="phoneNumber"
                />
              </div>
            </div>
          </AppFormSectionContainer>
          <div className="row">
            <div className="col-md-6">
              <AppAddressForm prefix="primaryAddress" />
            </div>
            <div className="col-md-6">
              <AppAddressForm
                prefix="secondaryAddress"
                title={t("addressForm.secondaryAddressTitle")}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <AppNationalIdForm />
            </div>
            <div className="col-md-6">
              <AppFormSectionContainer title={t("student.relatives.label")}>
                <div className="row">
                  <div className="col-md-12">
                    <AppFormInput
                      name="brotherName"
                      label={t("student.brotherName.label")}
                      placeholder={t("student.brotherName.label")}
                    />
                  </div>
                  <div className="col-md-6">
                    <AppFormInput
                      name="fUncleName"
                      label={t("student.fUncleName.label")}
                      placeholder={t("student.fUncleName.label")}
                    />
                  </div>
                  <div className="col-md-6">
                    <AppFormInput
                      name="fCousinName"
                      label={t("student.fCousinName.label")}
                      placeholder={t("student.fCousinName.label")}
                    />
                  </div>
                  <div className="col-md-6">
                    <AppFormInput
                      name="mUncleName"
                      label={t("student.mUncleName.label")}
                      placeholder={t("student.mUncleName.label")}
                    />
                  </div>
                  <div className="col-md-6">
                    <AppFormInput
                      name="mCousinName"
                      label={t("student.mCousinName.label")}
                      placeholder={t("student.mCousinName.label")}
                    />
                  </div>
                </div>
              </AppFormSectionContainer>
            </div>
          </div>
          <AppFormSectionContainer title={t("student.extraDetails.label")}>
            <div className="row">
              <div className="col-md-3">
                <AppFormSelect
                  name="disabilityType"
                  label=""
                  value={
                    id
                      ? props.formData!.disabilityType?.toString() ||
                        DisabilityType.EMPTY
                      : DisabilityType.EMPTY
                  }
                >
                  <AppDisabilityTypeSelect
                    name="disabilityType"
                    value={
                      id
                        ? props.formData!.disabilityType?.toString() ||
                          DisabilityType.EMPTY
                        : DisabilityType.EMPTY
                    }
                    onChange={() => {}}
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-3">
                <AppFormSelect
                  name="isOrphan"
                  label=""
                  value={
                    id
                      ? props.formData!.isOrphan?.toString() || IsOrphan.EMPTY
                      : IsOrphan.EMPTY
                  }
                >
                  <AppIsOrphanSelect
                    name="isOrphan"
                    value={
                      id
                        ? props.formData!.isOrphan?.toString() || IsOrphan.EMPTY
                        : IsOrphan.EMPTY
                    }
                    onChange={() => {}}
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-3">
                <AppFormSelect
                  name="motherTongue"
                  label=""
                  value={
                    id
                      ? props.formData!.motherTongue?.toString() ||
                        IsOrphan.EMPTY
                      : IsOrphan.EMPTY
                  }
                >
                  <AppLanguageSelect
                    name="motherTongue"
                    value={
                      id
                        ? props.formData!.motherTongue?.toString() ||
                          IsOrphan.EMPTY
                        : IsOrphan.EMPTY
                    }
                    onChange={() => {}}
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-3">
                <AppFormSelect
                  name="bloodGroup"
                  label=""
                  value={
                    id
                      ? props.formData!.bloodGroup?.toString() ||
                        BloodGroup.EMPTY
                      : BloodGroup.EMPTY
                  }
                  required
                >
                  <AppBloodGroupSelect
                    name="bloodGroup"
                    value={
                      id
                        ? props.formData!.bloodGroup?.toString() ||
                          BloodGroup.EMPTY
                        : BloodGroup.EMPTY
                    }
                    onChange={() => {}}
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-4">
                <AppFormSelect
                  name="joiningClassId"
                  label=""
                  value={id ? props.formData!.joiningClassId.toString() : ""}
                  required
                >
                  <AppClassSelect
                    name="joiningClassId"
                    value={id ? props.formData!.joiningClassId.toString() : ""}
                    onChange={() => {}}
                  />
                </AppFormSelect>
              </div>
              <div className="col-md-4">
                <AppFormInput
                  name="email"
                  required
                  label={t("auth.email.label")}
                  placeholder={t("auth.email.placeholder")}
                />
              </div>
              {user?.school?.schoolType === SchoolType.PRIVATE && (
                <div className="col-md-4">
                  <AppFormInput
                    name="monthlyFee"
                    type="number"
                    required={true}
                    label={t("student.monthlyFee.label")}
                    placeholder={t("student.monthlyFee.label")}
                  />
                </div>
              )}
            </div>
          </AppFormSectionContainer>
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
