import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { forkJoin } from 'rxjs';

import {
  MonthlyActivity,
  MonthlyTransactionForecast,
  ServiceRule,
} from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart } from '../../shared/chart/chart';

type ActivityMetric =
  | 'transaction_count'
  | 'active_account_count'
  | 'total_inflow'
  | 'total_outflow'
  | 'net_cash_flow';

@Component({
  selector: 'ti-behavior',
  imports: [CommonModule, Chart],
  templateUrl: './behavior.html',
  styleUrl: './behavior.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Behavior implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activity = signal<MonthlyActivity[]>([]);
  readonly forecast = signal<MonthlyTransactionForecast[]>([]);
  readonly rules = signal<ServiceRule[]>([]);
  readonly selectedMetric = signal<ActivityMetric>('transaction_count');
  readonly minimumLift = signal(1);

  readonly metricOptions: { value: ActivityMetric; label: string }[] = [
    { value: 'transaction_count', label: 'Transaction count' },
    { value: 'active_account_count', label: 'Active accounts' },
    { value: 'total_inflow', label: 'Total inflow' },
    { value: 'total_outflow', label: 'Total outflow' },
    { value: 'net_cash_flow', label: 'Net cash flow' },
  ];

  readonly filteredRules = computed(() =>
    this.rules().filter((rule) => rule.lift >= this.minimumLift()),
  );

  readonly selectedMetricLabel = computed(
    () =>
      this.metricOptions.find((option) => option.value === this.selectedMetric())?.label ??
      'Activity',
  );

  readonly activityOption = computed<EChartsCoreOption>(() => {
    const rows = this.activity();
    const metric = this.selectedMetric();
    const values = rows.map((row) => row[metric]);
    const rolling = values.map((_, index) => {
      const window = values.slice(Math.max(0, index - 2), index + 1);
      return window.reduce((sum, value) => sum + value, 0) / window.length;
    });
    return {
      aria: { enabled: true },
      color: ['#168f83', '#d8a73e'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: '#63716f' } },
      grid: { left: 60, right: 22, top: 24, bottom: 55 },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.month.slice(0, 7)),
        axisLabel: { color: '#71807d', hideOverlap: true },
        axisLine: { lineStyle: { color: '#d7dcd7' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#71807d',
          formatter: (value: number) => `${value / 1_000_000}M`,
        },
        splitLine: { lineStyle: { color: '#e7e8e4' } },
      },
      series: [
        {
          name: this.selectedMetricLabel(),
          type: 'line',
          data: values,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.08 },
        },
        {
          name: '3-month average',
          type: 'line',
          data: rolling,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    };
  });

  readonly cashFlowOption = computed<EChartsCoreOption>(() => {
    const rows = this.activity();
    return {
      aria: { enabled: true },
      color: ['#25b7a7', '#e56652'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: '#63716f' } },
      grid: { left: 66, right: 20, top: 20, bottom: 55 },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.month.slice(0, 7)),
        axisLabel: { color: '#71807d', hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#71807d' },
        splitLine: { lineStyle: { color: '#e7e8e4' } },
      },
      series: [
        {
          name: 'Inflow',
          type: 'line',
          data: rows.map((row) => row.total_inflow),
          smooth: true,
          showSymbol: false,
        },
        {
          name: 'Outflow',
          type: 'line',
          data: rows.map((row) => row.total_outflow),
          smooth: true,
          showSymbol: false,
        },
      ],
    };
  });

  readonly forecastOption = computed<EChartsCoreOption>(() => {
    const rows = this.forecast();
    const firstTestMonth = rows.find((row) => row.period === 'test')?.month.slice(0, 7);
    const labels = rows.map((row) => row.month.slice(0, 7));
    const confidenceLower = rows.map((row) => row.sarima_lower_95);
    const confidenceRange = rows.map((row) =>
      row.sarima_lower_95 === null || row.sarima_upper_95 === null
        ? null
        : row.sarima_upper_95 - row.sarima_lower_95,
    );

    return {
      aria: { enabled: true },
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        data: [
          'Training history',
          'Observed test period',
          'Seasonal naive',
          'SARIMA',
          'SARIMA 95% confidence interval',
        ],
        textStyle: { color: '#a9b7b4' },
      },
      grid: { left: 66, right: 26, top: 28, bottom: 74 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: { color: '#9cadab', hideOverlap: true },
        axisLine: { lineStyle: { color: '#4b5d69' } },
      },
      yAxis: {
        type: 'value',
        name: 'Transactions',
        nameTextStyle: { color: '#9cadab', padding: [0, 0, 0, 8] },
        axisLabel: {
          color: '#9cadab',
          formatter: (value: number) => `${Math.round(value / 1_000)}K`,
        },
        splitLine: { lineStyle: { color: '#293e4b' } },
      },
      series: [
        {
          name: 'Confidence lower bound',
          type: 'line',
          data: confidenceLower,
          stack: 'sarima-confidence',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          tooltip: { show: false },
          z: 1,
        },
        {
          name: 'SARIMA 95% confidence interval',
          type: 'line',
          data: confidenceRange,
          stack: 'sarima-confidence',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          areaStyle: { color: '#e56652', opacity: 0.2 },
          tooltip: { show: false },
          z: 1,
        },
        {
          name: 'Training history',
          type: 'line',
          data: rows.map((row) =>
            row.period === 'training' ? row.observed_transaction_count : null,
          ),
          symbol: 'none',
          lineStyle: { color: '#72a7e8', width: 2 },
          itemStyle: { color: '#72a7e8' },
          z: 3,
        },
        {
          name: 'Observed test period',
          type: 'line',
          data: rows.map((row) =>
            row.period === 'test' ? row.observed_transaction_count : null,
          ),
          symbol: 'none',
          lineStyle: { color: '#f4f7f6', width: 2.6 },
          itemStyle: { color: '#f4f7f6' },
          markLine: firstTestMonth
            ? {
                symbol: 'none',
                silent: true,
                label: {
                  color: '#a9b7b4',
                  formatter: 'Test period',
                  position: 'insideEndTop',
                },
                lineStyle: { color: '#83928f', type: 'dotted', width: 1.5 },
                data: [{ xAxis: firstTestMonth }],
              }
            : undefined,
          z: 4,
        },
        {
          name: 'Seasonal naive',
          type: 'line',
          data: rows.map((row) => row.seasonal_naive),
          symbol: 'none',
          lineStyle: { color: '#e0ad42', type: 'dashed', width: 2 },
          itemStyle: { color: '#e0ad42' },
          z: 3,
        },
        {
          name: 'SARIMA',
          type: 'line',
          data: rows.map((row) => row.sarima_forecast),
          symbol: 'none',
          lineStyle: { color: '#f27667', type: 'dashed', width: 2.2 },
          itemStyle: { color: '#f27667' },
          z: 4,
        },
      ],
    };
  });

  readonly peakMonth = computed(() => {
    const rows = this.activity();
    const metric = this.selectedMetric();
    if (!rows.length) return undefined;
    return rows.reduce((best, row) => (row[metric] > best[metric] ? row : best));
  });

  readonly latestAccounts = computed(() => this.activity().at(-1)?.active_account_count ?? 0);
  readonly latestTransactionsPerActiveAccount = computed(
    () => this.activity().at(-1)?.transactions_per_active_account ?? 0,
  );
  readonly latestActivityMonth = computed(() => this.activity().at(-1)?.month ?? '');

  ngOnInit(): void {
    forkJoin({
      activity: this.api.activity(),
      forecast: this.api.transactionForecast(),
      rules: this.api.serviceRules(),
    }).subscribe({
      next: ({ activity, forecast, rules }) => {
        this.activity.set(activity);
        this.forecast.set(forecast);
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Behavioral and monthly data could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  setMetric(event: Event): void {
    this.selectedMetric.set((event.target as HTMLSelectElement).value as ActivityMetric);
  }

  setMinimumLift(event: Event): void {
    this.minimumLift.set(Number((event.target as HTMLSelectElement).value));
  }
}
