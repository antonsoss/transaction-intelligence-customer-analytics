import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ValidationOverview } from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';

@Component({
  selector: 'ti-validation',
  imports: [CommonModule],
  templateUrl: './validation.html',
  styleUrl: './validation.scss',
})
export class Validation implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly validation = signal<ValidationOverview | undefined>(undefined);

  ngOnInit(): void {
    this.api.validation().subscribe({
      next: (validation) => {
        this.validation.set(validation);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Validation results could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}
