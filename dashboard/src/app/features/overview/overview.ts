import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { forkJoin } from 'rxjs';

import { MonthlyActivity, SummaryMetric } from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart } from '../../shared/chart/chart';

type OverviewMetric = SummaryMetric & { method: string };

@Component({
  selector: 'ti-overview',
  imports: [CommonModule, RouterLink, Chart],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly summary = signal<SummaryMetric[]>([]);
  readonly activity = signal<MonthlyActivity[]>([]);

  readonly featuredMetrics = computed<OverviewMetric[]>(() => {
    const sourceTables: SummaryMetric = {
      section: 'Source',
      metric: 'Source tables',
      numeric_value: 8,
      display_value: '8',
      note: 'Original Berka relational tables',
    };
    const wanted = ['Accounts', 'Transactions', 'Observed months'];
    const preparedMetrics = wanted
      .map((metric) => this.summary().find((item) => item.metric === metric))
      .filter((item): item is SummaryMetric => Boolean(item));
    const methods: Record<string, string> = {
      'Source tables': 'Relational schema inventory',
      Accounts: 'Account-level row count',
      Transactions: 'Clean transaction-row count',
      'Observed months': 'Monthly resampling',
    };
    return [sourceTables, ...preparedMetrics].map((metric) => ({
      ...metric,
      method: methods[metric.metric],
    }));
  });

  readonly activityOption = computed<EChartsCoreOption>(() => {
    const rows = this.activity();
    return {
      aria: { enabled: true },
      color: ['#25b7a7', '#d8a73e'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: '#63716f' } },
      grid: { left: 48, right: 24, top: 20, bottom: 54 },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.month.slice(0, 7)),
        axisLabel: { color: '#71807d', hideOverlap: true },
        axisLine: { lineStyle: { color: '#d7dcd7' } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Transactions',
          nameTextStyle: { color: '#71807d' },
          axisLabel: { color: '#71807d' },
          splitLine: { lineStyle: { color: '#e7e8e4' } },
        },
        {
          type: 'value',
          name: 'Accounts',
          nameTextStyle: { color: '#71807d' },
          axisLabel: { color: '#71807d' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Transactions',
          type: 'line',
          data: rows.map((row) => row.transaction_count),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3 },
          areaStyle: { opacity: 0.08 },
        },
        {
          name: 'Active accounts',
          type: 'line',
          yAxisIndex: 1,
          data: rows.map((row) => row.active_account_count),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
        },
      ],
    };
  });

  readonly observedPeriod = computed(() => {
    const rows = this.activity();
    if (!rows.length) return 'No monthly data';
    return `${rows[0].month.slice(0, 4)}–${rows.at(-1)?.month.slice(0, 4)}`;
  });

  ngOnInit(): void {
    forkJoin({
      summary: this.api.summary(),
      activity: this.api.activity(),
    }).subscribe({
      next: ({ summary, activity }) => {
        this.summary.set(summary);
        this.activity.set(activity);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The prepared dashboard data could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}
