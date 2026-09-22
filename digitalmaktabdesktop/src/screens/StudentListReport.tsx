import React, { useState, useMemo, useRef } from "react";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import { getMockClasses, getMockClassStudents } from "../api/mockData";
import { EnrollmentDto } from "../api/school";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface Props {
  onBack: () => void;
}

const HEADERS = [
  "#", "Asas #", "Name (Native)", "Father Name", "G.Father Name",
  "Name (English)", "Gender", "DOB", "Blood Group", "Mother Tongue", "Orphan",
];

function enrollmentToRow(e: EnrollmentDto, idx: number): any[] {
  const s = e.student;
  return [
    idx + 1,
    s.asasNumber,
    `${s.firstNameNative} ${s.lastNameNative}`,
    s.fatherNameNative,
    s.grandFatherNameNative,
    `${s.firstNameEnglish} ${s.lastNameEnglish}`,
    s.genderValue,
    s.dateOfBirth,
    s.bloodGroupValue,
    s.motherTongue,
    s.isOrphanValue,
  ];
}

function buildSheetData(enrollments: EnrollmentDto[]) {
  const celldata: any[] = [];

  // Header row (row 0)
  HEADERS.forEach((h, c) => {
    celldata.push({
      r: 0,
      c,
      v: {
        v: h,
        m: h,
        ct: { fa: "General", t: "g" },
        bl: 1,                          // bold
        fc: "#ffffff",                   // font color
        bg: "#217346",                   // background
      },
    });
  });

  // Data rows
  enrollments.forEach((e, ri) => {
    const row = enrollmentToRow(e, ri);
    row.forEach((val, ci) => {
      celldata.push({
        r: ri + 1,
        c: ci,
        v: {
          v: val,
          m: String(val),
          ct: { fa: "General", t: typeof val === "number" ? "n" : "g" },
        },
      });
    });
  });

  return celldata;
}

export default function StudentListReport({ onBack }: Props) {
  const classes = useMemo(() => getMockClasses(), []);
  const [selectedClassId, setSelectedClassId] = useState("");
  const enrollments = useMemo(
    () => (selectedClassId ? getMockClassStudents(selectedClassId) : []),
    [selectedClassId]
  );
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sheetRef = useRef<any>(null);

  const sheetData = useMemo(() => {
    if (!enrollments.length) return null;
    return [
      {
        name: "Student List",
        celldata: buildSheetData(enrollments),
        row: enrollments.length + 10,   // extra empty rows for editing
        column: HEADERS.length + 5,     // extra empty columns
        config: {
          columnlen: Object.fromEntries(
            HEADERS.map((_, i) => [i, i === 0 ? 40 : 130])
          ),
          rowlen: { 0: 30 },
        },
      },
    ];
  }, [enrollments]);

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Student List");

    // Title row
    ws.mergeCells(1, 1, 1, HEADERS.length);
    const titleCell = ws.getCell("A1");
    titleCell.value = `Student List — ${selectedClass?.classNameValue || ""}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    // Headers
    const headerRow = ws.addRow(HEADERS);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF217346" } };
      cell.border = { bottom: { style: "thin" } };
      cell.alignment = { horizontal: "center" };
    });

    // Data rows
    enrollments.forEach((e, i) => {
      ws.addRow(enrollmentToRow(e, i));
    });

    ws.columns.forEach((col) => { col.width = 18; });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `students_${selectedClass?.classNameValue || "report"}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <div style={styles.container}>
      <div style={styles.toolbar} className="no-print">
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={styles.select}
        >
          <option value="">-- Select Class --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.classNameValue} ({c.shiftValue})
            </option>
          ))}
        </select>
        {enrollments.length > 0 && (
          <>
            <button onClick={exportToExcel} style={styles.exportBtn}>Export .xlsx</button>
            <button onClick={handlePrint} style={styles.printBtn}>Print</button>
          </>
        )}
        {selectedClassId && (
          <span style={styles.count}>{enrollments.length} students</span>
        )}
      </div>

      {selectedClass && (
        <div style={styles.sheetTitle}>
          Student List — {selectedClass.classNameValue} | {selectedClass.shiftValue} | {selectedClass.branch?.branchNameValue} | Teacher: {selectedClass.teacher?.firstNameNative} {selectedClass.teacher?.lastNameNative}
        </div>
      )}

      {sheetData ? (
        <div style={styles.sheetWrapper}>
          <Workbook ref={sheetRef} data={sheetData} onChange={() => {}} />
        </div>
      ) : (
        <div style={styles.placeholder}>Select a class to view the student list</div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { height: "100vh", display: "flex", flexDirection: "column", background: "#f0f2f5" },
  toolbar: {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
    background: "#fff", borderBottom: "1px solid #ddd",
  },
  backBtn: {
    padding: "6px 14px", background: "none", border: "1px solid #ccc",
    borderRadius: 4, cursor: "pointer", fontSize: 13,
  },
  select: {
    padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4,
    fontSize: 13, minWidth: 200,
  },
  exportBtn: {
    padding: "6px 14px", background: "#217346", color: "#fff",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13,
  },
  printBtn: {
    padding: "6px 14px", background: "#1a73e8", color: "#fff",
    border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13,
  },
  count: { fontSize: 13, color: "#666", marginLeft: "auto" },
  sheetTitle: {
    padding: "8px 16px", fontSize: 13, color: "#444",
    background: "#e8f0fe", borderBottom: "1px solid #c8d8ea",
  },
  sheetWrapper: { flex: 1, overflow: "hidden" },
  placeholder: {
    flex: 1, display: "flex", justifyContent: "center",
    alignItems: "center", color: "#999", fontSize: 15,
  },
};
