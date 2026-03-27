
import React from 'react';

interface LoaderProps {
  message: string;
}

const FUN_SUFFIXES = ['✨', '🎴', '⚡', '🌟', '🎲'];

const Loader: React.FC<LoaderProps> = ({ message }) => {
  // Pick a suffix deterministically from the message length
  const suffix = FUN_SUFFIXES[message.length % FUN_SUFFIXES.length];

  return (
    <div className="fixed inset-0 bg-arcade-deep/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">

      {/* Stacked card-flip animation */}
      <div className="relative w-24 h-32 mb-8">
        {/* Stack shadow cards */}
        {[3, 2, 1].map(i => (
          <div
            key={i}
            className="absolute inset-0 rounded-2xl border-2 border-arcade-primary/30 bg-arcade-card"
            style={{ transform: `translate(${-i * 5}px, ${-i * 5}px)`, zIndex: 4 - i }}
          />
        ))}
        {/* Flipping top card */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-arcade-primary bg-gradient-to-br from-arcade-primary to-arcade-cyan z-10 flex items-center justify-center text-4xl shadow-xl shadow-arcade-primary/40"
          style={{ animation: 'cardFlip 1.2s ease-in-out infinite' }}
        >
          🃏
        </div>
      </div>

      {/* Message */}
      <p className="font-fredoka text-2xl text-arcade-primary neon-text-purple text-center px-8 mb-2">
        {message || 'Loading...'} {suffix}
      </p>
      <p className="font-nunito text-arcade-dim text-sm mb-4">Please wait...</p>

      {/* Pulsing dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-arcade-primary animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Loader;
