import jsPDF from "jspdf";
import "jspdf-autotable";
import { VazirMatnBase64 } from "./../fonts/VazirmatnBase64";
import { useCallback, useRef } from "react";
import { useAppLocalizer } from "./useAppLocalizer";
import { Column } from "../components/table/properties/TableProps";

const useJsPdfExportToPdf = <T>() => {
  const { t, dir, formatNumber } = useAppLocalizer();
  const cachedLogo = useRef<string | null>(null);

  const fetchImageBase64 = async (path: string): Promise<string> => {
    if (cachedLogo.current) return cachedLogo.current;
    try {
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogo.current = reader.result as string;
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
      logoPath: string = `${process.env.PUBLIC_URL}/assets/images/MOELOGO.png`,
      leftText: string = t("report.header.leftText.label"),
      centerTextTop: string = t("report.header.centerTextTop.label"),
      centerTextBottom: string = t("report.header.centerTextBottom.label")
    ) => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
        });

        doc.addFileToVFS("VazirMatn-Regular.ttf", VazirMatnBase64);
        doc.addFont("VazirMatn-Regular.ttf", "VazirMatn", "normal");
        doc.setFont("VazirMatn");

        // Set document properties
        doc.setProperties({
          title,
          subject: t("report.subject.label"),
          author: t("report.author.label"),
        });

        const logoBase64 = await fetchImageBase64(logoPath);

        const renderHeader = () => {
          const isRTL = dir === "rtl";
          const pageWidth = doc.internal.pageSize.getWidth();
          const logoX = isRTL ? pageWidth - 100 : 20;

          doc.addImage(logoBase64, "PNG", logoX, 20, 50, 50);
          doc.setFontSize(12);
          doc.text(centerTextTop, pageWidth / 2, 30, { align: "center" });
          doc.setFontSize(10);
          doc.text(centerTextBottom, pageWidth / 2, 45, { align: "center" });
          const sideTextX = isRTL ? 20 : pageWidth - 60;
          doc.text(leftText, sideTextX, 45, {
            align: isRTL ? "left" : "right",
          });
        };

        const renderTable = () => {
          const isRTL = dir === "rtl";
          const headers = columns.map((col) => t(col.header));
          const body = data.map((row) =>
            columns.map((col) =>
              col.render
                ? col.render(row[col.accessor], row)?.toString() || ""
                : row[col.accessor]?.toString() || ""
            )
          );

          if (isRTL) {
            headers.reverse();
            body.forEach((row) => row.reverse());
          }

          doc.autoTable({
            head: [headers],
            body,
            startY: 100,
            styles: {
              font: "VazirMatn",
              fontSize: 10,
              halign: isRTL ? "right" : "left",
            },
            margin: { left: 20, right: 20 },
            tableWidth: "auto",
          });
        };

        const renderTitle = () => {
          doc.setFontSize(16);
          doc.text(title, doc.internal.pageSize.getWidth() / 2, 80, {
            align: "center",
          });
        };

        const renderFooter = () => {
          const pageCount = (doc.internal as any).getNumberOfPages();
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            const text = t("report.footer.pageNumber.label", {
              currentPage: formatNumber(i),
              totalPages: formatNumber(pageCount),
            });
            const isRTL = dir === "rtl";
            const footerX = isRTL ? 20 : pageWidth - 20;

            doc.text(text, footerX, pageHeight - 30, {
              align: isRTL ? "left" : "right",
            });
          }
        };

        renderHeader();
        renderTitle();
        renderTable();
        renderFooter();

        // Open the PDF in a new tab with the correct title
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        const pdfWindow = window.open(url, "_blank");
        if (pdfWindow && pdfWindow.document) {
          pdfWindow.document.title = title;
        }

        // Download the PDF with a meaningful name
        // doc.save(`${title}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    },
    [t, dir, formatNumber]
  );

  return exportToPDF;
};

export default useJsPdfExportToPdf;
