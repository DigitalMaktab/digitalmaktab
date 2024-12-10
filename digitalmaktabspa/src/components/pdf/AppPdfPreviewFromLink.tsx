import React, { useEffect } from "react";

interface PDFIframePreviewProps {
  pdfUrl: string;
}

const PDFIframePreview: React.FC<PDFIframePreviewProps> = ({ pdfUrl }) => {
  // Detect if the device is mobile
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (isMobile) {
      // Open in a new tab and prevent rendering the iframe
      window.location.href = pdfUrl;
    }
  }, [isMobile, pdfUrl]);

  if (isMobile) {
    return null; // Prevent rendering the iframe
  }

  return (
    <iframe
      src={pdfUrl}
      title="PDF Preview"
      width="100%"
      height="100%"
      style={{ border: "none" }}
    />
  );
};

export default PDFIframePreview;
