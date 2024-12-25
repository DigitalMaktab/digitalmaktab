import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditorProps } from "../properties/EditorProps";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Schedule } from "../../../models/Schedule";
import { ResponseResult } from "../../../dtos/ResultEnum";
import AppBaseEditor from "../../../components/AppBaseEditor";
import AppFormSelect from "../../../components/form/AppFormSelect";
import AppTeacherSelect from "../../../components/select/AppTeacherSelect";
import AppDayOfWeekSelect from "../../../components/select/AppDayOfWeekSelect";
import AppScheduleTimeSelect from "../../../components/select/AppScheduleTimeSelect";
import AppCourseSelect from "../../../components/select/AppCourseSelect";

const SubjectEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addSchedule } = useSchoolOperations();

  const initialFormData = {
    courseId: "",
    teacherId: "",
    dayOfWeek: 0,
    scheduleTime: 0,
  } as Schedule;

  const validationSchemaConfig = {
    courseId: { label: t("course.subjectAndClass.label") },
    teacherId: { label: t("teacher.firstName.label") },
    dayOfWeek: { label: t("dayOfWeek.label") },
    scheduleTime: { label: t("scheduleTime.label") },
  } as Record<keyof Schedule, { label: string }>;

  const submitData = useCallback(
    async (schedule: Schedule) => {
      let result;
      if (id) {
        // TODO: Update the Subject
        result = {};
        return;
      }

      result = await addSchedule(schedule);

      if (result.status === ResponseResult.SUCCESS) {
        navigate("/timetable");
      }
    },
    [id, navigate, addSchedule]
  );

  return (
    <AppBaseEditor<Schedule>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) =>
        data.course &&
        data.course.subject &&
        data.dayOfWeek &&
        data.scheduleTime
          ? `${data.course.subject.subjectName} ${data.dayOfWeek} ${data.scheduleTime}`
          : t("timetable.addTimeTable.label")
      }
    >
      {(props) => (
        <div className="row">
          <div className="col-md-6">
            <AppFormSelect
              required={true}
              name="courseId"
              label=""
              value={id ? props.formData!.courseId.toString() : ""}
            >
              <AppCourseSelect
                name="courseId"
                value={id ? props.formData!.courseId.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-6">
            <AppFormSelect
              required={true}
              name="teacherId"
              label=""
              value={id ? props.formData!.teacherId.toString() : ""}
            >
              <AppTeacherSelect
                name="subjectId"
                value={id ? props.formData!.teacherId.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-6">
            <AppFormSelect
              required={true}
              name="dayOfWeek"
              label=""
              value={id ? props.formData!.dayOfWeek.toString() : ""}
            >
              <AppDayOfWeekSelect
                name="dayOfWeek"
                value={id ? props.formData!.dayOfWeek.toString() : ""}
                onChange={() => {}}
              />
            </AppFormSelect>
          </div>
          <div className="col-md-6">
            <AppFormSelect
              required={true}
              name="scheduleTime"
              label=""
              value={id ? props.formData!.scheduleTime.toString() : ""}
            >
              <AppScheduleTimeSelect
                name="scheduleTime"
                value={id ? props.formData!.scheduleTime.toString() : ""}
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
