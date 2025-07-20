import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generatePDFFromHTML = async (htmlContent: string, filename: string = 'report.pdf'): Promise<void> => {
  try {
    console.log('Starting pixel-perfect PDF generation...')
    
    // Create a temporary container for rendering
    const container = document.createElement('div')
    container.innerHTML = htmlContent
    
    // PIXEL-PERFECT: Container styling that matches browser viewer exactly
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 896px;
      min-height: 1200px;
      background: white;
      padding: 32px;
      margin: 0;
      z-index: 9999;
      transform: none;
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
      overflow: visible;
      display: block;
    `
    
    document.body.appendChild(container)
    console.log('Pixel-perfect container added to DOM')
    
    let canvas: any = null
    
    try {
      // Wait for layout stabilization
      console.log('Waiting for layout stabilization...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Force layout recalculation
      const height = container.offsetHeight
      const width = container.offsetWidth
      console.log(`Container dimensions: ${width}x${height}`)
      
      // PIXEL-PERFECT: html2canvas configuration optimized for exact browser matching
      console.log('Starting pixel-perfect canvas capture...')
      canvas = await html2canvas(container, {
        width: width,
        height: height,
        scale: 2.0, // High resolution for text clarity
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 30000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        windowWidth: 896, // Match browser viewer max-width
        windowHeight: 1200,
        ignoreElements: (element) => {
          return element.tagName === 'SCRIPT' || 
                 element.tagName === 'STYLE' ||
                 element.tagName === 'LINK';
        },
        onclone: (clonedDoc, element) => {
          console.log('Document cloned for pixel-perfect rendering')
          
          // PIXEL-PERFECT: Ensure container has exact browser styling
          const clonedContainer = clonedDoc.querySelector('div')
          if (clonedContainer) {
            clonedContainer.style.cssText = `
              visibility: visible !important;
              opacity: 1 !important;
              position: static !important;
              transform: none !important;
              left: 0 !important;
              top: 0 !important;
              display: block !important;
              width: 896px !important;
              background: white !important;
              padding: 32px !important;
              margin: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
              line-height: 1.5 !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            `
          }
          
          // PIXEL-PERFECT: Preserve exact badge styling from browser
          const badges = clonedDoc.querySelectorAll('.badge')
          badges.forEach(badge => {
            if (badge instanceof HTMLElement) {
              // Ensure badges render with exact browser colors
              badge.style.display = 'inline-flex !important'
              badge.style.alignItems = 'center !important'
              badge.style.borderRadius = '9999px !important'
              badge.style.borderWidth = '1px !important'
              badge.style.padding = '2px 10px !important'
              badge.style.fontSize = '12px !important'
              badge.style.fontWeight = '600 !important'
            }
          })
          
          // PIXEL-PERFECT: Ensure gray-50 backgrounds render consistently
          const grayCards = clonedDoc.querySelectorAll('.exec-summary-card, .network-stat-card, .traffic-item, .protocol-card, .security-content-card')
          grayCards.forEach(card => {
            if (card instanceof HTMLElement) {
              card.style.backgroundColor = '#F9FAFB !important'
              card.style.border = '1px solid #E5E7EB !important'
            }
          })
          
          // PIXEL-PERFECT: Ensure monospace fonts render correctly
          const monoElements = clonedDoc.querySelectorAll('.traffic-ip, .security-ip')
          monoElements.forEach(mono => {
            if (mono instanceof HTMLElement) {
              mono.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", "Courier New", monospace !important'
            }
          })
          
          // PIXEL-PERFECT: Ensure exact typography rendering
          const titles = clonedDoc.querySelectorAll('.main-title')
          titles.forEach(title => {
            if (title instanceof HTMLElement) {
              title.style.fontSize = '30px !important'
              title.style.fontWeight = '700 !important'
              title.style.color = '#111827 !important'
            }
          })
          
          const sectionHeaders = clonedDoc.querySelectorAll('.section-title')
          sectionHeaders.forEach(header => {
            if (header instanceof HTMLElement) {
              header.style.fontSize = '24px !important'
              header.style.fontWeight = '700 !important'
              header.style.color = '#111827 !important'
            }
          })
          
          console.log('Pixel-perfect styling applied to cloned document')
        }
      })
      
      console.log(`Pixel-perfect canvas created: ${canvas.width}x${canvas.height}`)
      
    } finally {
      // Always remove container
      try {
        if (container && container.parentNode) {
          document.body.removeChild(container)
          console.log('Container removed from DOM')
        }
      } catch (e) {
        console.log('Container cleanup completed')
      }
    }
    
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error(`Failed to create valid canvas from HTML content (${canvas?.width || 0}x${canvas?.height || 0})`)
    }
    
    // Create PDF with optimal settings
    console.log('Creating pixel-perfect PDF document...')
    const imgData = canvas.toDataURL('image/png', 0.95)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true
    })
    
    // Calculate dimensions for A4 (210mm x 297mm)
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - (margin * 2)
    const contentHeight = pageHeight - (margin * 2)
    
    // Calculate scaling to fit content width
    const canvasRatio = canvas.height / canvas.width
    const scaledHeight = contentWidth * canvasRatio
    
    console.log(`PDF dimensions: ${pageWidth}x${pageHeight}mm`)
    console.log(`Content area: ${contentWidth}x${contentHeight}mm`)
    console.log(`Scaled content height: ${scaledHeight}mm`)
    
    // Handle single or multi-page content
    if (scaledHeight <= contentHeight) {
      // Single page - center vertically
      const yPosition = margin + Math.max(0, (contentHeight - scaledHeight) / 2)
      pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, scaledHeight, '', 'FAST')
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
        if (pageCtx && sourceHeight > 0) {
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          )
          
          const pageImgData = pageCanvas.toDataURL('image/png', 0.95)
          const pageScaledHeight = (sourceHeight * contentWidth) / canvas.width
          
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageScaledHeight, '', 'FAST')
          console.log(`Page ${i + 1} added`)
        }
      }
    }
    
    // Save the PDF
    pdf.save(filename)
    console.log(`Pixel-perfect PDF saved as: ${filename}`)
    
  } catch (error) {
    console.error('Error generating pixel-perfect PDF:', error)
    throw error
  }
}

export const downloadReportAsPDF = async (reportId: string): Promise<void> => {
  try {
    console.log(`Starting PDF download for report: ${reportId}`)
    
    // Fetch the report data first to get metadata
    const reportResponse = await fetch(`/api/reports/${reportId}`)
    if (!reportResponse.ok) {
      throw new Error(`Failed to fetch report: ${reportResponse.statusText}`)
    }
    
    const reportApiResponse = await reportResponse.json()
    console.log('Report data fetched successfully')
    
    // Extract just the report data, not the API wrapper
    const reportData = reportApiResponse.success && reportApiResponse.report 
      ? reportApiResponse.report 
      : reportApiResponse
    
    console.log('Sending report data to PDF API:', Object.keys(reportData))
    
    // Generate PDF binary directly from the API
    const pdfResponse = await fetch('/api/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportData, reportId })
    })
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text()
      throw new Error(`Failed to generate PDF: ${pdfResponse.statusText} - ${errorText}`)
    }
    
    // Check content type to determine if we got PDF or HTML fallback
    const contentType = pdfResponse.headers.get('content-type')
    console.log(`PDF API returned content type: ${contentType}`)
    
    if (contentType?.includes('application/pdf')) {
      // SUCCESS: We got a PDF binary - download it directly
      console.log('Received PDF binary from API')
      
      const pdfBlob = await pdfResponse.blob()
      
      // Generate filename from report metadata
      const reportTitle = reportData.metadata?.report_title || reportData.name || 'Security Report'
      const filename = `${reportTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.pdf`
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      console.log(`PDF downloaded successfully as: ${filename}`)
      
    } else if (contentType?.includes('text/html')) {
      // FALLBACK: We got HTML content - use html2canvas method
      console.log('Received HTML fallback from API, using client-side generation')
      
    const htmlContent = await pdfResponse.text()
    
    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new Error('No HTML content received from PDF API')
    }
    
    console.log(`PDF HTML generated successfully (${htmlContent.length} characters)`)
    
      // Generate filename from report metadata
    const reportTitle = reportData.metadata?.report_title || reportData.name || 'Security Report'
    const filename = `${reportTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.pdf`
    
    await generatePDFFromHTML(htmlContent, filename)
      console.log('PDF generated and downloaded using HTML fallback method')
      
    } else {
      // ERROR: Unknown content type
      const responseText = await pdfResponse.text()
      console.error('Unexpected content type from PDF API:', contentType)
      console.error('Response content:', responseText.substring(0, 500))
      throw new Error(`Unexpected response from PDF API. Content-Type: ${contentType}`)
    }
    
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