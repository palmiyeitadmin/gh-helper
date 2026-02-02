import chalk from 'chalk';
import { ThemeType } from './settings';

// Tema renk şemaları - basit string-based yaklaşım
export interface ThemeColors {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    muted: string;
    accent: string;
}

const themeHexColors: Record<ThemeType, ThemeColors> = {
    default: {
        primary: '#00CED1',   // Cyan
        secondary: '#4169E1', // Blue
        success: '#32CD32',   // Green
        error: '#DC143C',     // Red
        warning: '#FFD700',   // Yellow
        info: '#87CEEB',      // Light blue
        muted: '#808080',     // Gray
        accent: '#DA70D6'     // Magenta
    },
    dark: {
        primary: '#61AFEF',
        secondary: '#C678DD',
        success: '#98C379',
        error: '#E06C75',
        warning: '#E5C07B',
        info: '#56B6C2',
        muted: '#5C6370',
        accent: '#D19A66'
    },
    light: {
        primary: '#4078F2',
        secondary: '#A626A4',
        success: '#50A14F',
        error: '#E45649',
        warning: '#C18401',
        info: '#0184BC',
        muted: '#A0A1A7',
        accent: '#986801'
    },
    ocean: {
        primary: '#89DDFF',
        secondary: '#82AAFF',
        success: '#C3E88D',
        error: '#FF5370',
        warning: '#FFCB6B',
        info: '#89DDFF',
        muted: '#546E7A',
        accent: '#F78C6C'
    }
};

let currentTheme: ThemeType = 'default';

export function setTheme(theme: ThemeType): void {
    currentTheme = theme;
}

export function getThemeColors(): ThemeColors {
    return themeHexColors[currentTheme];
}

// Chalk-based color functions
export function colorize(text: string, colorType: keyof ThemeColors): string {
    const colors = themeHexColors[currentTheme];
    return chalk.hex(colors[colorType])(text);
}

export function getThemeNames(): { value: ThemeType; name: string }[] {
    return [
        { value: 'default', name: '🎨 Default - Klasik renkler' },
        { value: 'dark', name: '🌙 Dark - One Dark teması' },
        { value: 'light', name: '☀️ Light - Açık tema' },
        { value: 'ocean', name: '🌊 Ocean - Material Ocean' }
    ];
}

// Tema preview
export function previewTheme(theme: ThemeType): void {
    const colors = themeHexColors[theme];
    console.log(`\n${chalk.hex(colors.primary)('Primary')} | ${chalk.hex(colors.secondary)('Secondary')} | ${chalk.hex(colors.success)('Success')} | ${chalk.hex(colors.error)('Error')}`);
    console.log(`${chalk.hex(colors.warning)('Warning')} | ${chalk.hex(colors.info)('Info')} | ${chalk.hex(colors.muted)('Muted')} | ${chalk.hex(colors.accent)('Accent')}`);
}
