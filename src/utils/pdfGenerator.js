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

    
    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Calculate height to maintain aspect ratio
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    // If the image is taller than a page, it will scale down,
    // but here we focus on fitting the width of the table.
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('PDF Generation error:', error);
  } finally {
    element.style.width = originalWidth;
  }
};
