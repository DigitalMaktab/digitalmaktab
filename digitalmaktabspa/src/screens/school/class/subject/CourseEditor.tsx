import React, { useCallback } from "react";
import { EditorProps } from "../../properties/EditorProps";
import { useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { Course } from "../../../../models/Course";
import { ResponseResult } from "../../../../dtos/ResultEnum";
import AppBaseEditor from "../../../../components/AppBaseEditor";
import AppFormSelect from "../../../../components/form/AppFormSelect";
import AppSubjectSelect from "../../../../components/select/AppSubjectSelect";
import AppClassSelect from "../../../../components/select/AppClassSelect";
import AppTeacherSelect from "../../../../components/select/AppTeacherSelect";
import { TabItem } from "../../../../components/tab/properties/TabProps";
import * as SIIcons from "react-icons/si";
import * as MDIcons from "react-icons/md";
import * as RIIcons from "react-icons/ri";
import AppCard from "../../../../components/card/AppCard";
import { useFormData } from "../../../../hooks/useFormData";
import AppTab from "../../../../components/tab/AppTab";
import CourseMaterial from "./CourseMaterial";
import { UserRole } from "../../../../models/UserRole";
import ZoomMeeting from "../../../../components/zoom/onlineClass/AppZoomClass";

const CourseEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addCourse } = useSchoolOperations();

  const initialFormData = {
    classId: "",
    subjectId: "",
    teacherId: "",
  } as Course;

  const validationSchemaConfig = {
    classId: { label: t("subject.subjectName.label") },
    subjectId: { label: t("class.className.label") },
    teacherId: { label: t("teacher.firstName.label") },
  } as Record<keyof Course, { label: string }>;

  const [formData] = useFormData<Course>(initialData, initialFormData);

  const submitData = useCallback(
    async (course: Course) => {
      let result;
      if (id) {
        // TODO: Update the Subject
        result = {};
        return;
      }

      result = await addCourse(course);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/course-list");
      }
    },
    [id, navigate, addCourse]
  );

  const courseTabContent = (
    <AppBaseEditor<Course>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) =>
        data.subject && data.class
          ? `${data.subject.subjectName}`
          : t("course.add.label")
      }
    >
      {(props) => (
        <div className="row">
          <div className="col-md-4">
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
          <div className="col-md-4">
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
          <div className="col-md-4">
            <AppFormSelect
              required={true}
              name="teacherId"
              label=""
              value={id ? props.formData!.subjectId.toString() : ""}
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
  );

  const assignmentsTabContent = <div>Assignments</div>;
  const quizzesTabContent = <div>Quizzes</div>;
  const onlineClassTabContent = (
    <div>
      <ZoomMeeting />
    </div>
  );

  const courseMaterialTabContent = <CourseMaterial id={id} />;

  const tabData: TabItem[] = [
    {
      id: "course",
      title: t("course.courseEditor.tabs.course.label"),
      content: courseTabContent,
      icon: <SIIcons.SiGoogleclassroom className="stroke-icon" />,
      roles: [UserRole.ADMIN],
    },
    {
      id: "courseMaterial",
      title: t("course.courseEditor.tabs.courseMaterial.label"),
      content: courseMaterialTabContent,
      icon: <SIIcons.SiFuturelearn className="stroke-icon" />,
    },
    {
      id: "assignments",
      title: t("course.courseEditor.tabs.assignments.label"),
      content: assignmentsTabContent,
      icon: <MDIcons.MdOutlineAssignment className="stroke-icon" />,
    },
    {
      id: "quizzes",
      title: t("course.courseEditor.tabs.quizzes.label"),
      content: quizzesTabContent,
      icon: <MDIcons.MdOutlineQuiz className="stroke-icon" />,
    },
    {
      id: "onlineClass",
      title: t("course.courseEditor.tabs.onlineClass.label"),
      content: onlineClassTabContent,
      icon: <RIIcons.RiVidiconLine className="stroke-icon" />,
    },
  ];

  return (
    <AppCard
      title={
        formData?.class?.classNameValue && formData.class?.branch?.branchName
          ? `${formData.class?.classNameValue} ${formData.class?.branch?.branchName}`
          : t("course.courseEditor.label")
      }
    >
      <AppTab tabs={tabData} defaultActiveTab="course" />
    </AppCard>
  );
};

export default CourseEditor;
