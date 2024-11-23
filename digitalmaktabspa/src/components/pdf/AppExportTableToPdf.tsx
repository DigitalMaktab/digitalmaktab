import jsPDF from "jspdf";
import "jspdf-autotable";
import React from "react";

const ExportTableToPDF: React.FC = () => {
  const generatePDF = () => {
    const doc = new jsPDF();
    const tableData = [
      ["Name", "Age", "City"],
      ["John Doe", "30", "New York"],
      ["Jane Smith", "25", "Los Angeles"],
    ];

    doc.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: "grid", // or 'striped', 'plain'
      styles: {
        fontSize: 10,
        halign: "center",
      },
    });

    doc.save("table.pdf");
  };

  return <button onClick={generatePDF}>Export to PDF</button>;
};

export default ExportTableToPDF;
