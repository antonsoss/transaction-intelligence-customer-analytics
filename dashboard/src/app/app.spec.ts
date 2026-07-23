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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Transaction');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Intelligence');
  });

  it('includes the About page in the main navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const aboutLink = (fixture.nativeElement as HTMLElement).querySelector('a[href="/about"]');
    expect(aboutLink?.textContent).toContain('About');
  });
});
