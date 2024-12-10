import React, { useMemo } from "react";
import { Column } from "../../../components/table/properties/TableProps";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { CalendarYear } from "../../../models/CalendarYear";
import useRootOperations from "../../../hooks/useRootOperations";
import AppStatus from "../../../components/AppStatus";

const CalendarYearList = () => {
  const { t } = useAppLocalizer();
  const { calendarYearList, data, totalPages } = useRootOperations();

  const columns: Column<CalendarYear>[] = useMemo(
    () => [
      {
        header: "calendarYear.year.label",
        accessor: "year",
      },
      {
        header: "calendarYear.nativeYear.label",
        accessor: "nativeYear",
      },
      {
        header: "status.label",
        accessor: "status",
        render: (status: boolean) => <>{<AppStatus value={status} />}</>,
      },
    ],
    []
  );

  return (
    <AppCard title={t("calendarYear.list.label")}>
      <AppTable
        rowLink="/calendar-year-editor/{id}"
        data={data as CalendarYear[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={calendarYearList}
        reportTitle={t("calendarYear.list.label")}
        actions={[
          {
            label: t("calendarYear.add.label"),
            route: "/calendar-year-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default CalendarYearList;
