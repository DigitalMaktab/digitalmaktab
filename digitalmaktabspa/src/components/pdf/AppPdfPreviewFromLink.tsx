import React from "react";

interface PDFIframePreviewProps {
  pdfUrl: string;
}

const PDFIframePreview: React.FC<PDFIframePreviewProps> = ({ pdfUrl }) => {
  return (
    <iframe
      src={pdfUrl}
      title="PDF Preview"
      width="100%"
      height="500px"
      style={{ border: "none" }}
    />
  );
};

export default PDFIframePreview;
