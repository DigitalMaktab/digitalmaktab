import React from "react";
import { Document, Page, Text, View, PDFViewer } from "@react-pdf/renderer";

const PDFDocument: React.FC = () => (
  <Document>
    <Page>
      <View>
        <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 20 }}>
          PDF Title Example
        </Text>
        <Text>This is the PDF content rendered in the browser.</Text>
      </View>
    </Page>
  </Document>
);

const AppPDFPreview: React.FC = () => (
  <PDFViewer width="100%" height="600px">
    <PDFDocument />
  </PDFViewer>
);

export default AppPDFPreview;
