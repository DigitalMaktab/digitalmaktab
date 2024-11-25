import React, { useCallback, useEffect, useMemo, useState } from "react";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { ScheduleData } from "../../../models/ScheduleData";

const ScheduleList = () => {
  const { t } = useAppLocalizer();
  const { scheduleList, data, totalPages } = useSchoolOperations();

  const columns: Column<ScheduleData>[] = useMemo(
    () => [
      {
        header: "timetable.dayOfWeek.label",
        accessor: "day",
        filter: { type: "dropdown" },
      },
      {
        header: "timetable.hour1.label",
        accessor: "hour1",
      },
      {
        header: "timetable.hour2.label",
        accessor: "hour2",
      },
      {
        header: "timetable.hour3.label",
        accessor: "hour3",
      },
      {
        header: "timetable.hour4.label",
        accessor: "hour4",
      },
      {
        header: "timetable.hour5.label",
        accessor: "hour5",
      },
      {
        header: "timetable.hour6.label",
        accessor: "hour6",
      },
      {
        header: "timetable.hour7.label",
        accessor: "hour7",
      },
      {
        header: "timetable.hour8.label",
        accessor: "hour8",
      },
    ],
    []
  );

  return (
    <AppCard title={t("timetable.label")}>
      <AppTable
        rowLink="/schedule-editor/{id}"
        data={data as ScheduleData[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={scheduleList}
        showPagination={false}
        showPageSizer={false}
        actions={[
          {
            label: t("timetable.addTimeTable.label"),
            route: "/schedule-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default ScheduleList;
