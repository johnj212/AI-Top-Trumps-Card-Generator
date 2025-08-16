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
      // To ensure a high-resolution image while preserving the exact aspect ratio,
      // we calculate a pixelRatio based on the card's rendered width.
      // We aim for a target width of 732px (approx 300 DPI for a standard card).
      const targetWidth = 732;
      const sourceWidth = cardElement.offsetWidth;
      const pixelRatio = targetWidth / sourceWidth;

      const dataUrl = await htmlToImage.toPng(cardElement, {
        quality: 1,
        pixelRatio: pixelRatio,
      });

      const link = document.createElement('a');
      link.download = `${card.series}-${card.title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Oops, something went wrong!', error);
      alert('An error occurred while trying to generate the card image for download. Please check the console for details.');
    }
  };

  if (cards.length === 0) {
    return null;
  }

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
};

export default GeneratedCardsDisplay;