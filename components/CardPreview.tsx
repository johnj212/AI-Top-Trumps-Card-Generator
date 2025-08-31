// Main CardPreview component
const CardPreview: React.FC<CardPreviewProps> = ({ cardData, colorScheme, isImageLoading = false }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Destructure cardData
  const { title, image, stats, series, cardNumber, totalCards, rarity } = cardData;
  // Responsive font size for title
  const titleFontSizeClass = title.length > 18 ? 'text-lg' : 'text-2xl';

  // Handle download with mobile-optimized settings
  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    try {
      await downloadCardImage(cardRef.current, cardData);
      console.log('Card exported successfully', getDeviceInfo());
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export card. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      {/* Export loading overlay */}
      {isExporting && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
            <span className="text-sm font-medium text-gray-700">Exporting card...</span>
          </div>
        </div>
      )}
      
      {/* Download button */}
      <button 
        onClick={handleDownload}
        disabled={isExporting || isImageLoading}
        className="absolute top-2 left-2 z-40 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
        title="Download card as image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </button>

      <div 
        ref={cardRef}
        className={`relative w-full aspect-[62/100] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${colorScheme.background} border-4 ${colorScheme.accent}`} 
        style={{fontFamily: "'Teko', sans-serif"}}
      >

      {/* Rarity Display */}
      <RarityDisplay rarity={rarity} accentBorderClass={colorScheme.accent} />

      {/* Image Section - fills most of the card */}
      <div className="w-full bg-gray-700 overflow-hidden relative flex-1">
        {isImageLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <img src={image} alt={title} className="object-cover w-full h-full" style={{ height: '100%', width: '100%' }} />
            {/* Subtle watermark overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
              <div className="text-white text-sm font-bold opacity-60 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                {series}
              </div>
              <div className="text-white text-sm font-bold opacity-60 bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                {cardNumber}/{totalCards}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Title and Stats box - compact bottom section */}
      <div className="w-full flex flex-col flex-shrink-0">
        {/* Title Banner */}
        <div className={`w-full bg-gray-900 px-4 py-2 flex items-center justify-center border-t-4 border-b-4 border-orange-500`}>
          <h1 className={`${titleFontSizeClass} font-bold uppercase text-center text-white whitespace-nowrap truncate`}>{title}</h1>
        </div>
        {/* Stats - 2 columns, scroll if overflow */}
        <div className="p-2 flex flex-row justify-center gap-2 bg-black border-t-0 border-orange-500 overflow-y-auto" style={{ maxHeight: 'calc(100% - 2.5rem)' }}>
          <div className="flex flex-col space-y-1 w-1/2">
            {stats.slice(0, 3).map((stat, index) => (
              <div key={index} className="grid grid-cols-5 gap-1 items-center text-xs">
                <span className={`col-span-2 font-roboto-condensed font-bold uppercase ${colorScheme.text}`}>{stat.name}</span>
                <div className="col-span-2">
                    <StatBar value={stat.value} color={colorScheme.primary} />
                </div>
                <span className={`col-span-1 font-bold text-right ${colorScheme.text}`}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col space-y-1 w-1/2">
            {stats.slice(3, 6).map((stat, index) => (
              <div key={index} className="grid grid-cols-5 gap-1 items-center text-xs">
                <span className={`col-span-2 font-roboto-condensed font-bold uppercase ${colorScheme.text}`}>{stat.name}</span>
                <div className="col-span-2">
                    <StatBar value={stat.value} color={colorScheme.primary} />
                </div>
                <span className={`col-span-1 font-bold text-right ${colorScheme.text}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};


import React, { useRef, useState } from 'react';
import type { CardData, ColorScheme, Rarity } from '../types';
import { downloadCardImage, getDeviceInfo } from '../utils/cardExport';

interface CardPreviewProps {
  cardData: CardData;
  colorScheme: ColorScheme;
  isImageLoading?: boolean;
}

const StatBar: React.FC<{ value: number, color: string }> = ({ value, color }) => {
    const width = `${Math.max(5, value)}%`;
    return (
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
            <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width }}></div>
        </div>
    );
};

const RarityDisplay: React.FC<{ rarity: Rarity, accentBorderClass: string }> = ({ rarity, accentBorderClass }) => {
  if (!rarity || rarity === 'Common') return null;
  const rarityConfig = {
    Rare: { text: 'RARE', stars: '★★', textColor: 'text-cyan-400', shadowColor: '#22d3ee' },
    Epic: { text: 'EPIC', stars: '★★★', textColor: 'text-purple-400', shadowColor: '#c084fc' },
    Legendary: { text: 'LEGENDARY', stars: '★★★★', textColor: 'text-yellow-400', shadowColor: '#facc15' },
  };
  const config = rarityConfig[rarity];
  const textShadow = (rarity === 'Epic' || rarity === 'Legendary') ? 
    `0 0 5px ${config.shadowColor}, 0 0 8px ${config.shadowColor}` : 'none';
  const style = {
    textShadow: textShadow,
  } as React.CSSProperties;
  return (
    <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 bg-black/70 rounded-md border-2 ${accentBorderClass} font-roboto-condensed`}>
      <div className={`flex items-center gap-2 ${config.textColor}`} style={style}>
        <span className="text-sm font-bold tracking-widest">{config.text}</span>
        <span className="text-base">{config.stars}</span>
      </div>
    </div>
  );
};

export default CardPreview;