
import React, { useState, useCallback, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import CardPreview from './components/CardPreview';
import GeneratedCardsDisplay from './components/GeneratedCardsDisplay';
import Loader from './components/Loader';
import LoginScreen from './components/auth/LoginScreen';
import PlayerProfile from './components/auth/PlayerProfile';
import { generateCardIdeas, generateImage, generateStatsValues } from './services/geminiService';
import { authService } from './services/authService';
import type { CardData, ColorScheme, ImageStyle, Theme, Rarity, AuthState, PlayerData } from './types';
import { COLOR_SCHEMES, DEFAULT_CARD_DATA, IMAGE_STYLES, THEMES } from './constants';

const getRandomRarity = (): Rarity => {
    const rand = Math.random() * 100;
    if (rand < 3) return 'Legendary'; // 3%
    if (rand < 15) return 'Epic';      // 12%
    if (rand < 40) return 'Rare';      // 25%
    return 'Common';                   // 60%
};

function App() {
  // Authentication state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    playerCode: undefined,
    token: undefined
  });
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Game state
  const [cardData, setCardData] = useState<CardData>(DEFAULT_CARD_DATA);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[1]);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(COLOR_SCHEMES[0]);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle>(IMAGE_STYLES[0]);
  
  const [generatedCards, setGeneratedCards] = useState<CardData[]>([]);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        const isValidToken = await authService.validateToken();
        if (isValidToken) {
          const currentPlayerData = authService.getPlayerData();
          if (currentPlayerData) {
            setAuthState({
              isAuthenticated: true,
              playerCode: currentPlayerData.playerCode,
              token: authService.getToken()
            });
            setPlayerData(currentPlayerData);
          }
        }
      }
      setIsAuthLoading(false);
    };

    initAuth();
  }, []);

  // Authentication handlers
  const handleLogin = (loginPlayerData: PlayerData) => {
    setAuthState({
      isAuthenticated: true,
      playerCode: loginPlayerData.playerCode,
      token: authService.getToken()
    });
    setPlayerData(loginPlayerData);
    setError(null);
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      playerCode: undefined,
      token: undefined
    });
    setPlayerData(null);
    // Clear game state
    setGeneratedCards([]);
    setPreviewCard(null);
    setCardData(DEFAULT_CARD_DATA);
  };

  const handleAuthError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleThemeChange = useCallback(async (theme: Theme) => {
      setSelectedTheme(theme);
      setIsLoading(true);
      setLoadingMessage(`Setting up ${theme.name} stats...`);
      try {
          // Use predefined stats from the theme, generate only the values
          const newStats = await generateStatsValues(theme.stats);
          // Auto-generate series name based on theme
          const autoSeries = `${theme.name} Collection`;
          setCardData(prev => ({
              ...prev,
              series: autoSeries,
              stats: newStats
          }));
          setPreviewCard(null); // Reset preview when theme changes
          setGeneratedCards([]); // Clear old cards
      } catch (e: any) {
          setError(e.message || 'An unknown error occurred.');
      } finally {
          setIsLoading(false);
      }
  }, []);

  const handleGeneratePreview = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedCards([]);
    setPreviewCard(null);
    setLoadingMessage('Generating preview card idea...');

    try {
      const cardIdeas = await generateCardIdeas(selectedTheme.name, selectedImageStyle, cardData.stats, 1);
      const cardIdea = cardIdeas && cardIdeas.length > 0 ? cardIdeas[0] : undefined;
      if (!cardIdea || !cardIdea.title || !cardIdea.imagePrompt || !Array.isArray(cardIdea.stats)) {
        setError('Failed to generate a valid card idea. Please try again.');
        return;
      }
      const cardId = `card-preview-${Date.now()}`;
      const series = `${selectedTheme.name} Collection`;
      
      setLoadingMessage(`Generating image for ${cardIdea.title}...`);
      const imageBase64 = await generateImage(cardIdea.imagePrompt, cardId, series);

      const newPreviewCardData = {
        id: cardId,
        title: cardIdea.title,
        series: series,
        image: `data:image/jpeg;base64,${imageBase64}`,
        stats: cardIdea.stats,
        rarity: getRandomRarity(),
        cardNumber: 1,
        totalCards: 4,
      };

      setCardData(newPreviewCardData); // Update the live preview
      setPreviewCard(newPreviewCardData); // Save for the final pack

    } catch (e: any) {
      setError(e.message || 'An unknown error occurred during preview generation.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGeneratePack = async () => {
    if (!previewCard) {
        setError("Please generate a preview card first.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedCards([]);
    setLoadingMessage('Generating rest of pack...');

    try {
        const newCards: CardData[] = [previewCard]; // Start with the preview card

        // Generate 3 additional cards one at a time
        for (let i = 0; i < 3; i++) {
          setLoadingMessage(`Generating card ${i + 2} of 4...`);
          
          // Generate a single card idea
          const cardIdeas = await generateCardIdeas(selectedTheme.name, selectedImageStyle, cardData.stats, 1, previewCard.title);
          const cardIdea = cardIdeas && cardIdeas.length > 0 ? cardIdeas[0] : undefined;
          
          if (!cardIdea || !cardIdea.title || !cardIdea.imagePrompt || !Array.isArray(cardIdea.stats)) {
            console.warn(`Failed to generate card ${i + 2}, skipping...`);
            continue;
          }
          
          const cardId = `card-${Date.now()}-${i}`;
          const series = `${selectedTheme.name} Collection`;
          
          setLoadingMessage(`Generating image for ${cardIdea.title}... (${i + 2}/4)`);
          const imageBase64 = await generateImage(cardIdea.imagePrompt, cardId, series);

          newCards.push({
            id: cardId,
            title: cardIdea.title,
            series: series,
            image: `data:image/jpeg;base64,${imageBase64}`,
            stats: cardIdea.stats,
            rarity: getRandomRarity(),
            cardNumber: i + 2, // Start from card 2
            totalCards: 4,
          });
        }

        setGeneratedCards(newCards);

    } catch (e: any) {
        setError(e.message || 'An unknown error occurred during pack generation.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };


  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader message="Loading..." />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onError={handleAuthError} />
        
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg relative z-50" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-white" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}
      </>
    );
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      {isLoading && <Loader message={loadingMessage} />}
      
      {error && (
        <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg relative mb-6 max-w-4xl mx-auto" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-white" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      {/* Player Profile */}
      {playerData && (
        <PlayerProfile playerData={playerData} onLogout={handleLogout} />
      )}

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <div className="lg:order-1">
          <ControlPanel
            cardData={cardData}
            setCardData={setCardData}
            selectedTheme={selectedTheme}
            setSelectedTheme={setSelectedTheme}
            selectedColorScheme={selectedColorScheme}
            setSelectedColorScheme={setSelectedColorScheme}
            selectedImageStyle={selectedImageStyle}
            setSelectedImageStyle={setSelectedImageStyle}
            onGeneratePreview={handleGeneratePreview}
            onGeneratePack={handleGeneratePack}
            isLoading={isLoading}
            isPreviewGenerated={!!previewCard}
            onThemeChange={handleThemeChange}
          />
        </div>
        <div className="lg:order-2 flex flex-col items-center justify-start">
            <h3 className="text-2xl font-bold text-gray-300 mb-4">Live Preview</h3>
            <CardPreview cardData={cardData} colorScheme={selectedColorScheme} />
        </div>
      </main>

      {generatedCards.length > 0 && (
         <section className="max-w-7xl mx-auto">
            <GeneratedCardsDisplay cards={generatedCards} colorScheme={selectedColorScheme} />
         </section>
      )}

       <footer className="text-center text-gray-500 mt-12">
        <p>Built with Love.</p>
      </footer>
    </div>
  );
}

export default App;
