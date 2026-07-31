import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';
export type ThemePreference = AppTheme | 'system';

export interface ChartPalette {
  background: string;
  border: string;
  code: string;
  danger: string;
  grid: string;
  link: string;
  muted: string;
  primary: string;
  surface: string;
  text: string;
  warning: string;
  series: readonly [string, string, string, string, string];
}

export const THEME_STORAGE_KEY = 'transaction-intelligence-theme';

// ECharts renders to canvas and cannot resolve CSS custom properties. These values
// mirror the canonical tokens in src/brand/brand.css for each resolved theme.
const CHART_PALETTES: Record<AppTheme, ChartPalette> = {
  light: {
    background: '#f6f8fa',
    border: '#c7cfd8',
    code: '#6639ba',
    danger: '#cf222e',
    grid: '#d8dee4',
    link: '#0969da',
    muted: '#4b5560',
    primary: '#146c2e',
    surface: '#ffffff',
    text: '#1f2328',
    warning: '#9a6700',
    series: ['#146c2e', '#0969da', '#9a6700', '#4b5560', '#6639ba'],
  },
  dark: {
    background: '#0d1117',
    border: '#3d444d',
    code: '#bc8cff',
    danger: '#ff7b72',
    grid: '#30363d',
    link: '#79c0ff',
    muted: '#aab4be',
    primary: '#56d364',
    surface: '#161b22',
    text: '#f0f6fc',
    warning: '#d29922',
    series: ['#56d364', '#79c0ff', '#d29922', '#aab4be', '#bc8cff'],
  },
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : undefined;
  private readonly systemDark = signal(this.mediaQuery?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(this.readPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed<AppTheme>(() => {
    const preference = this.preferenceState();
    return preference === 'system' ? (this.systemDark() ? 'dark' : 'light') : preference;
  });
  readonly chartPalette = computed(() => CHART_PALETTES[this.resolved()]);
  readonly logoPath = computed(() => `brand/as-shell-compact-${this.resolved()}.svg`);

  constructor() {
    const onSystemThemeChange = (event: MediaQueryListEvent): void => {
      this.systemDark.set(event.matches);
    };

    this.mediaQuery?.addEventListener('change', onSystemThemeChange);
    this.destroyRef.onDestroy(() =>
      this.mediaQuery?.removeEventListener('change', onSystemThemeChange),
    );

    effect(() => {
      const theme = this.resolved();
      const root = this.document.documentElement;
      root.dataset['theme'] = theme;
      root.style.colorScheme = theme;
      this.document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#0d1117' : '#f6f8fa');
    });
  }

  toggle(): void {
    this.setPreference(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  useSystemPreference(): void {
    this.preferenceState.set('system');
    this.removeStoredPreference();
  }

  private setPreference(theme: AppTheme): void {
    this.preferenceState.set(theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }

  private readPreference(): ThemePreference {
    if (typeof window === 'undefined') return 'system';

    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private removeStoredPreference(): void {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Nothing else is required when storage is unavailable.
    }
  }
}
