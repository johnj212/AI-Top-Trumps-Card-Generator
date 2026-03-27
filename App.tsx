
import React, { useState, useEffect } from 'react';
import CardPreview from './components/CardPreview';
import GeneratedCardsDisplay from './components/GeneratedCardsDisplay';
import CardLibrary from './components/CardLibrary';
import AgentChat from './components/AgentChat';
import Loader from './components/Loader';
import LoginScreen from './components/auth/LoginScreen';
import PlayerProfile from './components/auth/PlayerProfile';
import { authService } from './services/authService';
import { cardRecreationService, type RecreatedCard } from './services/cardRecreationService';
import type { CardData, ColorScheme, ImageStyle, AuthState, PlayerData } from './types';
import { COLOR_SCHEMES, IMAGE_STYLES } from './constants';

type AppTab = 'chat' | 'library';

// Deterministic star positions (avoids Math.random during render)
const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  top:      `${(i * 13 + 7) % 97}%`,
  left:     `${(i * 23 + 5) % 97}%`,
  size:     `${2 + (i % 3)}px`,
  delay:    `${((i * 0.3) % 3).toFixed(1)}s`,
  duration: `${2 + (i % 2)}s`,
}));

function App() {
  // Authentication state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    playerCode: undefined
  });
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // UI state
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(COLOR_SCHEMES[0]);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle>(IMAGE_STYLES[0]);
  const [generatedCards, setGeneratedCards] = useState<CardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCardLibraryOpen, setIsCardLibraryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('chat');

  // Check for existing authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        const isValidToken = await authService.validateToken();
        if (isValidToken) {
          const currentPlayerData = authService.getPlayerData();
          if (currentPlayerData) {
            setAuthState({ isAuthenticated: true, playerCode: currentPlayerData.playerCode });
            setPlayerData(currentPlayerData);
          }
        }
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = (loginPlayerData: PlayerData) => {
    setAuthState({ isAuthenticated: true, playerCode: loginPlayerData.playerCode });
    setPlayerData(loginPlayerData);
    setError(null);
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuthState({ isAuthenticated: false, playerCode: undefined });
    setPlayerData(null);
    setGeneratedCards([]);
  };

  const handleAuthError = (errorMessage: string) => {
    setError(errorMessage || null);
  };

  const handleLoadCard = (recreatedCard: RecreatedCard) => {
    setGeneratedCards(prev => [recreatedCard.cardData, ...prev]);
    setIsCardLibraryOpen(false);
    setActiveTab('chat');
  };

  const handleTabChange = (tab: AppTab) => {
    if (tab === 'library') {
      setIsCardLibraryOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Loading auth check
  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] bg-arcade-deep flex items-center justify-center">
        <Loader message="Loading..." />
      </div>
    );
  }

  // Login screen
  if (!authState.isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onError={handleAuthError} />
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border-2 border-red-500 text-white px-4 py-3 rounded-xl shadow-xl max-w-sm w-[calc(100%-2rem)] animate-bounce-in">
            <strong className="font-nunito font-bold">Error: </strong>
            <span className="font-nunito">{error}</span>
            <button className="absolute top-2 right-2 text-white/70 hover:text-white" onClick={() => setError(null)}>✕</button>
          </div>
        )}
      </>
    );
  }

  // Main app
  return (
    <div className="min-h-[100dvh] bg-arcade-deep text-arcade-text relative overflow-x-hidden">

      {/* Star particle background */}
      {STARS.map(s => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none z-0"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animation: `starTwinkle ${s.duration} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}

      {/* Arcade grid overlay */}
      <div className="fixed inset-0 arcade-grid-bg pointer-events-none z-0" />

      {/* Top Bar */}
      <header
        className="fixed top-0 inset-x-0 z-30 h-14 bg-arcade-deep/95 backdrop-blur-sm border-b border-arcade-primary/30 flex items-center justify-between px-4"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <span className="font-fredoka text-xl text-arcade-primary neon-text-purple">
            Top Trumps AI
          </span>
        </div>
        {playerData && (
          <PlayerProfile playerData={playerData} onLogout={handleLogout} compact />
        )}
      </header>

      {/* Error toast */}
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border-2 border-red-500 text-white px-4 py-3 rounded-xl shadow-xl max-w-sm w-[calc(100%-2rem)] animate-bounce-in">
          <strong className="font-nunito font-bold">Error: </strong>
          <span className="font-nunito text-sm">{error}</span>
          <button className="absolute top-2 right-2 text-white/70 hover:text-white" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 min-h-[100dvh] pt-14 pb-20 lg:pb-0">
        <div className="max-w-[1400px] mx-auto px-4 py-4 lg:py-6 lg:grid lg:grid-cols-[420px,1fr] lg:gap-8">

          {/* Left panel — AgentChat (always shown, just hidden on mobile when library tab active) */}
          <div className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] scroll-container">
            {/* Desktop player profile (above chat on large screens) */}
            <div className="hidden lg:block mb-4">
              {playerData && (
                <PlayerProfile playerData={playerData} onLogout={handleLogout} />
              )}
            </div>

            <AgentChat
              onCardsGenerated={(cards) => setGeneratedCards(prev => [...prev, ...cards])}
              onStyleResolved={(cs, is) => {
                setSelectedColorScheme(cs);
                setSelectedImageStyle(is);
              }}
            />
          </div>

          {/* Right panel — generated cards */}
          <div className="mt-6 lg:mt-0">
            {generatedCards.length > 0 ? (
              <GeneratedCardsDisplay
                cards={generatedCards}
                colorScheme={selectedColorScheme}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 lg:py-24">
                <span className="text-7xl mb-6 animate-bounce">🎴</span>
                <p className="font-fredoka text-2xl text-arcade-primary neon-text-purple mb-2">
                  Your cards appear here
                </p>
                <p className="font-nunito text-arcade-dim text-sm">
                  Chat with the AI agent to generate your first card pack!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bottom-nav bg-arcade-deep/95 backdrop-blur-sm border-t border-arcade-primary/30">
        <div className="grid grid-cols-2 h-16">
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'chat' ? 'text-arcade-primary' : 'text-arcade-dim'
            }`}
          >
            <span className="text-xl">💬</span>
            <span className="font-nunito text-xs font-bold">Chat</span>
          </button>
          <button
            onClick={() => handleTabChange('library')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isCardLibraryOpen ? 'text-arcade-primary' : 'text-arcade-dim'
            }`}
          >
            <span className="text-xl">📚</span>
            <span className="font-nunito text-xs font-bold">My Cards</span>
          </button>
        </div>
      </nav>

      {/* Card Library Modal */}
      <CardLibrary
        isOpen={isCardLibraryOpen}
        onClose={() => setIsCardLibraryOpen(false)}
        onCardSelect={handleLoadCard}
      />
    </div>
  );
}

export default App;
