import React, { useCallback } from "react";
import { EditorProps } from "../../school/properties/EditorProps";
import { useNavigate, useParams } from "react-router-dom";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import useRootOperations from "../../../hooks/useRootOperations";
import { CalendarYear } from "../../../models/CalendarYear";
import { ResponseResult } from "../../../dtos/ResultEnum";
import AppFormInput from "../../../components/form/AppFormInput";
import AppBaseEditor from "../../../components/AppBaseEditor";

const CalendarYearEditor: React.FC<EditorProps> = ({ initialData }) => {
  const { id } = useParams<{ id: string }>();
  const { t } = useAppLocalizer();
  const navigate = useNavigate();

  const { addCalendarYear } = useRootOperations();

  const initialFormData = {
    year: "",
    nativeYear: "",
  } as CalendarYear;

  const validationSchemaConfig = {
    year: { label: t("calendarYear.year.label") },
    nativeYear: { label: t("calendarYear.nativeYear.label") },
  } as Record<keyof CalendarYear, { label: string }>;

  const submitData = useCallback(
    async (calendarYear: CalendarYear) => {
      try {
        let result;
        if (id) {
          // If id exists, update the existing record
          // result = await updateTeacher(id, teacher); // Assuming `updateTeacher` is available
          result = {};
        } else {
          result = await addCalendarYear(calendarYear);
        }

        if (result.status === ResponseResult.SUCCESS) {
          navigate("/calendar-year-list");
        }
      } catch (error) {
        console.error("Submission failed:", error);
      }
    },
    [id, addCalendarYear, navigate]
  );

  return (
    <AppBaseEditor<CalendarYear>
      initialData={initialData}
      initialFormData={initialFormData}
      validationSchemaConfig={validationSchemaConfig}
      onSubmit={submitData}
      title={(data) => data.nativeYear || t("calendarYear.add.label")}
    >
      <div className="row">
        <div className="col-md-6">
          <AppFormInput
            label={t("calendarYear.year.label")}
            name="year"
            type="date"
            required={true}
            placeholder={t("book.year.label")}
          />
        </div>
        <div className="col-md-6">
          <AppFormInput
            label={t("calendarYear.nativeYear.label")}
            name="nativeYear"
            required={true}
            placeholder={t("calendarYear.nativeYear.label")}
          />
        </div>
      </div>
    </AppBaseEditor>
  );
};

export default CalendarYearEditor;
