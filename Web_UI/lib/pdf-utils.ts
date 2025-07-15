import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generatePDFFromHTML = async (htmlContent: string, filename: string = 'report.pdf'): Promise<void> => {
  try {
    console.log('Starting PDF generation...')
    
    // Create a temporary container with improved positioning
    const container = document.createElement('div')
    container.innerHTML = htmlContent
    
    // Enhanced container styling for better PDF capture - positioned off-screen but still rendered
    container.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: 900px;
      height: auto;
      background: white;
      padding: 0;
      margin: 0;
      z-index: -1000;
      transform: scale(1);
      transform-origin: top left;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
      font-size: 16px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      visibility: visible;
      opacity: 1;
      pointer-events: none;
      overflow: hidden;
      clip: rect(0,0,0,0);
    `
    
    document.body.appendChild(container)
    console.log('Container added to DOM')
    
    let canvas: any = null
    
    try {
      // Force layout recalculation
      container.offsetHeight
      
      // Wait for fonts and layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Enhanced html2canvas options for better quality
      canvas = await html2canvas(container, {
        width: 900,
        height: container.scrollHeight,
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        imageTimeout: 0,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          console.log('Document cloned for canvas rendering')
          const clonedContainer = clonedDoc.body.querySelector('div')
          if (clonedContainer) {
            // Ensure proper visibility in cloned document
            clonedContainer.style.visibility = 'visible'
            clonedContainer.style.opacity = '1'
            clonedContainer.style.position = 'static'
            clonedContainer.style.transform = 'none'
            console.log('Cloned container styled for rendering')
          }
        }
      })
      
      console.log(`Canvas created: ${canvas.width}x${canvas.height}`)
      
    } finally {
      // Always remove container, even if there's an error
      try {
        if (container && container.parentNode) {
          document.body.removeChild(container)
          console.log('Container removed from DOM')
        }
      } catch (e) {
        // Container might already be removed or DOM might be unavailable
        console.log('Container cleanup completed')
      }
    }
    
    // If canvas creation failed, throw error after cleanup
    if (!canvas) {
      throw new Error('Failed to create canvas from HTML content')
    }
    
    // Create PDF with proper dimensions
    const imgData = canvas.toDataURL('image/png', 1.0)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true
    })
    
    // Calculate dimensions for A4 (210mm x 297mm)
    const pageWidth = pdf.internal.pageSize.getWidth() // ~210mm
    const pageHeight = pdf.internal.pageSize.getHeight() // ~297mm
    const margin = 10 // 10mm margin on all sides
    const contentWidth = pageWidth - (margin * 2) // ~190mm
    const contentHeight = pageHeight - (margin * 2) // ~277mm
    
    // Calculate scaling to fit content width
    const canvasRatio = canvas.height / canvas.width
    const scaledHeight = contentWidth * canvasRatio
    
    console.log(`PDF dimensions: ${pageWidth}x${pageHeight}mm`)
    console.log(`Content area: ${contentWidth}x${contentHeight}mm`)
    console.log(`Scaled content height: ${scaledHeight}mm`)
    
    // Handle multi-page content
    if (scaledHeight <= contentHeight) {
      // Single page - center vertically
      const yPosition = margin + (contentHeight - scaledHeight) / 2
      pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, scaledHeight)
      console.log('Single page PDF created')
    } else {
      // Multi-page content
      const pagesNeeded = Math.ceil(scaledHeight / contentHeight)
      console.log(`Multi-page PDF: ${pagesNeeded} pages needed`)
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) {
          pdf.addPage()
        }
        
        // Calculate the portion of the image for this page
        const sourceY = (i * contentHeight * canvas.height) / scaledHeight
        const sourceHeight = Math.min(
          (contentHeight * canvas.height) / scaledHeight,
          canvas.height - sourceY
        )
        
        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sourceHeight
        
        const pageCtx = pageCanvas.getContext('2d')
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          )
          
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0)
          const pageScaledHeight = (sourceHeight * contentWidth) / canvas.width
          
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageScaledHeight)
          console.log(`Page ${i + 1} added`)
        }
      }
    }
    
    // Save the PDF
    pdf.save(filename)
    console.log(`PDF saved as: ${filename}`)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

export const downloadReportAsPDF = async (reportId: string): Promise<void> => {
  try {
    console.log(`Starting PDF download for report: ${reportId}`)
    
    // Fetch the report data
    const reportResponse = await fetch(`/api/reports/${reportId}`)
    if (!reportResponse.ok) {
      throw new Error(`Failed to fetch report: ${reportResponse.statusText}`)
    }
    
    const reportData = await reportResponse.json()
    console.log('Report data fetched successfully')
    
    // Generate PDF HTML
    const pdfResponse = await fetch('/api/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportData, reportId })
    })
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to generate PDF HTML: ${pdfResponse.statusText}`)
    }
    
    const { html } = await pdfResponse.json()
    console.log('PDF HTML generated successfully')
    
    // Generate and download the PDF
    const reportTitle = reportData.metadata?.report_title || 'Security Report'
    const filename = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    
    await generatePDFFromHTML(html, filename)
    console.log('PDF download completed')
    
  } catch (error) {
    console.error('Error downloading PDF:', error)
    throw error
  }
}

export const generatePDFFromCurrentPage = async (
  filename: string = 'report.pdf',
  containerId?: string
): Promise<void> => {
  try {
    const element = containerId 
      ? document.getElementById(containerId)
      : document.body;
    
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 10000
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // Calculate aspect ratio for better fitting
    const canvasAspectRatio = canvas.width / canvas.height;
    const pageAspectRatio = contentWidth / contentHeight;
    
    let imgWidth, imgHeight;
    
    if (canvasAspectRatio > pageAspectRatio) {
      imgWidth = contentWidth;
      imgHeight = contentWidth / canvasAspectRatio;
    } else {
      imgHeight = contentHeight;
      imgWidth = contentHeight * canvasAspectRatio;
    }

    const xOffset = margin + (contentWidth - imgWidth) / 2;
    const yOffset = margin;

    pdf.addImage(
      imgData,
      'JPEG',
      xOffset,
      yOffset,
      imgWidth,
      imgHeight,
      '',
      'MEDIUM'
    );

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF from current page:', error);
    throw error;
  }
}; 

export const testPDFGeneration = async (): Promise<void> => {
  try {
    const response = await fetch('/api/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    
    if (!response.ok) {
      let errorDetails = `${response.status}`;
      try {
        const errorData = await response.json();
        errorDetails = errorData.details || errorData.error || errorDetails;
      } catch (e) {
        // ignore
      }
      throw new Error(`Test failed: ${errorDetails}`);
    }
    
    const { html } = await response.json();
    console.log('Test HTML generated successfully:', html.substring(0, 100) + '...');
    
    // Generate a simple test PDF
    await generatePDFFromHTML(html, 'test-pdf.pdf');
    
    console.log('Test PDF generated successfully!');
  } catch (error) {
    console.error('Test PDF generation failed:', error);
    throw error;
  }
}; 