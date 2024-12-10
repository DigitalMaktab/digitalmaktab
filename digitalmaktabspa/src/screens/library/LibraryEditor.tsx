import React, { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditorProps } from "../school/properties/EditorProps";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { Book } from "../../models/Book";
import { ResponseResult } from "../../dtos/ResultEnum";
import useRootOperations from "../../hooks/useRootOperations";
import AppFormInput from "../../components/form/AppFormInput";
import AppBaseEditor from "../../components/AppBaseEditor";

const ClassEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useAppLocalizer();

  const { addBook } = useRootOperations();

  const initialFormData = {
    bookTitle: "",
    file: "",
  } as unknown as Book;

  const validationSchemaConfig = {
    bookTitle: { label: t("book.bookTitle.label") },
    file: { label: t("book.file.label") },
  } as Record<keyof Book, { label: string }>;

  const submitData = useCallback(
    async (book: Book) => {
      try {
        let result;
        if (id) {
          // If id exists, update the existing record
          // result = await updateTeacher(id, teacher); // Assuming `updateTeacher` is available
          result = {};
        } else {
          const formData = new FormData();
          formData.append("bookTitle", book.bookTitle);
          if (book.file !== undefined && book.file != null)
            formData.append("file", book.file);

          result = await addBook(formData);
        }

        if (result.status === ResponseResult.SUCCESS) {
          navigate("/library");
        }
      } catch (error) {
        console.error("Submission failed:", error);
      }
    },
    [id, addBook, navigate]
  );

  return (
    <>
      <AppBaseEditor<Book>
        initialData={initialData}
        initialFormData={initialFormData}
        validationSchemaConfig={validationSchemaConfig}
        onSubmit={submitData}
        title={(data) => data.bookTitle || t("book.addBook.label")}
      >
        <div className="row">
          <div className="col-md-6">
            <AppFormInput
              label={t("book.bookTitle.label")}
              name="bookTitle"
              required={true}
              placeholder={t("book.bookTitle.placeholder")}
            />
          </div>
          <div className="col-md-6">
            <AppFormInput
              label={t("book.file.label")}
              name="file"
              type="file"
              placeholder={t("book.file.placeholder")}
            />
          </div>
        </div>
      </AppBaseEditor>
    </>
  );
};

export default ClassEditor;
