import React from "react";
import { Link } from "react-router-dom";
import { useAppLocalizer } from "../hooks/useAppLocalizer";

const ReturnToPublicHome = () => {
  const { t } = useAppLocalizer();
  return (
    <p className="mt-4 mb-0 text-center">
      <Link className="ms-2" to="/">
        {t("returnToHome.label")}
      </Link>
    </p>
  );
};

export default ReturnToPublicHome;
