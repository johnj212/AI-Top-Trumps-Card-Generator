import React, { useState, useEffect } from 'react';
import type { StoredCardData, ColorScheme } from '../types';
import { cardRecreationService, type RecreatedCard } from '../services/cardRecreationService';
import { StorageError, StorageErrorCode } from '../services/cardStorageService';
import CardPreview from './CardPreview';
import Loader from './Loader';
import { COLOR_SCHEMES } from '../constants';

interface CardLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onCardSelect?: (card: RecreatedCard) => void;
}

interface ErrorState {
  message: string;
  code?: StorageErrorCode;
  canRetry?: boolean;
  actionLabel?: string;
  statusCode?: number;
}

const CardLibrary: React.FC<CardLibraryProps> = ({ isOpen, onClose, onCardSelect }) => {
  const [recreatedCards, setRecreatedCards] = useState<RecreatedCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [storageHealth, setStorageHealth] = useState<any>(null);
  const [stats, setStats] = useState<{
    totalCards: number;
    recreatableCards: number;
    seriesList: string[];
  } | null>(null);

  // Load cards when component opens
  useEffect(() => {
    if (isOpen) {
      loadCards();
      loadStatistics();
    }
  }, [isOpen]);

  const parseStorageError = (err: any): ErrorState => {
    if (err instanceof StorageError) {
      let actionLabel = 'Try Again';
      let canRetry = true;
      
      switch (err.code) {
        case StorageErrorCode.AUTH_TOKEN_MISSING:
        case StorageErrorCode.AUTH_TOKEN_EXPIRED:
          actionLabel = 'Log In';
          canRetry = false;
          break;
        case StorageErrorCode.NETWORK_ERROR:
          actionLabel = 'Check Connection';
          break;
        case StorageErrorCode.RATE_LIMITED:
          actionLabel = 'Wait & Retry';
          break;
        case StorageErrorCode.SERVER_ERROR:
          actionLabel = 'Try Later';
          break;
      }
      
      return {
        message: err.message,
        code: err.code,
        canRetry,
        actionLabel,
        statusCode: err.statusCode
      };
    }
    
    return {
      message: err instanceof Error ? err.message : 'Failed to load cards from storage',
      canRetry: true,
      actionLabel: 'Try Again'
    };
  };

  const checkStorageHealth = async () => {
    try {
      const response = await fetch('/api/storage/health');
      const health = await response.json();
      setStorageHealth(health);
      return health;
    } catch (error) {
      console.warn('Could not check storage health:', error);
      return null;
    }
  };

  const loadCards = async (series?: string) => {
    setIsLoading(true);
    setError(null);
    
    console.log(`📚 CardLibrary: Loading cards${series ? ` for series: ${series}` : ' (all series)'}`);
    
    try {
      let cards: RecreatedCard[];
      if (series && series !== 'all') {
        cards = await cardRecreationService.loadCardsBySeries(series);
      } else {
        cards = await cardRecreationService.loadAllCards();
      }
      
      setRecreatedCards(cards);
      console.log(`✅ CardLibrary: Successfully loaded ${cards.length} cards`);
      
      // Only update series list when loading ALL cards, not when filtering by specific series
      if (!series || series === 'all') {
        const uniqueSeries = Array.from(new Set(cards.map(c => c.cardData.series)));
        setSeriesList(uniqueSeries);
        console.log(`📊 Updated series list with ${uniqueSeries.length} unique series:`, uniqueSeries);
      } else {
        console.log(`🔍 Filtered by series "${series}", preserving existing series list`);
      }
      
    } catch (err) {
      console.error('❌ CardLibrary: Failed to load cards:', err);
      const errorState = parseStorageError(err);
      setError(errorState);
      setRecreatedCards([]);
      
      // Check storage health for additional diagnostics
      await checkStorageHealth();
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const statistics = await cardRecreationService.getStorageStatistics();
      setStats({
        totalCards: statistics.totalCards,
        recreatableCards: statistics.recreatableCards,
        seriesList: statistics.seriesList
      });
    } catch (err) {
      console.warn('Failed to load statistics:', err);
    }
  };

  const handleSeriesChange = (series: string) => {
    setSelectedSeries(series);
    loadCards(series);
  };

  const handleRetry = () => {
    if (error?.code === StorageErrorCode.AUTH_TOKEN_MISSING || error?.code === StorageErrorCode.AUTH_TOKEN_EXPIRED) {
      // Redirect to login or show login modal
      window.location.reload(); // Simple solution - reload to show login
      return;
    }
    
    loadCards(selectedSeries === 'all' ? undefined : selectedSeries);
  };

  const getColorSchemeForCard = (card: RecreatedCard): ColorScheme => {
    const colorScheme = COLOR_SCHEMES.find(c => c.name === card.metadata.colorScheme);
    return colorScheme || COLOR_SCHEMES[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Card Library</h2>
            {stats && (
              <p className="text-gray-300 text-sm">
                {stats.totalCards} cards total • {stats.recreatableCards} fully recreatable
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-3 bg-gray-750 border-b border-gray-600">
          <div className="flex items-center gap-4">
            <label className="text-white text-sm">Series:</label>
            <select
              value={selectedSeries}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className="bg-gray-600 text-white px-3 py-1 rounded border border-gray-500"
            >
              <option value="all">All Series ({stats?.totalCards || 0})</option>
              {seriesList.map(series => (
                <option key={series} value={series}>{series}</option>
              ))}
            </select>
            
            <button
              onClick={() => loadCards(selectedSeries)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button
              onClick={() => checkStorageHealth()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              title="Check storage system health"
            >
              🔍 Health
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading && <Loader message="Loading saved cards..." />}
          
          {error && (
            <div className="mb-4">
              <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">
                        {error.code === StorageErrorCode.AUTH_TOKEN_MISSING || error.code === StorageErrorCode.AUTH_TOKEN_EXPIRED ? '🔐' :
                         error.code === StorageErrorCode.NETWORK_ERROR ? '🌐' :
                         error.code === StorageErrorCode.SERVER_ERROR ? '💻' :
                         error.code === StorageErrorCode.RATE_LIMITED ? '⏱️' : '⚠️'}
                      </span>
                      <strong>Unable to Load Cards</strong>
                    </div>
                    <p className="text-sm opacity-90 mb-3">{error.message}</p>
                    
                    {error.code && (
                      <div className="text-xs opacity-75 mb-3">
                        Error Code: {error.code}
                        {error.statusCode && ` (HTTP ${error.statusCode})`}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRetry}
                        className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        {error.actionLabel || 'Try Again'}
                      </button>
                      
                      <button
                        onClick={() => checkStorageHealth()}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Check Status
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Storage Health Details */}
              {storageHealth && storageHealth.status !== 'healthy' && (
                <div className="mt-3 bg-gray-800 border border-gray-600 text-gray-300 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-center mb-2">
                    <span className="mr-2">
                      {storageHealth.status === 'healthy' ? '✅' :
                       storageHealth.status === 'degraded' ? '⚠️' : '❌'}
                    </span>
                    <strong>Storage System Status: {storageHealth.status}</strong>
                  </div>
                  
                  {storageHealth.checks && Object.entries(storageHealth.checks).map(([key, check]: [string, any]) => (
                    check.status === 'fail' && (
                      <div key={key} className="ml-6 text-xs opacity-75">
                        • {key}: {check.message}
                      </div>
                    )
                  ))}
                  
                  <div className="text-xs opacity-50 mt-2">
                    Last checked: {new Date(storageHealth.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && recreatedCards.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>No saved cards found.</p>
              <p className="text-sm mt-2">Generate some cards first to see them here!</p>
            </div>
          )}

          {!isLoading && recreatedCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recreatedCards.map((recreatedCard) => (
                <div key={recreatedCard.cardData.id} className="relative group">
                  <div className="transform hover:scale-105 transition-transform cursor-pointer">
                    <CardPreview
                      cardData={recreatedCard.cardData}
                      colorScheme={getColorSchemeForCard(recreatedCard)}
                      hideDownloadButton={true}
                    />
                  </div>
                  
                  {/* Card info overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <div><strong>Theme:</strong> {recreatedCard.metadata.theme}</div>
                    <div><strong>Style:</strong> {recreatedCard.metadata.imageStyle}</div>
                    <div><strong>Generated:</strong> {new Date(recreatedCard.metadata.generatedAt).toLocaleDateString()}</div>
                  </div>
                  
                  {onCardSelect && (
                    <button
                      onClick={() => onCardSelect(recreatedCard)}
                      className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Load this card"
                    >
                      ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardLibrary;