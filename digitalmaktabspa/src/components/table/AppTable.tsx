import React, { ReactNode } from "react";
import { TableProps } from "./properties/TableProps";
import { useTranslation } from "react-i18next";

const AppTable = <T,>({ data, columns }: TableProps<T>): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="table-responsive">
      <table className="table">
        <thead className="table-dark">
          <tr>
            {columns.map((col, index) => (
              <th key={index} scope="col">
                {t(col.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                const cellContent = col.render
                  ? col.render(row[col.accessor], row)
                  : (row[col.accessor] as ReactNode); // Cast to ReactNode

                return <td key={colIndex}>{cellContent ?? ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AppTable;
