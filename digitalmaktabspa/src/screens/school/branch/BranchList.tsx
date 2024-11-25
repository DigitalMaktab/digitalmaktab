import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Branch } from "../../../models/Branch";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";

const BranchList = () => {
  const { t } = useTranslation();
  const { branchList, data, totalPages } = useSchoolOperations();

  const columns: Column<Branch>[] = useMemo(
    () => [
      {
        header: "branch.branchName.label",
        accessor: "branchName",
      },
    ],
    []
  );

  return (
    <AppCard title={t("branch.branchList.label")}>
      <AppTable
        rowLink="/branch-editor/{id}"
        data={data as Branch[]}
        columns={columns}
        fetchPageData={branchList}
        totalPages={totalPages}
        reportTitle={t("branch.branchList.label")}
        actions={[
          {
            label: t("branch.addBranch.label"),
            route: "/branch-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default BranchList;
