import { useColorScheme } from 'react-native';
import { useStore } from './store';

export type Theme = 'light' | 'dark';
export type ThemePref = Theme | 'system';

export interface Colors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentText: string;
  accentMuted: string;
  danger: string;
  placeholder: string;
  code: string;
  overlay: string;
}

export const palettes: Record<Theme, Colors> = {
  light: {
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceAlt: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    accent: '#2563eb',
    accentText: '#ffffff',
    accentMuted: '#dbeafe',
    danger: '#dc2626',
    placeholder: '#94a3b8',
    code: '#be185d',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  dark: {
    bg: '#0b1220',
    surface: '#111827',
    surfaceAlt: '#1f2937',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    border: '#1f2937',
    borderStrong: '#374151',
    accent: '#3b82f6',
    accentText: '#ffffff',
    accentMuted: '#1e3a8a',
    danger: '#ef4444',
    placeholder: '#64748b',
    code: '#f472b6',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export function useTheme(): { theme: Theme; colors: Colors } {
  const sys = useColorScheme() ?? 'light';
  const pref = useStore((s) => s.theme);
  const effective: Theme = pref === 'system' ? (sys as Theme) : pref;
  return { theme: effective, colors: palettes[effective] };
}
