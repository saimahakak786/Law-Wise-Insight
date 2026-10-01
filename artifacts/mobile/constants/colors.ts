/**
 * LawVise Design Tokens - Clean Off-White / Parchment Legal Theme.
 * Replaces the sea-green tint with a professional, high-contrast off-white aesthetic.
 */

const colors = {
  light: {
    // Clean, professional off-white parchment background
    background: '#F8F9FA',
    foreground: '#1F2937',
    
    // Dedicated bright title color for clean high-contrast headers
    title: '#0F172A', // Deep, sharp slate-black for maximum readability on light backgrounds

    // Crisp white cards for professional contrast
    card: '#FFFFFF',
    cardForeground: '#1F2937',

    // Professional legal gold/bronze accent tone
    primary: '#C5A059',
    primaryForeground: '#FFFFFF',

    secondary: '#F3F4F6',
    secondaryForeground: '#1F2937',

    muted: '#E5E7EB',
    mutedForeground: '#6B7280',

    accent: '#C5A059',
    accentForeground: '#FFFFFF',

    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',

    border: '#E5E7EB',
    input: '#FFFFFF',
    text: '#1F2937',
    tint: '#C5A059',
  },

  dark: {
    background: '#1A1D20',
    foreground: '#E5E0D3',
    
    // Dedicated bright title color for dark mode headers
    title: '#F8FAFC', // Crisp, bright white/silver for standout visibility on dark backgrounds

    card: '#222620',
    cardForeground: '#E5E0D3',
    primary: '#C9A84C',
    primaryForeground: '#1A1D20',
    secondary: '#2C3138',
    secondaryForeground: '#E5E0D3',
    muted: '#2C3138',
    mutedForeground: '#9CA3AF',
    accent: '#C9A84C',
    accentForeground: '#1A1D20',
    destructive: '#D15858',
    destructiveForeground: '#FFFFFF',
    success: '#3D8C55',
    warning: '#D8622B',
    info: '#6ABEC2',
    border: '#374151',
    input: '#222620',
    text: '#E5E0D2',
    tint: '#C9A84C',
  },

  radius: 12,
};

export default colors;
