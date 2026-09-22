import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AxiosResponse } from "axios";
import AppModal from "../modal/AppModal";
import AppCard from "../card/AppCard";
import AppButton from "../AppButton";
import AppFileInput from "../input/AppFileInput";

// Matches Dtos/ImportResultDto.cs on the server (both student + teacher imports).
interface ImportError {
  row: number;
  field?: string;
  message: string;
}
interface ImportCredential {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}
interface ImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errors: ImportError[];
  generatedPasswords: ImportCredential[];
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  /** i18n prefix — the modal reads `${translationPrefix}.modalTitle`, `.step1`, etc. */
  translationPrefix: string;
  downloadTemplate: () => Promise<AxiosResponse>;
  importFile: (file: File) => Promise<AxiosResponse>;
  templateFileName: string;
  passwordsFileName: string;
  onImported?: () => void;
}

const BulkImportModal: React.FC<Props> = ({
  isVisible,
  onClose,
  translationPrefix,
  downloadTemplate,
  importFile,
  templateFileName,
  passwordsFileName,
  onImported,
}) => {
  const { t } = useTranslation();
  const k = (key: string) => `${translationPrefix}.${key}`;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadTemplate();
      downloadBlob(
        new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        templateFileName
      );
    } catch {
      setUploadError(t(k("downloadTemplateFailed")));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const response = await importFile(file);
      setResult(response.data as ImportResult);
      onImported?.();
    } catch (e: any) {
      setUploadError(e?.response?.data?.message ?? t(k("uploadFailed")));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPasswords = () => {
    if (!result || result.generatedPasswords.length === 0) return;
    const header = "Email,FirstName,LastName,Password\n";
    const rows = result.generatedPasswords
      .map((c) => `${c.email},${c.firstName},${c.lastName},${c.password}`)
      .join("\n");
    downloadBlob(new Blob([header + rows], { type: "text/csv" }), passwordsFileName);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setUploadError(null);
    onClose();
  };

  const content = (
    <AppCard
      title={t(k("modalTitle"))}
      actions={
        <button
          type="button"
          className="btn-close"
          aria-label={t("close.label")}
          onClick={handleClose}
        />
      }
    >
      <ol className="mb-3">
        <li>{t(k("step1"))}</li>
        <li>{t(k("step2"))}</li>
        <li>{t(k("step3"))}</li>
      </ol>

      <div className="mb-3">
        <AppButton
          label={t(k("downloadTemplate"))}
          type="button"
          icon="download"
          className="btn-outline-primary btn-sm"
          onButtonClick={handleDownloadTemplate}
        />
      </div>

      <div className="mb-3">
        <AppFileInput
          name="importFile"
          label={t(k("fileInputLabel"))}
          setFieldValue={(_field: string, val: File | null) => setFile(val)}
          setFieldTouched={() => {}}
          rest={{ accept: ".xlsx", disabled: uploading }}
        />
      </div>

      <div className="mb-3">
        <AppButton
          label={uploading ? t(k("uploading")) : t(k("uploadButton"))}
          type="button"
          icon="upload"
          className="btn-primary btn-sm"
          onButtonClick={handleUpload}
          disabled={!file || uploading}
        />
      </div>

      {uploadError && <div className="alert alert-danger">{uploadError}</div>}

      {result && (
        <>
          <div className="alert alert-info">
            {t(k("summary"), {
              created: result.createdCount,
              skipped: result.skippedCount,
              total: result.totalRows,
            })}
          </div>

          {result.errors.length > 0 && (
            <div className="mb-3">
              <h6>{t(k("errorsTitle"))}</h6>
              <div className="table-responsive" style={{ maxHeight: 200 }}>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t(k("errorRow"))}</th>
                      <th>{t(k("errorField"))}</th>
                      <th>{t(k("errorMessage"))}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td>{e.row}</td>
                        <td>{e.field ?? "—"}</td>
                        <td>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.generatedPasswords.length > 0 && (
            <div>
              <h6>
                {t(k("passwordsTitle"), { count: result.generatedPasswords.length })}
              </h6>
              <p className="txt-muted small">{t(k("passwordsNote"))}</p>
              <AppButton
                label={t(k("passwordsDownload"))}
                type="button"
                icon="download"
                className="btn-success btn-sm"
                onButtonClick={handleDownloadPasswords}
              />
            </div>
          )}
        </>
      )}
    </AppCard>
  );

  return (
    <AppModal isVisible={isVisible} onClose={handleClose} modalContent={content} />
  );
};

export default BulkImportModal;
