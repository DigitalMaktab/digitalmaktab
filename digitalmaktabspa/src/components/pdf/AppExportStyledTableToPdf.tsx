import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React, { useRef } from "react";

const ExportStyledTableToPDF: React.FC = () => {
  const tableRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!tableRef.current) return;

    const canvas = await html2canvas(tableRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("styled-table.pdf");
  };

  return (
    <div>
      <div ref={tableRef}>
        <table style={{ border: "1px solid black", width: "100%" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>30</td>
              <td>New York</td>
            </tr>
            <tr>
              <td>Jane Smith</td>
              <td>25</td>
              <td>Los Angeles</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button onClick={generatePDF}>Export to PDF</button>
    </div>
  );
};

export default ExportStyledTableToPDF;
