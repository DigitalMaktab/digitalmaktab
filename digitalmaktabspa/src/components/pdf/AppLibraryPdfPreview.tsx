import React from "react";
import AppPdfPreviewFromLink from "./AppPdfPreviewFromLink";
import AppModal from "../modal/AppModal";
interface AppLibraryPdfPreviewProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
}
const AppLibraryPdfPreview: React.FC<AppLibraryPdfPreviewProps> = ({
  isVisible,
  onClose,
  title,
  pdfUrl,
}) => {
  return (
    <AppModal
      isFullScreen
      isVisible={isVisible}
      onClose={onClose}
      modalHeader
      title={title}
      modalContent={<AppPdfPreviewFromLink pdfUrl={pdfUrl} />}
    />
  );
};

export default AppLibraryPdfPreview;
