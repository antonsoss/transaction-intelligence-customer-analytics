import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EChartsCoreOption } from 'echarts/core';
import { of } from 'rxjs';

import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart } from '../../shared/chart/chart';
import { Behavior } from './behavior';

@Component({
  selector: 'ti-chart',
  standalone: true,
  template: '',
})
class ChartStub {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Analytical chart');
}

describe('Behavior', () => {
  const api = {
    activity: vi.fn(() =>
      of([
        {
          month: '1998-01-01',
          transaction_count: 100,
          total_inflow: 1000,
          total_outflow: 500,
          withdrawal_count: 20,
          withdrawal_value: 500,
          active_account_count: 50,
          net_cash_flow: 500,
          transactions_per_active_account: 2,
          withdrawals_per_active_account: 0.4,
          inflow_per_active_account: 20,
          outflow_per_active_account: 10,
        },
      ]),
    ),
    transactionForecast: vi.fn(() =>
      of([
        {
          month: '1997-11-01',
          period: 'training' as const,
          observed_transaction_count: 100,
          seasonal_naive: null,
          sarima_forecast: null,
          sarima_lower_95: null,
          sarima_upper_95: null,
        },
        {
          month: '1997-12-01',
          period: 'training' as const,
          observed_transaction_count: 120,
          seasonal_naive: null,
          sarima_forecast: null,
          sarima_lower_95: null,
          sarima_upper_95: null,
        },
        {
          month: '1998-01-01',
          period: 'test' as const,
          observed_transaction_count: 130,
          seasonal_naive: 110,
          sarima_forecast: 125,
          sarima_lower_95: 115,
          sarima_upper_95: 135,
        },
        {
          month: '1998-02-01',
          period: 'test' as const,
          observed_transaction_count: 125,
          seasonal_naive: 112,
          sarima_forecast: 128,
          sarima_lower_95: 113,
          sarima_upper_95: 143,
        },
      ]),
    ),
    serviceRules: vi.fn(() => of([])),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Behavior],
      providers: [{ provide: DashboardApi, useValue: api }],
    })
      .overrideComponent(Behavior, {
        remove: { imports: [Chart] },
        add: { imports: [ChartStub] },
      })
      .compileComponents();
  });

  it('renders the chronological forecast before the MAE comparison', () => {
    const fixture = TestBed.createComponent(Behavior);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const chart = host.querySelector('.forecast-chart');
    const score = host.querySelector('.forecast-score');

    expect(api.transactionForecast).toHaveBeenCalledOnce();
    expect(chart).not.toBeNull();
    expect(score).not.toBeNull();
    expect(chart?.compareDocumentPosition(score as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('builds the training, test, baseline, SARIMA, and confidence-band series', () => {
    const fixture = TestBed.createComponent(Behavior);
    fixture.detectChanges();

    type TestSeries = {
      name?: string;
      data?: Array<number | null>;
    };
    const option = fixture.componentInstance.forecastOption() as {
      series: TestSeries[];
    };
    const series = new Map(option.series.map((item) => [item.name, item.data]));

    expect(series.get('Training history')).toEqual([100, 120, null, null]);
    expect(series.get('Observed test period')).toEqual([null, null, 130, 125]);
    expect(series.get('Seasonal naive')).toEqual([null, null, 110, 112]);
    expect(series.get('SARIMA')).toEqual([null, null, 125, 128]);
    expect(series.get('SARIMA 95% confidence interval')).toEqual([null, null, 20, 30]);
  });
});
