import type { Config } from 'tailwindcss'

export default {
  content: [
    './*.{tsx,ts,html}',
    './components/**/*.{tsx,ts}',
    './services/**/*.{tsx,ts}',
    './utils/**/*.{tsx,ts}',
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          deep:    '#0a0a1a',
          card:    '#12122a',
          panel:   '#1a1a3a',
          primary: '#6c63ff',
          accent:  '#ff6b35',
          gold:    '#ffd700',
          cyan:    '#00f5ff',
          success: '#39ff14',
          text:    '#f0f0ff',
          dim:     '#8888aa',
        },
      },
      fontFamily: {
        fredoka: ['"Fredoka One"', 'cursive'],
        nunito:  ['Nunito', 'sans-serif'],
        teko:    ['Teko', 'sans-serif'],
      },
      animation: {
        shimmer:        'shimmer 3s linear infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'card-flip':    'cardFlip 1.2s ease-in-out infinite',
        'bounce-in':    'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'star-twinkle': 'starTwinkle 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px #6c63ff' },
          '50%':      { boxShadow: '0 0 24px #6c63ff, 0 0 48px #6c63ff' },
        },
        cardFlip: {
          '0%':   { transform: 'rotateY(0deg)' },
          '50%':  { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '60%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        starTwinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%':      { opacity: '1',   transform: 'scale(1.2)' },
        },
      },
    },
  },
  safelist: [
    // ColorScheme classes from constants.ts — assembled at runtime, must not be purged
    'bg-orange-500', 'bg-red-700', 'bg-yellow-500', 'bg-red-900',
    'bg-blue-600', 'bg-gray-400', 'bg-gray-800', 'bg-green-700',
    'bg-yellow-800', 'bg-green-900', 'bg-purple-600', 'bg-black',
    'text-white', 'text-yellow-200', 'text-purple-200', 'text-yellow-100',
    'border-orange-500', 'border-yellow-500', 'border-blue-400',
    'border-yellow-600', 'border-purple-500',
    // StatBar + card dynamic classes
    'h-full', 'rounded-full',
    'bg-gray-700', 'bg-gray-900', 'bg-gray-600',
    'text-gray-300', 'text-gray-400', 'text-gray-500',
    'text-cyan-400', 'text-purple-400', 'text-yellow-400',
    'border-4', 'border-2',
    // Aspect ratio
    'aspect-[62/100]',
  ],
  plugins: [],
} satisfies Config
