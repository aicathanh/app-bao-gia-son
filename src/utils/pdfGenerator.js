import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportToPDF = async (elementId, filename = 'Bao_Gia.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Add temporary styling for export
  const originalWidth = element.style.width;
  element.style.width = '1000px'; 
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // higher quality
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('PDF Generation error:', error);
  } finally {
    element.style.width = originalWidth;
  }
};
