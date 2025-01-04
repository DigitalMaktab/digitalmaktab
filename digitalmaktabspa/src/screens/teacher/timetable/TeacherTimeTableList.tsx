import React from "react";
import useTeacherOperations from "../../../hooks/useTeacherOperations";
import { ScheduleData } from "../../../models/ScheduleData";
import TimeTableList from "../../timetable/TimeTableList";

const TeacherTimeTableList = () => {
  const { timeTableList, data, totalPages } = useTeacherOperations();

  return (
    <TimeTableList
      titleKey="timetable.label"
      fetchData={timeTableList}
      data={data as ScheduleData[]}
      totalPages={totalPages}
      addRoute="/schedule-editor/new"
      rowLinkTemplate="/schedule-editor/{id}"
      actions={[]}
      columns={[
        {
          header: "timetable.dayOfWeek.label",
          accessor: "day",
        },
      ]}
    />
  );
};

export default TeacherTimeTableList;
