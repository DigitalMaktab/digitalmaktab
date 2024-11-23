import React from "react";
import { jsPDF } from "jspdf";

const AppPDFGenerator: React.FC = () => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Set PDF Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PDF Title Example", 105, 20, { align: "center" });

    // Add content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("This is an example paragraph for your PDF content.", 10, 40);

    // Add more pages or custom content if needed
    doc.addPage();
    doc.text("Page 2 content starts here.", 10, 10);

    // Save the PDF
    doc.save("example.pdf");
  };

  return (
    <div>
      <h1>PDF Generator</h1>
      <p>Click the button below to generate a PDF file.</p>
      <button onClick={generatePDF}>Download PDF</button>
    </div>
  );
};

export default AppPDFGenerator;
