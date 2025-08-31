import html2canvas from 'html2canvas';
import type { CardData } from '../types';

export interface ExportOptions {
  scale?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
  filename?: string;
}

// Mobile device detection
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Low-end device detection
const isLowEndDevice = (): boolean => {
  return navigator.hardwareConcurrency <= 2 || 
         (navigator as any).deviceMemory <= 4 ||
         window.screen.width <= 480;
};

// Get optimal configuration for current device
const getDeviceOptimizedConfig = (): Partial<ExportOptions> => {
  const isMobile = isMobileDevice();
  const isLowEnd = isLowEndDevice();
  const devicePixelRatio = window.devicePixelRatio || 1;

  if (isLowEnd) {
    return {
      scale: 1,
      quality: 0.8,
      format: 'jpeg'
    };
  }

  if (isMobile) {
    return {
      scale: Math.min(devicePixelRatio, 2),
      quality: 0.9,
      format: 'png'
    };
  }

  // Desktop - high quality
  return {
    scale: Math.min(devicePixelRatio, 3),
    quality: 1.0,
    format: 'png'
  };
};

// Main export function with mobile optimizations
export const exportCardAsImage = async (
  cardElement: HTMLElement,
  cardData: CardData,
  options: ExportOptions = {}
): Promise<string> => {
  const deviceConfig = getDeviceOptimizedConfig();
  const finalOptions = { ...deviceConfig, ...options };

  // Mobile-specific preparations
  const isMobile = isMobileDevice();
  let originalTransform = '';
  
  // Declare style variables for cleanup
  let originalTitleStyle = '';
  let originalRarityStyle = '';
  
  if (isMobile) {
    // Prevent scroll during generation
    document.body.style.overflow = 'hidden';
    
    // Fix potential transform issues on mobile
    originalTransform = cardElement.style.transform;
    cardElement.style.transform = 'translateZ(0)';
  }

  try {
    // Get actual card dimensions to avoid white space
    const rect = cardElement.getBoundingClientRect();
    const actualWidth = Math.round(rect.width);
    const actualHeight = Math.round(rect.height);
    
    console.log(`Capturing card: ${actualWidth}x${actualHeight}px`);
    
    // Temporarily apply html2canvas-specific centering fixes
    const titleElement = cardElement.querySelector('h1');
    const titleContainer = cardElement.querySelector('h1')?.parentElement;
    const rarityElement = cardElement.querySelector('[class*="absolute top-2 right-2"]');
    const seriesElement = cardElement.querySelector('[class*="bottom-2 left-2"]');
    const cardNumberElement = cardElement.querySelector('[class*="bottom-2 right-2"]');
    
    // Store original states
    let originalTitleClass = '';
    let originalTitleContainerStyle = '';
    let originalSeriesStyle = '';
    let originalCardNumberStyle = '';
    
    if (titleElement) {
      originalTitleStyle = titleElement.style.cssText;
      originalTitleClass = titleElement.className;
      
      // Remove truncate class and apply aggressive centering
      titleElement.className = originalTitleClass.replace('truncate', '').replace('whitespace-nowrap', '').replace('text-left', '').replace('text-right', '') + ' text-center';
      titleElement.style.cssText = 'text-align: center !important; display: block !important; width: 100% !important; margin: 0 auto !important; white-space: normal !important; text-overflow: clip !important; left: 0 !important; right: 0 !important; position: relative !important;' + (originalTitleStyle ? '; ' + originalTitleStyle : '');
    }
    
    if (titleContainer) {
      originalTitleContainerStyle = titleContainer.style.cssText;
      titleContainer.style.cssText = 'display: flex !important; justify-content: center !important; align-items: center !important; text-align: center !important; width: 100% !important;' + (originalTitleContainerStyle ? '; ' + originalTitleContainerStyle : '');
    }
    
    // Fix rarity - only center the text WITHIN the existing positioned box
    if (rarityElement) {
      originalRarityStyle = rarityElement.style.cssText;
      rarityElement.style.cssText += '; text-align: center !important; display: flex !important; align-items: center !important; justify-content: center !important;';
    }
    
    // Fix series watermark text centering - only center text within existing positioned container
    if (seriesElement) {
      originalSeriesStyle = seriesElement.style.cssText;
      seriesElement.style.cssText += '; text-align: center !important;';
    }
    
    // Fix card number watermark text centering - only center text within existing positioned container
    if (cardNumberElement) {
      originalCardNumberStyle = cardNumberElement.style.cssText;
      cardNumberElement.style.cssText += '; text-align: center !important;';
    }
    
    // Configure html2canvas for mobile compatibility
    const canvas = await html2canvas(cardElement, {
      scale: finalOptions.scale || 2,
      width: actualWidth,   // Use actual element width
      height: actualHeight, // Use actual element height
      useCORS: true,
      allowTaint: false,
      backgroundColor: null, // Transparent background to avoid padding
      
      // Mobile optimizations
      logging: false, // Disable console logs for performance
      removeContainer: true, // Clean up after render
      
      // Font rendering fixes
      fontEmbedCSS: true,
      skipAutoScale: isMobile, // Prevent auto-scaling issues on mobile
      
      // Cropping to exact element bounds
      x: 0,
      y: 0,
      
      // Performance optimizations
      ignoreElements: (element) => {
        // Always ignore download buttons and loading overlays
        if (element.tagName === 'BUTTON' || 
            element.classList.contains('animate-spin') ||
            element.classList.contains('z-40') ||
            element.classList.contains('z-50')) {
          return true;
        }
        
        // Skip heavy elements if low-end device
        if (isLowEndDevice()) {
          return element.tagName === 'VIDEO';
        }
        return false;
      }
    });

    // Convert to desired format
    const dataURL = canvas.toDataURL(
      finalOptions.format === 'jpeg' ? 'image/jpeg' : 'image/png',
      finalOptions.quality || 1.0
    );

    // Restore original styles
    if (titleElement) {
      titleElement.style.cssText = originalTitleStyle;
      titleElement.className = originalTitleClass;
    }
    if (titleContainer) {
      titleContainer.style.cssText = originalTitleContainerStyle;
    }
    if (rarityElement) {
      rarityElement.style.cssText = originalRarityStyle;
    }
    if (seriesElement) {
      seriesElement.style.cssText = originalSeriesStyle;
    }
    if (cardNumberElement) {
      cardNumberElement.style.cssText = originalCardNumberStyle;
    }

    return dataURL;

  } catch (error) {
    console.error('Card export failed:', error);
    
    // Restore original styles even on error
    const titleElement = cardElement.querySelector('h1');
    const titleContainer = cardElement.querySelector('h1')?.parentElement;
    const rarityElement = cardElement.querySelector('[class*="absolute top-2 right-2"]');
    const seriesElement = cardElement.querySelector('[class*="bottom-2 left-2"]');
    const cardNumberElement = cardElement.querySelector('[class*="bottom-2 right-2"]');
    
    if (titleElement && originalTitleStyle) {
      titleElement.style.cssText = originalTitleStyle;
      if (originalTitleClass) {
        titleElement.className = originalTitleClass;
      }
    }
    if (titleContainer && originalTitleContainerStyle) {
      titleContainer.style.cssText = originalTitleContainerStyle;
    }
    if (rarityElement && originalRarityStyle) {
      rarityElement.style.cssText = originalRarityStyle;
    }
    if (seriesElement && originalSeriesStyle) {
      seriesElement.style.cssText = originalSeriesStyle;
    }
    if (cardNumberElement && originalCardNumberStyle) {
      cardNumberElement.style.cssText = originalCardNumberStyle;
    }
    
    // Fallback for mobile errors - try with lower quality
    if (isMobile && finalOptions.scale! > 1) {
      console.warn('Retrying with lower quality settings...');
      return exportCardAsImage(cardElement, cardData, {
        ...finalOptions,
        scale: 1,
        quality: 0.7,
        format: 'jpeg'
      });
    }
    
    throw new Error(`Failed to export card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
  } finally {
    // Restore mobile settings
    if (isMobile) {
      document.body.style.overflow = '';
      cardElement.style.transform = originalTransform;
    }
  }
};

// Download function with mobile-friendly filename handling
export const downloadCardImage = async (
  cardElement: HTMLElement,
  cardData: CardData,
  options: ExportOptions = {}
): Promise<void> => {
  try {
    const dataURL = await exportCardAsImage(cardElement, cardData, options);
    
    // Generate filename
    const sanitizedTitle = cardData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = options.filename || `${sanitizedTitle}_${cardData.series}_${timestamp}`;
    const format = options.format || getDeviceOptimizedConfig().format || 'png';
    
    // Mobile-friendly download approach
    if (isMobileDevice()) {
      // On mobile, open in new tab for user to save manually
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${cardData.title} - ${cardData.series}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 20px; background: #000; text-align: center; }
                img { max-width: 100%; height: auto; border-radius: 12px; }
                p { color: white; font-family: Arial, sans-serif; margin: 20px 0; }
                .instructions { font-size: 14px; color: #ccc; }
              </style>
            </head>
            <body>
              <p>${cardData.title} - ${cardData.series}</p>
              <img src="${dataURL}" alt="${cardData.title}" />
              <p class="instructions">Long press the image to save to your device</p>
            </body>
          </html>
        `);
      }
    } else {
      // Desktop download
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

// Utility to get device info for debugging
export const getDeviceInfo = () => {
  return {
    isMobile: isMobileDevice(),
    isLowEnd: isLowEndDevice(),
    devicePixelRatio: window.devicePixelRatio,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory || 'unknown',
    recommendedConfig: getDeviceOptimizedConfig()
  };
};