import "jspdf";

declare module "jspdf" {
  interface jsPDFInternal {
    getNumberOfPages: () => number;
  }
}
