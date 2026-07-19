/**
 * LawVise design tokens — deep navy + gold legal AI aesthetic.
 * Dark-first theme that conveys trust, authority, and premium quality.
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#FFFFFF',
    tint: '#C9A84C',

    // Surfaces
    background: '#070D24',
    foreground: '#FFFFFF',
    card: '#0F1635',
    cardForeground: '#FFFFFF',

    // Primary — LawVise gold
    primary: '#C9A84C',
    primaryForeground: '#070D24',

    // Secondary — deep navy card
    secondary: '#1B2448',
    secondaryForeground: '#E2E8F8',

    // Muted
    muted: '#1B2448',
    mutedForeground: '#8B9CC5',

    // Accent — gold
    accent: '#C9A84C',
    accentForeground: '#070D24',

    // Status
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Borders / inputs
    border: '#1B2448',
    input: '#131D3D',
  },

  dark: {
    text: '#FFFFFF',
    tint: '#C9A84C',
    background: '#040A1C',
    foreground: '#FFFFFF',
    card: '#091225',
    cardForeground: '#FFFFFF',
    primary: '#C9A84C',
    primaryForeground: '#040A1C',
    secondary: '#121B38',
    secondaryForeground: '#D8E0F0',
    muted: '#121B38',
    mutedForeground: '#7A8BB8',
    accent: '#C9A84C',
    accentForeground: '#040A1C',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
    border: '#121B38',
    input: '#0D1530',
  },

  radius: 12,
};

export default colors;
