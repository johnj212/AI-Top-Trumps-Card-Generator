import React, { useState } from 'react';
import { authService } from '../../services/authService';
import type { PlayerData } from '../../types';

interface LoginScreenProps {
  onLogin: (playerData: PlayerData) => void;
  onError: (error: string) => void;
}

// Deterministic star positions for background
const LOGIN_STARS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  top:      `${(i * 17 + 3) % 95}%`,
  left:     `${(i * 29 + 11) % 95}%`,
  size:     `${2 + (i % 3)}px`,
  delay:    `${((i * 0.4) % 2.5).toFixed(1)}s`,
  duration: `${1.8 + (i % 2) * 0.8}s`,
}));

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onError }) => {
  const [playerCode, setPlayerCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerCode.trim()) {
      onError('Please enter your player code');
      return;
    }

    onError('');
    setLocalError('');
    setIsLoading(true);

    try {
      const result = await authService.login(playerCode.trim());

      if (result.success && result.playerData) {
        setLocalError('');
        onLogin(result.playerData);
      } else {
        const errorMessage = result.error || 'Login failed. Please check your player code.';
        setLocalError(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setLocalError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 10);
    setPlayerCode(value);
  };

  return (
    <div className="min-h-[100dvh] bg-arcade-deep flex items-center justify-center p-4 relative overflow-hidden">

      {/* Star particles */}
      {LOGIN_STARS.map(s => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animation: `starTwinkle ${s.duration} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}

      {/* Arcade grid */}
      <div className="absolute inset-0 arcade-grid-bg pointer-events-none" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Hero section */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 inline-block animate-bounce">🃏</div>
          <h1 className="font-fredoka text-5xl text-arcade-primary neon-text-purple leading-tight">
            Top Trumps AI
          </h1>
          <p className="font-nunito text-arcade-dim mt-2 text-base">
            Card Generator
          </p>
        </div>

        {/* Form panel */}
        <div className="bg-arcade-card/90 backdrop-blur-sm border-2 border-arcade-primary/40 rounded-2xl p-8 shadow-2xl shadow-arcade-primary/20">

          <div className="text-center mb-6">
            <h2 className="font-fredoka text-2xl text-arcade-text">
              Enter Player Code
            </h2>
            <p className="font-nunito text-arcade-dim text-sm mt-1">
              Type your code to start generating cards!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                id="playerCode"
                type="text"
                value={playerCode}
                onChange={handleInputChange}
                placeholder="PLAYER1"
                className="w-full px-6 py-4 bg-arcade-panel border-2 border-arcade-primary/50 rounded-xl text-arcade-text text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:border-arcade-primary transition-all placeholder-arcade-dim/50 disabled:opacity-50"
                style={{
                  fontSize: '24px',
                  boxShadow: playerCode ? '0 0 20px rgba(108, 99, 255, 0.3)' : 'none',
                }}
                disabled={isLoading}
                maxLength={10}
                autoComplete="off"
                autoCapitalize="characters"
              />
            </div>

            {localError && (
              <div className="bg-red-900/80 border-2 border-red-500 text-white px-4 py-3 rounded-xl font-nunito text-sm" role="alert">
                ⚠️ {localError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || playerCode.length === 0}
              className="w-full py-4 px-6 rounded-xl font-fredoka text-xl text-white transition-all
                bg-arcade-accent hover:bg-[#ff8555]
                disabled:bg-arcade-panel disabled:text-arcade-dim disabled:cursor-not-allowed
                hover:shadow-[0_0_24px_rgba(255,107,53,0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging In...
                </span>
              ) : (
                '🚀 Start Playing'
              )}
            </button>
          </form>

          {/* Help section */}
          <div className="mt-6 pt-5 border-t border-arcade-primary/20">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="font-nunito text-arcade-dim hover:text-arcade-text text-sm underline w-full text-center transition-colors"
            >
              Need help? Click for hint
            </button>

            {showHint && (
              <div className="mt-4 p-4 bg-arcade-panel rounded-xl border border-arcade-primary/20 font-nunito text-sm">
                <p className="text-arcade-dim">
                  <span className="font-bold text-arcade-accent">Need a player code?</span>
                  <br />
                  Player codes are letters and numbers. Ask an admin to get yours!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center font-nunito text-arcade-dim text-xs mt-6">
          🔒 Your privacy is protected. No personal data collected.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
