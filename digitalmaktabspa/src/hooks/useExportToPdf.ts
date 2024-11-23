import { useCallback } from "react";
import pdfMake from "../config/pdfMakeConfig";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { Column } from "../components/table/properties/TableProps";
import { useAppLocalizer } from "./useAppLocalizer";

const useExportToPDF = <T>() => {
  const { t, language } = useAppLocalizer();

  const exportToPDF = useCallback(
    (
      columns: Column<T>[],
      data: T[],
      title: string = t("report.title.label")
    ) => {
      try {
        // Translate headers
        const headers = columns.map((col) => ({
          text: t(col.header), // Translate the header using translation key
          bold: true,
          alignment: "center",
          fontSize: 12,
          font: "VazirMatn",
        }));

        // Map data to table rows
        const body = data.map((row) =>
          columns.map((col) => ({
            text: row[col.accessor]?.toString() ?? "", // Safely access data using accessor
            font: "VazirMatn",
          }))
        );

        // Add headers to the body
        body.unshift(headers);

        // Define the PDF document
        const docDefinition: TDocumentDefinitions = {
          content: [
            {
              text: title,
              font: "VazirMatn",
              fontSize: 16,
              bold: true,
              alignment: "center",
              margin: [0, 0, 0, 10],
            },
            {
              table: {
                headerRows: 1,
                widths: Array(columns.length).fill("*"),
                body: body,
              },
            },
          ],
          defaultStyle: {
            font: "VazirMatn",
            fontSize: 10,
          },
          language: language.language,
        };

        pdfMake.createPdf(docDefinition).open();
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    },
    [t]
  );

  return exportToPDF;
};

export default useExportToPDF;
