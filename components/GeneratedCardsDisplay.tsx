import React, { useRef, createRef } from 'react';
import * as htmlToImage from 'html-to-image';
import type { CardData, ColorScheme } from '../types';
import CardPreview from './CardPreview';
import { DownloadIcon } from './icons';

interface GeneratedCardsDisplayProps {
  cards: CardData[];
  colorScheme: ColorScheme;
}

const GeneratedCardsDisplay: React.FC<GeneratedCardsDisplayProps> = ({ cards, colorScheme }) => {
  const cardRefs = useRef(cards.map(() => createRef<HTMLDivElement>()));

  const handleDownload = async (card: CardData, index: number) => {
    const cardElement = cardRefs.current[index].current;
    if (!cardElement) {
      console.error("Card element not found for download.");
      return;
    }
    try {
      // Wait for image and header to load (especially on mobile)
      const img = cardElement.querySelector('img');
      if (img && !img.complete) {
        await new Promise(resolve => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
      }
      // Wait for header to be visible
      const header = cardElement.querySelector('h2');
      if (header && header.offsetHeight === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Short delay to ensure DOM is painted (especially on mobile)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use fixed pixel size and devicePixelRatio for download
  // Ensure aspect ratio is always 1:1.61 (width:height)
  const targetWidth = 732;
  const targetHeight = Math.round(targetWidth * 1.61); // 1:1.61 aspect ratio
      const pixelRatio = window.devicePixelRatio || 2;

      // Force fixed size for download
      cardElement.style.width = `${targetWidth}px`;
      cardElement.style.height = `${targetHeight}px`;

      const dataUrl = await htmlToImage.toPng(cardElement, {
        quality: 1,
        width: targetWidth,
        height: targetHeight,
        pixelRatio,
        style: {
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
        },
      });

      // Restore style
      cardElement.style.width = '';
      cardElement.style.height = '';

      const link = document.createElement('a');
      link.download = `${card.series}-${card.title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Oops, something went wrong!', error);
      alert('An error occurred while trying to generate the card image for download. Please check the console for details.');
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-4xl font-bold text-center text-orange-400 mb-8">Your Generated Cards</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card, index) => (
          <div key={card.id} className="flex flex-col items-center gap-4">
            <CardPreview
              cardRef={cardRefs.current[index]}
              cardData={card}
              colorScheme={colorScheme}
            />
            <button
              onClick={() => handleDownload(card, index)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-bold transition-colors"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default GeneratedCardsDisplay;