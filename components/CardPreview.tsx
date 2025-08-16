import React from 'react';
import type { CardData, ColorScheme, Rarity } from '../types';

interface CardPreviewProps {
  cardData: CardData;
  colorScheme: ColorScheme;
  isImageLoading?: boolean;
  cardRef?: React.RefObject<HTMLDivElement>;
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
        <div className={`absolute top-14 right-2 z-10 px-2 py-0.5 bg-black/70 rounded-md border-2 ${accentBorderClass} font-roboto-condensed`}>
            <div className={`flex items-center gap-2 ${config.textColor}`} style={style}>
                <span className="text-sm font-bold tracking-widest">{config.text}</span>
                <span className="text-base">{config.stars}</span>
            </div>
        </div>
    );
};


const CardPreview: React.FC<CardPreviewProps> = ({ cardData, colorScheme, isImageLoading = false, cardRef }) => {
  const { title, series, image, stats, cardNumber, totalCards, rarity } = cardData;

  const getTitleFontSize = (titleText: string): string => {
    const len = titleText.length;
    if (len <= 18) return 'text-3xl';
    if (len <= 24) return 'text-2xl';
    return 'text-xl';
  };
  const titleFontSizeClass = getTitleFontSize(title);

  // 62mm x 100mm is approx 1:1.61 ratio. Let's use that for aspect ratio.
  return (
    <div ref={cardRef} className={`w-full max-w-sm aspect-[62/100] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${colorScheme.background} border-4 ${colorScheme.accent}`} style={{fontFamily: "'Teko', sans-serif"}}>
      {/* Image & Overlays Container */}
      <div className="relative w-full bg-gray-700 flex-grow min-h-0">
        
        {/* Header Overlay - NOW CONTAINS SERIES */}
        <div className={`absolute top-0 left-0 right-0 ${colorScheme.primary} bg-opacity-70 px-4 py-1 flex justify-between items-center z-10`}>
          <h2 className={`text-2xl font-bold uppercase tracking-wider text-shadow-lg whitespace-nowrap truncate pr-2`}>{series}</h2>
          <div className="text-lg font-bold text-right flex-shrink-0">
            <div>{cardNumber}/{totalCards}</div>
          </div>
        </div>

        <RarityDisplay rarity={rarity} accentBorderClass={colorScheme.accent} />
        {isImageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        ) : (
            <img src={image} alt={title} className="w-full h-full object-cover" />
        )}
         {/* Title Banner - NOW CONTAINS TITLE */}
         <div className={`absolute bottom-0 left-0 right-0 ${colorScheme.secondary} bg-opacity-70 px-4 py-1 z-10`}>
            <h1 className={`${titleFontSizeClass} font-bold uppercase text-center ${colorScheme.text} whitespace-nowrap truncate`}>{title}</h1>
        </div>
      </div>
      
      {/* Stats */}
      <div className="p-3 flex flex-col justify-center space-y-1">
        {stats.map((stat, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 items-center">
            <span className={`col-span-2 font-roboto-condensed font-bold uppercase ${colorScheme.text} text-base`}>{stat.name}</span>
            <div className="col-span-2">
                <StatBar value={stat.value} color={colorScheme.primary} />
            </div>
            <span className={`col-span-1 text-xl font-bold text-right ${colorScheme.text}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardPreview;