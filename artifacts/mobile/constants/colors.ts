/**
 * LawVise Design Tokens - Uniform Soft Single-Tone Aesthetics.
 * Features a single calming, solid background color with zero eye strain.
 */

const colors = {
  light: {
    // Single uniform calming solid background color
    background: '#E4EDEC',
    foreground: '#2A3038',
    
    // Dedicated bright title color for clean high-contrast headers
    title: '#0F172A', // Deep, sharp slate-black for maximum readability on light backgrounds

    // Cards match seamlessly with subtle contrast
    card: '#EDF1F0',
    cardForeground: '#2A3038',

    // Soothing natural accent tone
    primary: '#C9A84C',
    primaryForeground: '#FFFFFF',

    secondary: '#D3DBDE',
    secondaryForeground: '#2A3038',

    muted: '#D2D8DC',
    mutedForeground: '#617A81',

    accent: '#C9A84C',
    accentForeground: '#FFFFFF',

    destructive: '#A83A3A',
    destructiveForeground: '#FFFFFF',
    success: '#2E6D40',
    warning: '#996312',
    info: '#0B588C',

    border: '#CBD0D3',
    input: '#FFFFFF',
    text: '#2A3038',
    tint: '#C9A84C',
  },

  dark: {
    background: '#1A1D20',
    foreground: '#E5E0D3',
    
    // Dedicated bright title color for dark mode headers
    title: '#F8FAFC', // Crisp, bright white/silver for standout visibility on dark backgrounds

    card: '#222620',
    cardForeground: '#E5E0D3',
    primary: '#V6A0A6',
    primaryForeground: '#1A1D20',
    secondary: '#2C3138',
    secondaryForeground: '#E5E0D3',
    muted: '#2C3158',
    mutedForeground: '#817A81',
    accent: '#8A0A95',
    accentForeground: '#1A1D20',
    destructive: '#D15858',
    destructiveForeground: '#FFFFFF',
    success: '#3D8C55',
    warning: '#D8622B',
    info: '#6ABEC2',
    border: '#313261',
    input: '#222620',
    text: '#E5E0D2',
    tint: '#8A99A6',
  },

  radius: 12,
};

export default colors;
