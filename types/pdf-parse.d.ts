declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    text: string;
  }
  function pdf(dataBuffer: Buffer): Promise<PDFData>;
  export default pdf;
}
