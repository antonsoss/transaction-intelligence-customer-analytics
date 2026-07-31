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
import { ThemeService } from '../../core/services/theme';
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
  private readonly theme = inject(ThemeService);
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
    const palette = this.theme.chartPalette();
    return {
      aria: { enabled: true },
      color: [palette.primary, palette.link],
      tooltip: {
        trigger: 'axis',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.text },
      },
      legend: { bottom: 0, textStyle: { color: palette.muted } },
      grid: { left: 48, right: 24, top: 20, bottom: 54 },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.month.slice(0, 7)),
        axisLabel: { color: palette.muted, hideOverlap: true },
        axisLine: { lineStyle: { color: palette.border } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Transactions',
          nameTextStyle: { color: palette.muted },
          axisLabel: { color: palette.muted },
          splitLine: { lineStyle: { color: palette.grid } },
        },
        {
          type: 'value',
          name: 'Accounts',
          nameTextStyle: { color: palette.muted },
          axisLabel: { color: palette.muted },
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
