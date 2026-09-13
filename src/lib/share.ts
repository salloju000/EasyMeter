import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportNodeToPdf(node: HTMLElement, filename: string): Promise<Blob> {
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  let imgWidth = pageWidth - 40;
  let imgHeight = imgWidth / ratio;
  if (imgHeight > pageHeight - 40) {
    imgHeight = pageHeight - 40;
    imgWidth = imgHeight * ratio;
  }
  const x = (pageWidth - imgWidth) / 2;
  const y = 20;
  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  pdf.save(filename);
  return pdf.output("blob");
}

export async function shareNodeAsPdf(node: HTMLElement, filename: string, text: string) {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  let imgWidth = pageWidth - 40;
  let imgHeight = imgWidth / ratio;
  if (imgHeight > pageHeight - 40) {
    imgHeight = pageHeight - 40;
    imgWidth = imgHeight * ratio;
  }
  pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename, text });
    return;
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
