import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  it('uses a valid saved preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = TestBed.inject(ThemeService);
    TestBed.flushEffects();

    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('toggles and saves an explicit preference', () => {
    const service = TestBed.inject(ThemeService);
    const expected = service.resolved() === 'dark' ? 'light' : 'dark';

    service.toggle();
    TestBed.flushEffects();

    expect(service.resolved()).toBe(expected);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(expected);
  });

  it('can return to the system preference', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();

    service.useSystemPreference();

    expect(service.preference()).toBe('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
