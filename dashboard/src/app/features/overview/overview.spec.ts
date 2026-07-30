import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { of } from 'rxjs';

import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart } from '../../shared/chart/chart';
import { Overview } from './overview';

@Component({
  selector: 'ti-chart',
  standalone: true,
  template: '',
})
class ChartStub {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Analytical chart');
}

describe('Overview', () => {
  const segments = vi.fn(() => of([]));
  const api = {
    summary: vi.fn(() =>
      of([
        {
          section: 'Portfolio',
          metric: 'Accounts',
          numeric_value: 4500,
          display_value: '4,500',
          note: 'Account-level coverage',
        },
        {
          section: 'Portfolio',
          metric: 'Transactions',
          numeric_value: 1056320,
          display_value: '1,056,320',
          note: 'Clean transaction records',
        },
        {
          section: 'Segmentation',
          metric: 'Segments',
          numeric_value: 5,
          display_value: '5',
          note: 'Selected K-means solution',
        },
        {
          section: 'Segmentation',
          metric: 'Behavioral outliers',
          numeric_value: 16,
          display_value: '16',
          note: 'Accounts meeting at least two signals',
        },
        {
          section: 'Time',
          metric: 'Observed months',
          numeric_value: 72,
          display_value: '72',
          note: 'Monthly aggregate history',
        },
      ]),
    ),
    activity: vi.fn(() =>
      of([
        {
          month: '1993-01-01',
          transaction_count: 100,
          total_inflow: 1000,
          total_outflow: 500,
          withdrawal_count: 20,
          withdrawal_value: 500,
          active_account_count: 96,
          net_cash_flow: 500,
          transactions_per_active_account: 1.04,
          withdrawals_per_active_account: 0.21,
          inflow_per_active_account: 10.42,
          outflow_per_active_account: 5.21,
        },
        {
          month: '1998-12-01',
          transaction_count: 200,
          total_inflow: 2000,
          total_outflow: 1000,
          withdrawal_count: 40,
          withdrawal_value: 1000,
          active_account_count: 4424,
          net_cash_flow: 1000,
          transactions_per_active_account: 0.05,
          withdrawals_per_active_account: 0.01,
          inflow_per_active_account: 0.45,
          outflow_per_active_account: 0.23,
        },
      ]),
    ),
    segments,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Overview],
      providers: [provideRouter([]), { provide: DashboardApi, useValue: api }],
    })
      .overrideComponent(Overview, {
        remove: { imports: [Chart] },
        add: { imports: [ChartStub] },
      })
      .compileComponents();
  });

  it('summarizes the dataset without duplicating segmentation results', () => {
    const fixture = TestBed.createComponent(Overview);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Source tables');
    expect(text).toContain('4,500');
    expect(text).toContain('1,056,320');
    expect(text).toContain('Observed months');
    expect(text).toContain('Method: Relational schema inventory');
    expect(text).toContain('Method used: Monthly aggregation');
    expect(text).toContain('Methods used: PCA, K-means');
    expect(text).not.toContain('Behavioral outliers');
    expect(text).not.toContain('Selected K-means solution');
    expect(text).not.toContain('Segment population');
    expect(segments).not.toHaveBeenCalled();
  });

  it('links to each detailed analytical area', () => {
    const fixture = TestBed.createComponent(Overview);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    ).map((link) => link.getAttribute('href'));

    expect(links).toContain('/behavior');
    expect(links).toContain('/segments');
    expect(links).toContain('/validation');
  });
});
