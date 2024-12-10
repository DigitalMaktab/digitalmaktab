import React from "react";
import { useTranslation } from "react-i18next";

interface AppModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  errors?: string[];
  imageSrc?: string;
  isFullScreen?: boolean;
  modalHeader?: boolean;
  modalContent?: React.ReactNode;
}

const AppModal: React.FC<AppModalProps> = ({
  isVisible,
  onClose,
  title,
  errors,
  imageSrc,
  isFullScreen = false,
  modalContent,
  modalHeader,
}) => {
  const { t } = useTranslation();
  const modalClassName = isFullScreen
    ? "modal-dialog modal-dialog-centered modal-fullscreen"
    : "modal-dialog modal-dialog-centered";
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
      <div className={modalClassName} role="document">
        <div className="modal-content">
          {modalHeader && (
            <div className="modal-header">
              <h5 className="modal-title" id="myFullLargeModalLabel">
                {title}
              </h5>
              <button
                className="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
          )}
          <div className="modal-body">
            {errors && (
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
            )}
            {modalContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppModal;
