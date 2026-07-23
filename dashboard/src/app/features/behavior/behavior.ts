import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { forkJoin } from 'rxjs';

import { MonthlyActivity, ServiceRule } from '../../core/models/dashboard.models';
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
})
export class Behavior implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activity = signal<MonthlyActivity[]>([]);
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
        axisLabel: { color: '#71807d' },
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

  readonly peakMonth = computed(() => {
    const rows = this.activity();
    const metric = this.selectedMetric();
    if (!rows.length) return undefined;
    return rows.reduce((best, row) => (row[metric] > best[metric] ? row : best));
  });

  readonly latestAccounts = computed(() => this.activity().at(-1)?.active_account_count ?? 0);
  readonly totalTransactions = computed(() =>
    this.activity().reduce((sum, row) => sum + row.transaction_count, 0),
  );

  ngOnInit(): void {
    forkJoin({
      activity: this.api.activity(),
      rules: this.api.serviceRules(),
    }).subscribe({
      next: ({ activity, rules }) => {
        this.activity.set(activity);
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
