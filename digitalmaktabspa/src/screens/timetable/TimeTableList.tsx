import React, { useMemo } from "react";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import {
  Column,
  RoleSpecificTableProps,
} from "../../components/table/properties/TableProps";
import AppCard from "../../components/card/AppCard";
import AppTable from "../../components/table/AppTable";
import { Action } from "../../components/table/properties/TableActionPrps";
import { ScheduleData } from "../../models/ScheduleData";
import { useTableColumns } from "../../hooks/useTableColumns";
import { useTableActions } from "../../hooks/useTableActions";

const TimeTableList: React.FC<RoleSpecificTableProps<ScheduleData>> = ({
  titleKey,
  fetchData,
  data,
  totalPages,
  addRoute,
  rowLinkTemplate,
  columns: additionalColumns = [],
  actions: providedActions,
}) => {
  const { t } = useAppLocalizer();

  const defaultColumns: Column<ScheduleData>[] = [
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
  ];

  const mergedColumns = useTableColumns(defaultColumns, additionalColumns);

  const defaultActions: Action[] = useMemo(
    () => [
      {
        label: t("timetable.addTimeTable.label"),
        route: addRoute,
        icon: "plus",
      },
    ],
    [t, addRoute]
  );

  const tableActions = useTableActions(defaultActions, providedActions);

  return (
    <AppCard title={t(titleKey)}>
      <AppTable
        rowLink={rowLinkTemplate}
        data={data}
        columns={mergedColumns}
        totalPages={totalPages}
        fetchPageData={fetchData}
        reportTitle={t(titleKey)}
        actions={tableActions}
      />
    </AppCard>
  );
};

export default TimeTableList;
