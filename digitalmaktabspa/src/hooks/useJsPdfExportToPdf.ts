import jsPDF from "jspdf";
import "jspdf-autotable";
import { VazirMatnBase64 } from "./../fonts/VazirmatnBase64";
import { useCallback, useRef } from "react";
import { useAppLocalizer } from "./useAppLocalizer";
import { Column } from "../components/table/properties/TableProps";

const useJsPdfExportToPdf = <T>() => {
  const { t, dir } = useAppLocalizer();
  const cachedLogo = useRef<string | null>(null);

  const fetchImageBase64 = async (path: string): Promise<string> => {
    if (cachedLogo.current) return cachedLogo.current; // Use cached Base64 if available
    try {
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogo.current = reader.result as string; // Cache the result
          resolve(reader.result as string);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error fetching or converting logo to Base64:", error);
      throw error;
    }
  };

  const exportToPDF = useCallback(
    async (
      columns: Column<T>[],
      data: T[],
      title: string = t("report.title.label"),
      logoPath: string = `${process.env.PUBLIC_URL}/assets/images/MOELOGO.png`, // Default logo path
      leftText: string = t("report.header.leftText.label"), // Left/Right text
      centerTextTop: string = t("report.header.centerTextTop.label"), // Center top text
      centerTextBottom: string = t("report.header.centerTextBottom.label") // Center bottom text
    ) => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
        });

        // Load the font
        doc.addFileToVFS("VazirMatn-Regular.ttf", VazirMatnBase64);
        doc.addFont("VazirMatn-Regular.ttf", "VazirMatn", "normal");
        doc.setFont("VazirMatn");

        // Fetch and convert logo to Base64
        const logoBase64 = await fetchImageBase64(logoPath);

        // Determine alignment for RTL or LTR
        const isRTL = dir === "rtl";

        // Add header logo
        const logoX = isRTL ? doc.internal.pageSize.getWidth() - 100 : 20;
        const logoY = 20;
        doc.addImage(logoBase64, "PNG", logoX, logoY, 50, 50);

        // Add center text
        doc.setFontSize(12);
        doc.text(centerTextTop, doc.internal.pageSize.getWidth() / 2, 30, {
          align: "center",
        });
        doc.setFontSize(10);
        doc.text(centerTextBottom, doc.internal.pageSize.getWidth() / 2, 45, {
          align: "center",
        });

        // Add left or right text
        const sideTextX = isRTL ? 20 : doc.internal.pageSize.getWidth() - 60;
        doc.setFontSize(10);
        doc.text(leftText, sideTextX, 45, { align: isRTL ? "left" : "right" });

        // Add title
        doc.setFontSize(16);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 80, {
          align: "center",
        });

        // Prepare headers and body with render function support
        const headers = columns.map((col) => t(col.header));
        const body = data.map((row) =>
          columns.map((col) =>
            col.render
              ? col.render(row[col.accessor], row)?.toString() || ""
              : row[col.accessor]?.toString() || ""
          )
        );

        // Reverse for RTL
        if (isRTL) {
          headers.reverse();
          body.forEach((row) => row.reverse());
        }

        // Add table
        doc.autoTable({
          head: [headers],
          body: body,
          startY: 100,
          styles: {
            font: "VazirMatn",
            fontSize: 10,
            halign: isRTL ? "right" : "left",
          },
          margin: { left: 20, right: 20 },
          tableWidth: "auto",
        });

        // Open PDF in a new browser tab
        doc.output("dataurlnewwindow");
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    },
    [t, dir]
  );

  return exportToPDF;
};

export default useJsPdfExportToPdf;
