import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type { ValidationOverview } from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { Validation } from './validation';

describe('Validation', () => {
  const result: ValidationOverview = {
    selected_model: 'Logistic regression',
    completed_loans: 234,
    recorded_problem_loans: 31,
    f1: 0.545455,
    pr_auc: 0.471479,
    figures: [
      {
        title: 'Model comparison',
        description: 'Held-out results for the four course models.',
        url: '/api/v1/figures/loan_model_comparison.png',
      },
      {
        title: 'Confusion matrix',
        description: 'Correct predictions, false alarms, and missed problems.',
        url: '/api/v1/figures/loan_logistic_confusion_matrix.png',
      },
      {
        title: 'Outcome coverage by year',
        description: 'Completed-loan volume and recorded problem rate over time.',
        url: '/api/v1/figures/loan_outcomes_by_year.png',
      },
      {
        title: 'Cluster stability',
        description: 'Repeatability across random starts and sensitivity to preparation.',
        url: '/api/v1/figures/cluster_stability_check.png',
      },
    ],
    limitations: ['The loan test set is small.'],
  };

  const api = {
    validation: vi.fn(() => of(result)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Validation],
      providers: [{ provide: DashboardApi, useValue: api }],
    }).compileComponents();
  });

  it('names the method used for every metric and validation figure', () => {
    const fixture = TestBed.createComponent(Validation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(element.querySelectorAll('.metric-method')).toHaveLength(4);
    expect(element.querySelectorAll('.figure-card .method-note')).toHaveLength(4);
    expect(text).toContain('class-balanced logistic-regression predictions');
    expect(text).toContain('71 loans in the test set');
    expect(text).toContain('grouped by loan start year');
    expect(text).toContain('Adjusted Rand Index');
  });

  it('defines every measure shown in the model comparison', () => {
    const fixture = TestBed.createComponent(Validation);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Precision');
    expect(text).toContain('Recall');
    expect(text).toContain('F1');
    expect(text).toContain('PR-AUC');
    expect(text).toContain('ROC-AUC');
  });
});
