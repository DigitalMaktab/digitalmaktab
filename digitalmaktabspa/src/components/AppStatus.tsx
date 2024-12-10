import React from "react";
import { useTranslation } from "react-i18next";

import * as AIIcons from "react-icons/ai";

interface AppStatusComponentProps {
  value: boolean; // True for active, false for inactive
}

const AppStatus: React.FC<AppStatusComponentProps> = ({ value }) => {
  const { t } = useTranslation();

  return (
    <div
      className={`d-flex align-items-center ${
        value ? "text-success" : "text-danger"
      }`}
    >
      <span className="me-2">
        {value ? (
          <AIIcons.AiOutlineCheckSquare /> // Icon for Active
        ) : (
          <AIIcons.AiOutlineClose /> // Icon for Inactive
        )}
      </span>
      {value ? t("status.active.label") : t("status.inactive.label")}
    </div>
  );
};

export default AppStatus;
