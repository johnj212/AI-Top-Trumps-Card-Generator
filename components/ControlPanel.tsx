
import React from 'react';
import type { CardData, ColorScheme, ImageStyle, Statistic, Theme } from '../types';
import { COLOR_SCHEMES, IMAGE_STYLES, THEMES } from '../constants';
import { GenerateIcon, RandomizeIcon } from './icons';

interface ControlPanelProps {
    cardData: CardData;
    setCardData: React.Dispatch<React.SetStateAction<CardData>>;
    selectedTheme: Theme;
    setSelectedTheme: React.Dispatch<React.SetStateAction<Theme>>;
    selectedColorScheme: ColorScheme;
    setSelectedColorScheme: React.Dispatch<React.SetStateAction<ColorScheme>>;
    selectedImageStyle: ImageStyle;
    setSelectedImageStyle: React.Dispatch<React.SetStateAction<ImageStyle>>;
    onGeneratePreview: () => void;
    onGeneratePack: () => void;
    isLoading: boolean;
    isPreviewGenerated: boolean;
    onThemeChange: (theme: Theme) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    cardData,
    setCardData,
    selectedTheme,
    setSelectedTheme,
    selectedColorScheme,
    setSelectedColorScheme,
    selectedImageStyle,
    setSelectedImageStyle,
    onGeneratePreview,
    onGeneratePack,
    isLoading,
    isPreviewGenerated,
    onThemeChange
}) => {
    
    const handleStatValueChange = (index: number, value: string) => {
        const newStats = [...cardData.stats];
        newStats[index].value = Math.max(0, Math.min(100, Number(value)));
        setCardData(prev => ({ ...prev, stats: newStats }));
    };

    const handleRandomizeStats = () => {
        const newStats = cardData.stats.map(stat => ({
            ...stat,
            value: Math.floor(Math.random() * 100) + 1
        }));
        setCardData(prev => ({ ...prev, stats: newStats }));
    };

    return (
        <div className="p-6 bg-gray-800 rounded-lg shadow-xl space-y-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-bold text-orange-400 border-b-2 border-orange-500 pb-2">Card Customizer</h2>

            {/* Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-lg font-bold text-gray-300 mb-1">Series Name</label>
                    <input type="text" value={cardData.series} onChange={e => setCardData(p => ({...p, series: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                    <label className="block text-lg font-bold text-gray-300 mb-1">Preview Card Title</label>
                    <input type="text" value={cardData.title} onChange={e => setCardData(p => ({...p, title: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
            </div>

            {/* Design Customization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-lg font-bold text-gray-300 mb-1">Theme</label>
                    <select value={selectedTheme.name} onChange={e => onThemeChange(THEMES.find(t => t.name === e.target.value)!)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {THEMES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-lg font-bold text-gray-300 mb-1">Color Scheme</label>
                    <select value={selectedColorScheme.name} onChange={e => setSelectedColorScheme(COLOR_SCHEMES.find(c => c.name === e.target.value)!)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {COLOR_SCHEMES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-lg font-bold text-gray-300 mb-1">Image Style</label>
                    <select value={selectedImageStyle.name} onChange={e => setSelectedImageStyle(IMAGE_STYLES.find(s => s.name === e.target.value)!)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {IMAGE_STYLES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Statistics Editor */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl font-bold text-gray-300">Statistics</h3>
                    <button onClick={handleRandomizeStats} className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm">
                        <RandomizeIcon className="w-4 h-4" /> Randomize
                    </button>
                </div>
                <div className="space-y-2">
                    {cardData.stats.map((stat, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 items-center">
                            <span className="col-span-3 p-1 font-roboto-condensed font-bold uppercase text-gray-300 text-sm flex items-center">{stat.name}</span>
                            <input type="number" value={stat.value} min="0" max="100" onChange={e => handleStatValueChange(i, e.target.value)} className="col-span-2 p-1 bg-gray-700 border border-gray-600 rounded text-sm"/>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4 border-t border-gray-700">
                <button 
                    onClick={onGeneratePreview} 
                    disabled={isLoading} 
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-teal-600 hover:bg-teal-700 rounded-lg text-xl font-bold transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <GenerateIcon className="w-7 h-7" />
                    {isLoading ? 'Generating...' : 'Generate Preview Card'}
                </button>
                <button 
                    onClick={onGeneratePack} 
                    disabled={isLoading || !isPreviewGenerated} 
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-orange-600 hover:bg-orange-700 rounded-lg text-xl font-bold transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <GenerateIcon className="w-7 h-7" />
                    Generate Full Pack (3 more)
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
