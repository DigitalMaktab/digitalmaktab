import React from "react";
import { useTranslation } from "react-i18next";

interface AppModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  errors?: string[];
  imageSrc?: string;
}

const AppModal: React.FC<AppModalProps> = ({
  isVisible,
  onClose,
  title,
  errors,
  imageSrc,
}) => {
  const { t } = useTranslation();
  if (!isVisible) return null;
  return (
    <div
      className="modal fade show"
      id="exampleModalCenter1"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="exampleModalCenter1"
      aria-hidden="true"
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-body">
            <div className="modal-toggle-wrapper">
              <h4 className="text-center pb-2">{t("apiResponse.error")}</h4>
              <ul>
                {errors &&
                  errors.map((error, index) => (
                    <li
                      className="txt-danger"
                      key={index}
                      style={{ marginBottom: 10 }}
                    >
                      {error}
                    </li>
                  ))}
              </ul>
              <button
                className="btn btn-secondary d-flex m-auto btn-xs"
                type="button"
                data-bs-dismiss="modal"
              >
                {t("close.label")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppModal;
