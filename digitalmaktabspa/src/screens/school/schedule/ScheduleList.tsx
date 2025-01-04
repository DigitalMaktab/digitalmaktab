import React from "react";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { ScheduleData } from "../../../models/ScheduleData";
import TimeTableList from "../../timetable/TimeTableList";

const ScheduleList = () => {
  const { scheduleList, data, totalPages } = useSchoolOperations();

  return (
    <TimeTableList
      titleKey="timetable.label"
      fetchData={scheduleList}
      data={data as ScheduleData[]}
      totalPages={totalPages}
      addRoute="/timetable-editor/new"
      rowLinkTemplate="/timetable-editor/{id}"
    />
  );
};

export default ScheduleList;
