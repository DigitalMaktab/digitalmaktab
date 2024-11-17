import React from "react";
import { useTable, Column } from "react-table";
import styled from "styled-components";

// Define a flattened data structure for days and hours
interface FlattenedScheduleData {
  day: string;
  hour1: string;
  hour2: string;
  hour3: string;
  hour4: string;
  hour5: string;
  hour6: string;
  hour7: string;
  hour8: string;
}

// Styled components
const Table = styled.table``;

const Th = styled.th``;

const Td = styled.td``;

// Diagonal Cell with line from top-right to bottom-left
const DiagonalCell = styled(Th)`
  width: 100px;
  height: 40px;
  position: relative;
  overflow: hidden;

  /* Diagonal line across the cell */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-top: 1px solid #ddd;
    transform: rotate(-22deg);
    transform-origin: top left;
  }
`;

// Labels in DiagonalCell
const Label1 = styled.span`
  position: absolute;
  top: 5px;
  left: 10px;
  font-size: 12px;
`;

const Label2 = styled.span`
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 12px;
`;

const ScheduleTable: React.FC = () => {
  const data: FlattenedScheduleData[] = [
    {
      day: "Monday",
      hour1: "Math",
      hour2: "Science",
      hour3: "History",
      hour4: "Art",
      hour5: "PE",
      hour6: "Music",
      hour7: "Geography",
      hour8: "Computer Science",
    },
    {
      day: "Tuesday",
      hour1: "Math",
      hour2: "Science",
      hour3: "History",
      hour4: "Art",
      hour5: "PE",
      hour6: "Music",
      hour7: "Geography",
      hour8: "Computer Science",
    },
    {
      day: "Wednesday",
      hour1: "Math",
      hour2: "Science",
      hour3: "History",
      hour4: "Art",
      hour5: "PE",
      hour6: "Music",
      hour7: "Geography",
      hour8: "Computer Science",
    },
    {
      day: "Thursday",
      hour1: "Math",
      hour2: "Science",
      hour3: "History",
      hour4: "Art",
      hour5: "PE",
      hour6: "Music",
      hour7: "Geography",
      hour8: "Computer Science",
    },
    {
      day: "Friday",
      hour1: "Math",
      hour2: "Science",
      hour3: "History",
      hour4: "Art",
      hour5: "PE",
      hour6: "Music",
      hour7: "Geography",
      hour8: "Computer Science",
    },
  ];

  const columns: Column<FlattenedScheduleData>[] = React.useMemo(
    () => [
      {
        Header: () => (
          <DiagonalCell>
            <Label1>Hours</Label1>
            <Label2>Days</Label2>
          </DiagonalCell>
        ),
        accessor: "day",
      },
      {
        Header: "Hour 1",
        accessor: "hour1",
      },
      {
        Header: "Hour 2",
        accessor: "hour2",
      },
      {
        Header: "Hour 3",
        accessor: "hour3",
      },
      {
        Header: "Hour 4",
        accessor: "hour4",
      },
      {
        Header: "Hour 5",
        accessor: "hour5",
      },
      {
        Header: "Hour 6",
        accessor: "hour6",
      },
      {
        Header: "Hour 7",
        accessor: "hour7",
      },
      {
        Header: "Hour 8",
        accessor: "hour8",
      },
    ],
    []
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
    });

  return (
    <div className="table-responsive">
      <Table {...getTableProps()} className="table">
        <thead className="table-dark">
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <Th {...column.getHeaderProps()}>{column.render("Header")}</Th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <Td {...cell.getCellProps()}>{cell.render("Cell")}</Td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default ScheduleTable;
