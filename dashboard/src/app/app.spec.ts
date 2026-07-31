import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the project name', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Transaction');
    expect(text).toContain('Intelligence');
    expect(text).toContain('Project sections');
    expect(text).not.toContain('Analysis workspace');

    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand');
    const logo = brand?.querySelector<HTMLImageElement>('.brand-logo');
    expect(logo?.getAttribute('src')).toContain('brand/as-shell-compact-');
    expect(logo?.getAttribute('alt')).toBe('');
    expect(brand?.querySelector('strong')?.textContent?.trim()).toBe('Transaction Intelligence');
    expect(brand?.getAttribute('aria-label')).toBe('Transaction Intelligence home');
  });

  it('provides accessible desktop and mobile theme controls', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.theme-toggle'),
    );

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-label')).toMatch(/^Switch to (light|dark) theme$/);
    }
  });

  it('includes the About page in the main navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const aboutLink = element.querySelector('.primary-nav a[href="/about"]');
    const mobileAboutLink = element.querySelector('.mobile-header a[href="/about"]');

    expect(aboutLink?.textContent).toContain('About');
    expect(aboutLink?.querySelector('span')?.textContent?.trim()).toBe('');
    expect(aboutLink?.classList).toContain('about-link');
    expect(mobileAboutLink?.textContent?.trim()).toBe('About');
    expect(mobileAboutLink?.classList).toContain('about-link');
  });

  it('shows the author copyright in the sidebar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const authorLink = element.querySelector<HTMLAnchorElement>(
      '.copyright a[href="https://www.antoniososa.ca"]',
    );

    expect(element.textContent).toContain('© 2026');
    expect(authorLink?.textContent).toContain('Antonio Sosa');
    expect(authorLink?.target).toBe('_blank');
  });
});
