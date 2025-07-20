/**
 * LEVANT AI Report Styling System
 * 
 * CRITICAL: This file contains the unified design system for both:
 * 1. Browser report viewer (Web_UI/app/reports/[id]/page.tsx)
 * 2. PDF export template (Web_UI/app/api/reports/pdf/route.ts)
 * 
 * When updating styles, ensure changes are applied to BOTH components
 * to maintain perfect visual consistency between browser and PDF.
 */

// ===========================================
// DESIGN TOKENS
// ===========================================

export const DESIGN_TOKENS = {
  // Color Palette
  colors: {
    // Primary Colors
    primary: {
      50: '#f8fafc',  // Very light background
      100: '#f1f5f9', // Light background
      200: '#e2e8f0', // Border colors
      300: '#cbd5e1', // Disabled states
      400: '#94a3b8', // Placeholder text
      500: '#64748b', // Secondary text
      600: '#475569', // Primary text
      700: '#334155', // Dark text
      800: '#1e293b', // Headings
      900: '#0f172a', // Darkest text
    },
    
    // Semantic Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
  },
  
  // Typography Scale
  typography: {
    // Font families
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    
    // Font sizes
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px  
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    
    // Line heights
    leading: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
    },
    
    // Font weights
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Spacing Scale
  spacing: {
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Border Radius
  radius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
} as const;

// ===========================================
// COMPONENT STYLES
// ===========================================

export const REPORT_STYLES = {
  // Layout Containers
  layout: {
    pageContainer: 'min-h-screen bg-white',
    contentContainer: 'max-w-4xl mx-auto p-8 print:p-6',
    sectionContainer: 'mb-8 print:mb-6',
    headerContainer: 'text-center mb-8 print:mb-6',
  },
  
  // Typography
  typography: {
    pageTitle: 'text-3xl font-bold text-gray-900 mb-2 print:text-2xl',
    pageSubtitle: 'text-lg text-gray-600 mb-4 print:text-base',
    sectionTitle: 'text-2xl font-bold text-gray-900 mb-4 print:text-xl',
    subsectionTitle: 'text-lg font-semibold text-gray-900 mb-3',
    cardTitle: 'text-sm font-medium text-gray-600 mb-1',
    bodyText: 'text-gray-700',
    captionText: 'text-xs text-gray-500',
    monoText: 'font-mono text-sm text-gray-700',
    metadataText: 'text-sm text-gray-500',
  },
  
  // Card System
  cards: {
    // Base card styles
    base: 'bg-white border border-gray-200 rounded-lg shadow-sm',
    
    // Executive summary cards (no visible borders by default)
    executive: 'bg-gray-50 p-4 rounded-lg print:border print:bg-white',
    
    // Network stats cards
    stats: 'bg-gray-50 p-4 rounded-lg print:border print:bg-white',
    
    // Traffic item cards
    traffic: 'bg-gray-50 p-3 rounded print:border print:bg-white',
    
    // Protocol cards
    protocol: 'bg-gray-50 p-3 rounded print:border print:bg-white',
    
    // Security finding cards
    security: 'bg-gray-50 p-4 rounded-lg print:border print:bg-white',
    
    // Recommendation cards (always have borders)
    recommendation: 'border border-gray-200 rounded-lg p-4 print:break-inside-avoid',
    
    // Content cards with padding
    content: 'bg-white border border-gray-200 rounded-lg shadow-sm p-6',
    
    // Hover states
    hover: 'hover:shadow-md transition-shadow duration-200',
  },
  
  // Grid Systems
  grids: {
    // Executive summary: 3 columns
    executive: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3',
    
    // Network stats: 4 columns
    networkStats: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:grid-cols-4',
    
    // Traffic sources/destinations: 2 columns
    traffic: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-6',
    
    // Protocol distribution: 3 columns
    protocols: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    
    // Generic responsive grids
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  },
  
  // Badge System
  badges: {
    // Base badge structure
    base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    
    // Severity badges
    severity: {
      low: 'border-green-200 text-green-700 bg-green-50',
      medium: 'border-yellow-200 text-yellow-700 bg-yellow-50',
      high: 'border-red-200 text-red-700 bg-red-50',
      critical: 'border-red-300 text-red-800 bg-red-100',
    },
    
    // Priority badges  
    priority: {
      immediate: 'border-red-200 text-red-700 bg-red-50',
      scheduled: 'border-yellow-200 text-yellow-700 bg-yellow-50',
      ongoing: 'border-blue-200 text-blue-700 bg-blue-50',
      low: 'border-green-200 text-green-700 bg-green-50',
    },
    
    // Status badges
    status: {
      active: 'border-green-200 text-green-700 bg-green-50',
      inactive: 'border-gray-200 text-gray-700 bg-gray-50',
      warning: 'border-yellow-200 text-yellow-700 bg-yellow-50',
      error: 'border-red-200 text-red-700 bg-red-50',
    },
    
    // Generic outline badge
    outline: 'text-foreground border-gray-200',
  },
  
  // Interactive Elements
  interactive: {
    // Buttons
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors',
      outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors',
    },
    
    // Links
    link: 'text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline',
  },
  
  // Layout Utilities
  layout: {
    // Flexbox utilities
    flexBetween: 'flex items-center justify-between',
    flexCenter: 'flex items-center justify-center',
    flexStart: 'flex items-start',
    flexEnd: 'flex items-end',
    
    // Spacing utilities
    spaceY2: 'space-y-2',
    spaceY3: 'space-y-3',
    spaceY4: 'space-y-4',
    spaceY6: 'space-y-6',
    
    // Text alignment
    textCenter: 'text-center',
    textLeft: 'text-left',
    textRight: 'text-right',
    
    // Responsive utilities
    hiddenPrint: 'print:hidden',
    printOnly: 'hidden print:block',
  },
  
  // Print-specific styles
  print: {
    // Page breaks
    pageBreak: 'print:break-inside-avoid',
    pageBreakBefore: 'print:break-before-page',
    pageBreakAfter: 'print:break-after-page',
    
    // Print-specific spacing
    printPadding: 'print:p-6',
    printMargin: 'print:mb-6',
    
    // Print-specific typography
    printTextSize: 'print:text-base',
    printHeading: 'print:text-xl',
    
    // Print-specific layout
    printBorder: 'print:border',
    printBackground: 'print:bg-white',
    printGrid: 'print:grid-cols-3',
  },
} as const;

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get severity badge classes based on severity level
 */
export function getSeverityBadgeClasses(severity: string): string {
  const normalizedSeverity = severity.toLowerCase() as keyof typeof REPORT_STYLES.badges.severity;
  const severityClass = REPORT_STYLES.badges.severity[normalizedSeverity] || REPORT_STYLES.badges.severity.medium;
  return `${REPORT_STYLES.badges.base} ${severityClass}`;
}

/**
 * Get priority badge classes based on priority level
 */
export function getPriorityBadgeClasses(priority: string): string {
  const normalizedPriority = priority.toLowerCase() as keyof typeof REPORT_STYLES.badges.priority;
  const priorityClass = REPORT_STYLES.badges.priority[normalizedPriority] || REPORT_STYLES.badges.priority.scheduled;
  return `${REPORT_STYLES.badges.base} ${priorityClass}`;
}

/**
 * Get complete card classes with hover effects
 */
export function getCardClasses(cardType: keyof typeof REPORT_STYLES.cards, includeHover = false): string {
  const baseClass = REPORT_STYLES.cards[cardType];
  return includeHover ? `${baseClass} ${REPORT_STYLES.cards.hover}` : baseClass;
}

/**
 * Combine multiple class strings safely
 */
export function combineClasses(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date consistently across components
 */
export function formatReportDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// ===========================================
// ICON DEFINITIONS (SVG strings for PDF use)
// ===========================================

export const REPORT_ICONS = {
  shield: `<svg class="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"/>
  </svg>`,
  
  alertTriangle: `<svg class="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  
  trendingUp: `<svg class="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
  </svg>`,
  
  calendar: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>`,
  
  clock: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  
  fileText: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>`,
  
  brain: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>`,
  
  target: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>`,
} as const;

export default REPORT_STYLES; 