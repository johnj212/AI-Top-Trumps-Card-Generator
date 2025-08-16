// Main CardPreview component
const CardPreview: React.FC<CardPreviewProps> = ({ cardData, colorScheme, isImageLoading = false, cardRef }) => {
  // Destructure cardData
  const { title, image, stats, series, cardNumber, totalCards, rarity } = cardData;
  // Responsive font size for title
  const titleFontSizeClass = title.length > 18 ? 'text-lg' : 'text-2xl';

  return (
    <div ref={cardRef} className={`w-full max-w-sm aspect-[62/100] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${colorScheme.background} border-4 ${colorScheme.accent}`} style={{fontFamily: "'Teko', sans-serif"}}>
      {/* Solid Series Header Bar */}
      <div className={`w-full ${colorScheme.primary} px-4 py-2 flex justify-between items-center`}>
        <h2 className={`text-2xl font-bold uppercase tracking-wider text-shadow-lg whitespace-nowrap truncate pr-2`}>{series}</h2>
        <div className="text-lg font-bold text-right flex-shrink-0">
          <div>{cardNumber}/{totalCards}</div>
        </div>
      </div>

      {/* Rarity Display */}
      <RarityDisplay rarity={rarity} accentBorderClass={colorScheme.accent} />

      {/* Image Section - fills most of card, overlays title/stats at bottom */}
      <div className="w-full relative flex-1 flex justify-center items-center bg-gray-700" style={{ minHeight: '0', height: '100%', overflow: 'hidden' }}>
        {isImageLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <img src={image} alt={title} className="object-cover w-full h-full" style={{ height: '100%', width: '100%' }} />
        )}

        {/* Title and Stats overlay at absolute bottom of image */}
        <div className="absolute bottom-0 left-0 w-full">
          {/* Title Banner */}
          <div className={`w-full bg-gray-900 px-4 py-2 flex items-center justify-center border-t-4 border-b-4 border-orange-500`}>
            <h1 className={`${titleFontSizeClass} font-bold uppercase text-center text-white whitespace-nowrap truncate`}>{title}</h1>
          </div>
          {/* Stats - 2 columns */}
          <div className="p-3 flex flex-row justify-center gap-4 bg-black border-t-0 border-orange-500">
            <div className="flex flex-col space-y-2 w-1/2">
              {stats.slice(0, 3).map((stat, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-center">
                  <span className={`col-span-2 font-roboto-condensed font-bold uppercase ${colorScheme.text} text-base`}>{stat.name}</span>
                  <div className="col-span-2">
                      <StatBar value={stat.value} color={colorScheme.primary} />
                  </div>
                  <span className={`col-span-1 text-xl font-bold text-right ${colorScheme.text}`}>{stat.value}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col space-y-2 w-1/2">
              {stats.slice(3, 6).map((stat, index) => (
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
        </div>
      </div>
    </div>
  );
};


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

export default CardPreview;