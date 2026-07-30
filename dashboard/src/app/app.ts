import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DashboardApi } from './core/services/dashboard-api';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly api = inject(DashboardApi);

  readonly navigation = [
    { number: '01', label: 'Overview', path: '/overview' },
    { number: '02', label: 'Banking activity over time', path: '/behavior' },
    { number: '03', label: 'Customer segmentation', path: '/segments' },
    { number: '04', label: 'Validation and insights', path: '/validation' },
    { number: null, label: 'About the project', path: '/about' },
  ];
  readonly apiStatus = signal<'checking' | 'online' | 'partial'>('checking');

  ngOnInit(): void {
    this.api.health().subscribe({
      next: (health) => this.apiStatus.set(health.status === 'ok' ? 'online' : 'partial'),
      error: () => this.apiStatus.set('partial'),
    });
  }
}
