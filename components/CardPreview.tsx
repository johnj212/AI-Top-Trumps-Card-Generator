import React, { useRef, useState } from 'react';
import type { CardData, ColorScheme, Rarity } from '../types';
import { downloadCardImage, getDeviceInfo } from '../utils/cardExport';

interface CardPreviewProps {
  cardData: CardData;
  colorScheme: ColorScheme;
  isImageLoading?: boolean;
  hideDownloadButton?: boolean;
  isNew?: boolean;
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
  const style = { textShadow } as React.CSSProperties;
  return (
    <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 bg-black/70 rounded-md border-2 ${accentBorderClass} font-roboto-condensed`}>
      <div className={`flex items-center gap-2 ${config.textColor}`} style={style}>
        <span className="text-sm font-bold tracking-widest">{config.text}</span>
        <span className="text-base">{config.stars}</span>
      </div>
    </div>
  );
};

// Main CardPreview component
const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  colorScheme,
  isImageLoading = false,
  hideDownloadButton = false,
  isNew = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Destructure cardData
  const { title, image, stats, series, rarity } = cardData;
  const titleFontSizeClass = title.length > 18 ? 'text-lg' : 'text-2xl';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    const y = -((e.clientX - rect.left) / rect.width - 0.5) * 10;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

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

  const showHolographic = rarity === 'Legendary' || rarity === 'Epic';

  return (
    <div
      className={`relative w-full max-w-sm card-3d-container ${isNew ? 'glow-pulse rounded-2xl' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D tilt wrapper */}
      <div
        className="card-3d-inner"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Holographic shimmer overlay (outside cardRef — won't appear in PNG export) */}
        {showHolographic && (
          <div className="absolute inset-0 rounded-2xl holographic-shimmer z-20" />
        )}

        {/* Export loading overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl z-50 flex items-center justify-center">
            <div className="bg-arcade-panel border border-arcade-primary rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-arcade-primary/30 border-t-arcade-primary rounded-full animate-spin" />
              <span className="font-nunito text-arcade-text text-sm">Saving...</span>
            </div>
          </div>
        )}

        {/* Download button — bottom-right, arcade styled */}
        {!hideDownloadButton && (
          <button
            onClick={handleDownload}
            disabled={isExporting || isImageLoading}
            className="absolute bottom-3 right-3 z-40 bg-arcade-accent hover:bg-[#ff8555] disabled:bg-arcade-dim text-white rounded-xl px-3 py-2 shadow-xl font-nunito text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 hover:shadow-arcade-accent/40"
            title="Download card as image"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Save
          </button>
        )}

        {/* ====================================================
            CARD REF — this is what gets exported to PNG
            DO NOT change anything inside this div
            ==================================================== */}
        <div
          ref={cardRef}
          className={`relative w-full aspect-[62/100] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${colorScheme.background} border-4 ${colorScheme.accent}`}
          style={{fontFamily: "'Teko', sans-serif"}}
        >
          {/* Rarity Display */}
          <RarityDisplay rarity={rarity} accentBorderClass={colorScheme.accent} />

          {/* Image Section */}
          <div className="w-full bg-gray-700 overflow-hidden relative flex-1">
            {isImageLoading ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                <img src={image} alt={title} className="object-cover w-full h-full" style={{ height: '100%', width: '100%' }} />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <div className="text-white text-sm font-bold opacity-60 bg-black/30 px-2 py-1 rounded backdrop-blur-sm text-center">
                    {series}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Title and Stats */}
          <div className="w-full flex flex-col flex-shrink-0">
            <div className={`w-full bg-gray-900 px-4 py-2 flex items-center justify-center border-t-4 border-b-4 ${colorScheme.accent}`}>
              <h1 className={`${titleFontSizeClass} font-bold uppercase text-center text-white whitespace-nowrap truncate`}>{title}</h1>
            </div>
            <div className={`p-2 flex flex-row justify-center gap-2 bg-black border-t-0 ${colorScheme.accent} overflow-y-auto`} style={{ maxHeight: 'calc(100% - 2.5rem)' }}>
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
        {/* ====================================================
            END CARD REF
            ==================================================== */}
      </div>
    </div>
  );
};

export default CardPreview;
