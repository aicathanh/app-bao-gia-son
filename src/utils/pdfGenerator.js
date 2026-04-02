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
      onclone: (clonedDoc) => {
        // Find and hide all elements with the 'no-print' class in the cloned document
        const noPrintItems = clonedDoc.querySelectorAll('.no-print');
        noPrintItems.forEach(item => {
          item.style.display = 'none';
        });
        
        // Also ensure inputs look clean
        const inputs = clonedDoc.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.style.border = 'none';
          input.style.background = 'transparent';
        });
      }
    });

    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 297; // A4 Landscape width
    const pageHeight = 210; // A4 Landscape height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('PDF Generation error:', error);
  } finally {
    element.style.width = originalWidth;
  }
};
