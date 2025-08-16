
import React, { useState, useCallback, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import ControlPanel from './components/ControlPanel';
import CardPreview from './components/CardPreview';
import GeneratedCardsDisplay from './components/GeneratedCardsDisplay';
import Loader from './components/Loader';
import { generateCardIdeas, generateImage, generateStatsForTheme } from './services/geminiService';
import type { CardData, ColorScheme, ImageStyle, Theme, Rarity } from './types';
import { COLOR_SCHEMES, DEFAULT_CARD_DATA, IMAGE_STYLES, THEMES } from './constants';
import { DownloadIcon } from './components/icons';

const getRandomRarity = (): Rarity => {
    const rand = Math.random() * 100;
    if (rand < 3) return 'Legendary'; // 3%
    if (rand < 15) return 'Epic';      // 12%
    if (rand < 40) return 'Rare';      // 25%
    return 'Common';                   // 60%
};

function App() {
  const [cardData, setCardData] = useState<CardData>(DEFAULT_CARD_DATA);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[1]);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(COLOR_SCHEMES[0]);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle>(IMAGE_STYLES[0]);
  
  const [generatedCards, setGeneratedCards] = useState<CardData[]>([]);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  const handleThemeChange = useCallback(async (theme: Theme) => {
      setSelectedTheme(theme);
      setIsLoading(true);
      setLoadingMessage(`Getting stats for ${theme.name}...`);
      try {
          const newStats = await generateStatsForTheme(theme.name);
          setCardData(prev => ({
              ...prev,
              series: theme.name,
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

  const handleDownloadPreview = async () => {
    if (!previewCardRef.current) {
      console.error("Preview card element not found for download.");
      alert('Could not find card element to download.');
      return;
    }

    try {
      const cardElement = previewCardRef.current;
      const targetWidth = 732;
      const sourceWidth = cardElement.offsetWidth;
      const pixelRatio = targetWidth / sourceWidth;

      const dataUrl = await htmlToImage.toPng(cardElement, {
        quality: 1,
        pixelRatio: pixelRatio,
      });

      const link = document.createElement('a');
      link.download = `${cardData.series}-${cardData.title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Oops, something went wrong!', error);
      alert('An error occurred while trying to generate the card image for download. Please check the console for details.');
    }
  };

  const handleGeneratePreview = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedCards([]);
    setPreviewCard(null);
    setLoadingMessage('Generating preview card idea...');

    try {
        const [cardIdea] = await generateCardIdeas(cardData.series, selectedTheme.name, selectedImageStyle, cardData.stats, 1);
        
        setLoadingMessage(`Generating image for ${cardIdea.title}...`);
        const imageBase64 = await generateImage(cardIdea.imagePrompt);

        const newPreviewCardData = {
            id: `card-preview-${Date.now()}`,
            title: cardIdea.title,
            series: cardData.series,
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
        const otherCardIdeas = await generateCardIdeas(cardData.series, selectedTheme.name, selectedImageStyle, cardData.stats, 3, previewCard.title);
        
        const newCards: CardData[] = [previewCard]; // Start with the preview card

        for (let i = 0; i < otherCardIdeas.length; i++) {
            const idea = otherCardIdeas[i];
            setLoadingMessage(`Generating image for ${idea.title}... (${i + 1}/${otherCardIdeas.length})`);
            
            const imageBase64 = await generateImage(idea.imagePrompt);
            
            newCards.push({
                id: `card-${Date.now()}-${i}`,
                title: idea.title,
                series: cardData.series,
                image: `data:image/jpeg;base64,${imageBase64}`,
                stats: idea.stats,
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


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      {isLoading && <Loader message={loadingMessage} />}
      <header className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-bold text-orange-500 tracking-wider" style={{fontFamily: "'Teko', sans-serif"}}>AI Top Trumps Card Generator</h1>
        <p className="text-gray-400 mt-2">Create your own professional trading cards with the power of AI.</p>
      </header>
      
      {error && (
        <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg relative mb-6 max-w-4xl mx-auto" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-white" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
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
            <CardPreview cardRef={previewCardRef} cardData={cardData} colorScheme={selectedColorScheme} />
            <button
              onClick={handleDownloadPreview}
              className="w-full max-w-sm mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-bold transition-colors"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Preview
            </button>
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
