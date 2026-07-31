import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ValidationFigure, ValidationOverview } from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';

type ValidationFigureWithMethod = ValidationFigure & { method: string };

const FIGURE_METHODS: Record<string, string> = {
  '/api/v1/figures/loan_model_comparison.png':
    'The prior-only baseline, class-balanced logistic regression, class-balanced RBF SVM, and class-balanced depth-3 decision tree were trained on the same 70% split and compared on the untouched 30% stratified test split.',
  '/api/v1/figures/loan_logistic_confusion_matrix.png':
    "Actual outcomes were counted against logistic-regression predictions for the 71 loans in the test set, using the model's default 0.50 classification cutoff.",
  '/api/v1/figures/loan_outcomes_by_year.png':
    'Completed loans were grouped by loan start year. Bars count completed loans, and the line is recorded problem loans divided by completed loans.',
  '/api/v1/figures/cluster_stability_check.png':
    'Five-cluster K-means was rerun on the same nine prepared behavior features with five random seeds. Adjusted Rand Index compared each result with the saved assignments, and a run without skewness treatment tested preparation sensitivity.',
};

@Component({
  selector: 'ti-validation',
  imports: [CommonModule],
  templateUrl: './validation.html',
  styleUrl: './validation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Validation implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly validation = signal<ValidationOverview | undefined>(undefined);
  readonly validationFigures = computed<ValidationFigureWithMethod[]>(() =>
    (this.validation()?.figures ?? []).map((figure) => ({
      ...figure,
      method:
        FIGURE_METHODS[figure.url] ??
        'The figure was produced from the validation outputs prepared in Notebook 4.',
    })),
  );

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
