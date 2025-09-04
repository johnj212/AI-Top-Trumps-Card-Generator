import React, { useState, useRef } from 'react';
import type { CardData, ColorScheme } from '../types';
import CardPreview from './CardPreview';
import { exportCardAsImage, getDeviceInfo, downloadCardImage } from '../utils/cardExport';

interface GeneratedCardsDisplayProps {
  cards: CardData[];
  colorScheme: ColorScheme;
}

const GeneratedCardsDisplay: React.FC<GeneratedCardsDisplayProps> = ({ cards, colorScheme }) => {
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Bulk download all cards with mobile optimization
  const handleBulkDownload = async () => {
    const deviceInfo = getDeviceInfo();
    const isMobile = deviceInfo.isMobile;
    
    // Show confirmation dialog for mobile users to explain the process
    if (isMobile) {
      const confirmed = window.confirm(
        `You're about to download ${cards.length} cards. On mobile devices, you may be prompted to save each card individually. This is normal and prevents popup blocking issues. Continue?`
      );
      if (!confirmed) return;
    }
    
    setIsBulkExporting(true);
    try {
      console.log('Starting bulk export with device info:', deviceInfo);
      
      // On mobile devices, process cards one by one to prevent memory issues
      const batchSize = isMobile ? 1 : 2; // Process 1-2 cards at a time
      
      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (card, batchIndex) => {
            const cardIndex = i + batchIndex;
            const cardElement = cardRefs.current[cardIndex];
            
            if (!cardElement) {
              console.warn(`Card element not found for index ${cardIndex}`);
              return;
            }
            
            try {
              // Use the improved downloadCardImage function that handles mobile properly
              await downloadCardImage(cardElement, card, {
                filename: `${card.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${card.series}_${card.cardNumber}`
              });
              
              // Small delay between downloads to prevent browser throttling
              await new Promise(resolve => setTimeout(resolve, 500));
              
            } catch (error) {
              console.error(`Failed to export card ${card.title}:`, error);
            }
          })
        );
        
        // Longer delay between batches on mobile to prevent memory issues
        if (isMobile && i + batchSize < cards.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Some cards failed to export. Please try downloading individual cards.');
    } finally {
      setIsBulkExporting(false);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-orange-400 mb-4 sm:mb-0">Your Generated Cards</h2>
        
        {/* Bulk download button */}
        <button
          onClick={handleBulkDownload}
          disabled={isBulkExporting || cards.length === 0}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed"
          title="Download all cards"
        >
          {isBulkExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
              <span>Download All ({cards.length})</span>
            </>
          )}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card, index) => (
          <div key={card.id} className="flex flex-col items-center gap-4">
            <div ref={(el) => cardRefs.current[index] = el}>
              <CardPreview
                cardData={card}
                colorScheme={colorScheme}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeneratedCardsDisplay;