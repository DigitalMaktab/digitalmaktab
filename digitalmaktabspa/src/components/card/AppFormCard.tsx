import React from "react";
import { FormCardProps } from "./properties/CardProps";
import { useTranslation } from "react-i18next";
import AppButton from "../AppButton";
import AppCard from "./AppCard";
import AppForm from "../form/AppForm";

const AppFormCard: React.FC<FormCardProps> = ({
  title,
  initialValues,
  onSubmit,
  validationSchema,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <AppForm
        onSubmit={onSubmit}
        validationSchema={validationSchema}
        initialValues={initialValues}
      >
        <AppCard
          title={title}
          showFooter={true}
          footerChildren={
            <AppButton
              label={t("controls.saveButton.label")}
              type="submit"
              disabled={false}
              className="btn-primary"
            />
          }
        >
          {children}
        </AppCard>
      </AppForm>
    </>
  );
};

export default AppFormCard;
