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
  ClusteringEvaluation,
  OutlierCase,
  SegmentPoint,
  SegmentProfile,
} from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { ThemeService } from '../../core/services/theme';
import { Chart, ChartClickEvent } from '../../shared/chart/chart';

type KMeansEvaluationMetric = 'inertia' | 'silhouette' | 'davies_bouldin';
type GmmEvaluationMetric = 'aic' | 'bic' | 'silhouette' | 'davies_bouldin';

interface EvaluationMetricChoice<TMetric extends string> {
  key: TMetric;
  label: string;
  guidance: string;
}

@Component({
  selector: 'ti-segments',
  imports: [CommonModule, Chart],
  templateUrl: './segments.html',
  styleUrl: './segments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segments implements OnInit {
  private readonly api = inject(DashboardApi);
  private readonly theme = inject(ThemeService);
  readonly colors = computed(() => [...this.theme.chartPalette().series]);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly segments = signal<SegmentProfile[]>([]);
  readonly points = signal<SegmentPoint[]>([]);
  readonly outliers = signal<OutlierCase[]>([]);
  readonly evaluation = signal<ClusteringEvaluation[]>([]);
  readonly selectedSegmentId = signal(0);
  readonly activeTab = signal<'profiles' | 'outliers'>('profiles');
  readonly selectedOutlier = signal<OutlierCase | undefined>(undefined);
  readonly outlierSegmentFilter = signal<number | 'all'>('all');
  readonly kmeansMetric = signal<KMeansEvaluationMetric>('silhouette');
  readonly gmmMetric = signal<GmmEvaluationMetric>('bic');

  readonly kmeansMetricChoices: EvaluationMetricChoice<KMeansEvaluationMetric>[] = [
    {
      key: 'inertia',
      label: 'Elbow',
      guidance: 'Lower is better, but the important clue is where improvement begins to slow.',
    },
    {
      key: 'silhouette',
      label: 'Silhouette',
      guidance: 'Higher values indicate more clearly separated groups.',
    },
    {
      key: 'davies_bouldin',
      label: 'Davies–Bouldin',
      guidance: 'Lower values indicate more compact and separated groups.',
    },
  ];

  readonly gmmMetricChoices: EvaluationMetricChoice<GmmEvaluationMetric>[] = [
    {
      key: 'aic',
      label: 'AIC',
      guidance: 'Lower values indicate a better balance between fit and complexity.',
    },
    {
      key: 'bic',
      label: 'BIC',
      guidance: 'Lower values are better and penalize added model complexity more strongly.',
    },
    {
      key: 'silhouette',
      label: 'Silhouette',
      guidance: 'Higher values indicate more clearly separated hard-label groups.',
    },
    {
      key: 'davies_bouldin',
      label: 'Davies–Bouldin',
      guidance: 'Lower values indicate more compact and separated hard-label groups.',
    },
  ];

  readonly selectedSegment = computed(() =>
    this.segments().find((segment) => segment.segment_id === this.selectedSegmentId()),
  );

  readonly totalAccounts = computed(() =>
    this.segments().reduce((total, segment) => total + segment.population_size, 0),
  );

  readonly filteredOutliers = computed(() => {
    const filter = this.outlierSegmentFilter();
    return filter === 'all'
      ? this.outliers()
      : this.outliers().filter((item) => item.segment_id === filter);
  });

  readonly selectedKMeansEvaluation = computed(() =>
    this.evaluation().find((row) => row.algorithm === 'K-means' && row.is_selected_solution),
  );

  readonly selectedGmmEvaluation = computed(() =>
    this.evaluation().find((row) => row.algorithm === 'GMM' && row.is_selected_k),
  );

  readonly nextKMeansEvaluation = computed(() =>
    this.evaluation().find((row) => row.algorithm === 'K-means' && row.k === 6),
  );

  readonly lowestGmmBicEvaluation = computed(() => {
    const rows = this.evaluation().filter(
      (row): row is ClusteringEvaluation & { bic: number } =>
        row.algorithm === 'GMM' && row.bic !== null,
    );
    return rows.reduce<ClusteringEvaluation | undefined>(
      (lowest, row) => (!lowest || row.bic < (lowest.bic ?? Infinity) ? row : lowest),
      undefined,
    );
  });

  readonly selectedKMeansMetric = computed(
    () =>
      this.kmeansMetricChoices.find((choice) => choice.key === this.kmeansMetric()) ??
      this.kmeansMetricChoices[0],
  );

  readonly selectedGmmMetric = computed(
    () =>
      this.gmmMetricChoices.find((choice) => choice.key === this.gmmMetric()) ??
      this.gmmMetricChoices[0],
  );

  readonly kmeansEvaluationOption = computed<EChartsCoreOption>(() =>
    this.evaluationOption(
      'K-means',
      this.kmeansMetric(),
      this.selectedKMeansMetric().label,
      this.theme.chartPalette().primary,
      'Selected K = 5',
    ),
  );

  readonly gmmEvaluationOption = computed<EChartsCoreOption>(() =>
    this.evaluationOption(
      'GMM',
      this.gmmMetric(),
      this.selectedGmmMetric().label,
      this.theme.chartPalette().code,
      'Matched K = 5',
    ),
  );

  readonly populationDonutOption = computed<EChartsCoreOption>(() => {
    const palette = this.theme.chartPalette();
    const colors = this.colors();
    return {
      aria: {
        enabled: true,
        description:
          'Customer segment shares. Together, the five segments represent all observed accounts.',
      },
      color: colors,
      title: {
        text: Intl.NumberFormat('en-CA').format(this.totalAccounts()),
        subtext: 'accounts',
        left: '54%',
        top: '40%',
        textAlign: 'center',
        textStyle: {
          color: palette.text,
          fontSize: 28,
          fontWeight: 500,
        },
        subtextStyle: {
          color: palette.muted,
          fontSize: 12,
          fontWeight: 500,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>{c} accounts ({d}%)',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.text },
      },
      series: [
        {
          name: 'Customer segments',
          type: 'pie',
          radius: ['50%', '70%'],
          center: ['54%', '50%'],
          selectedMode: 'single',
          selectedOffset: 10,
          minAngle: 4,
          percentPrecision: 1,
          avoidLabelOverlap: true,
          label: {
            color: palette.text,
            fontSize: 11,
            fontWeight: 500,
            formatter: '{d}%',
          },
          labelLine: {
            length: 10,
            length2: 5,
            lineStyle: { color: palette.border },
          },
          data: this.segments().map((segment, index) => ({
            value: segment.population_size,
            name: segment.segment_name,
            selected: segment.segment_id === this.selectedSegmentId(),
            itemStyle: {
              color: colors[index],
              borderColor: palette.surface,
              borderWidth: 4,
              borderRadius: 6,
            },
            emphasis: {
              scale: true,
              scaleSize: 8,
            },
          })),
        },
      ],
    };
  });

  readonly scatterOption = computed<EChartsCoreOption>(() => {
    const palette = this.theme.chartPalette();
    return {
      aria: { enabled: true },
      color: this.colors(),
      tooltip: {
        trigger: 'item',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.text },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: palette.muted, fontSize: 10 },
      },
      grid: { left: 54, right: 24, top: 20, bottom: 78 },
      xAxis: {
        type: 'value',
        name: 'PCA component 1',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: palette.muted },
        axisLabel: { color: palette.muted },
        axisLine: { lineStyle: { color: palette.border } },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      yAxis: {
        type: 'value',
        name: 'PCA component 2',
        nameLocation: 'middle',
        nameGap: 38,
        nameTextStyle: { color: palette.muted },
        axisLabel: { color: palette.muted },
        axisLine: { lineStyle: { color: palette.border } },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: this.segments().map((segment) => ({
        name: segment.segment_name,
        type: 'scatter',
        symbolSize: 6,
        data: this.points()
          .filter((point) => point.segment_id === segment.segment_id)
          .map((point) => [point.pca_component_1, point.pca_component_2]),
        emphasis: { focus: 'series' },
      })),
    };
  });

  private evaluationOption(
    algorithm: ClusteringEvaluation['algorithm'],
    metric: KMeansEvaluationMetric | GmmEvaluationMetric,
    metricLabel: string,
    color: string,
    selectedLabel: string,
  ): EChartsCoreOption {
    const palette = this.theme.chartPalette();
    const rows = this.evaluation()
      .filter((row) => row.algorithm === algorithm && row[metric] !== null)
      .sort((left, right) => left.k - right.k);

    return {
      aria: {
        enabled: true,
        description: `${metricLabel} values for ${algorithm} models with two through eight groups.`,
      },
      color: [color],
      tooltip: {
        trigger: 'axis',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.text },
      },
      grid: { left: 28, right: 34, top: 30, bottom: 54, containLabel: true },
      xAxis: {
        type: 'value',
        name: algorithm === 'K-means' ? 'Number of segments (K)' : 'Number of components',
        nameLocation: 'middle',
        nameGap: 34,
        nameTextStyle: { color: palette.muted },
        min: 2,
        max: 8,
        interval: 1,
        axisLabel: { color: palette.muted },
        axisLine: { lineStyle: { color: palette.border } },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      yAxis: {
        type: 'value',
        name: metricLabel,
        nameGap: 22,
        nameTextStyle: { color: palette.muted },
        scale: true,
        axisLabel: {
          color: palette.muted,
          formatter: (value: number) =>
            Math.abs(value) >= 1000
              ? Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value)
              : value.toFixed(2),
        },
        axisLine: { lineStyle: { color: palette.border } },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: [
        {
          name: metricLabel,
          type: 'line',
          symbol: 'circle',
          symbolSize: 9,
          lineStyle: { color, width: 3 },
          data: rows.map((row) => ({
            value: [row.k, row[metric]],
            itemStyle:
              row.k === 5
                ? { color: palette.primary, borderColor: palette.surface, borderWidth: 2 }
                : {},
            symbolSize: row.k === 5 ? 13 : 9,
          })),
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            label: {
              color: palette.primary,
              formatter: selectedLabel,
              position: 'insideEndTop',
            },
            lineStyle: { color: palette.primary, type: 'dashed', width: 2 },
            data: [{ xAxis: 5 }],
          },
        },
      ],
    };
  }

  ngOnInit(): void {
    forkJoin({
      segments: this.api.segments(),
      points: this.api.segmentPoints(),
      outliers: this.api.outliers(),
      evaluation: this.api.clusteringEvaluation(),
    }).subscribe({
      next: ({ segments, points, outliers, evaluation }) => {
        this.segments.set(segments);
        this.points.set(points);
        this.outliers.set(outliers);
        this.evaluation.set(evaluation);
        if (segments.length) this.selectedSegmentId.set(segments[0].segment_id);
        if (outliers.length) this.selectedOutlier.set(outliers[0]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Segment and outlier data could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  chooseSegment(segmentId: number): void {
    this.selectedSegmentId.set(segmentId);
  }

  chooseSegmentFromChart(event: ChartClickEvent): void {
    const segment = this.segments().find((item) => item.segment_name === event.name);
    if (segment) this.chooseSegment(segment.segment_id);
  }

  chooseOutlier(item: OutlierCase): void {
    this.selectedOutlier.set(item);
  }

  setOutlierFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.outlierSegmentFilter.set(value === 'all' ? 'all' : Number(value));
  }

  readableFeature(name: string): string {
    return name.replaceAll('_', ' ');
  }
}
