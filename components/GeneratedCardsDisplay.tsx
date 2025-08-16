import React from 'react';
import type { CardData, ColorScheme } from '../types';
import CardPreview from './CardPreview';

interface GeneratedCardsDisplayProps {
  cards: CardData[];
  colorScheme: ColorScheme;
}

const GeneratedCardsDisplay: React.FC<GeneratedCardsDisplayProps> = ({ cards, colorScheme }) => {
  return (
    <div className="mt-12">
      <h2 className="text-4xl font-bold text-center text-orange-400 mb-8">Your Generated Cards</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card) => (
          <div key={card.id} className="flex flex-col items-center gap-4">
            <CardPreview
              cardData={card}
              colorScheme={colorScheme}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeneratedCardsDisplay;