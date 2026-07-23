import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { forkJoin } from 'rxjs';

import {
  OutlierCase,
  SegmentPoint,
  SegmentProfile,
} from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart } from '../../shared/chart/chart';

@Component({
  selector: 'ti-segments',
  imports: [CommonModule, Chart],
  templateUrl: './segments.html',
  styleUrl: './segments.scss',
})
export class Segments implements OnInit {
  private readonly api = inject(DashboardApi);
  readonly colors = ['#2aa99a', '#577590', '#d6a438', '#e26450', '#8d6cab'];

  readonly loading = signal(true);
  readonly error = signal('');
  readonly segments = signal<SegmentProfile[]>([]);
  readonly points = signal<SegmentPoint[]>([]);
  readonly outliers = signal<OutlierCase[]>([]);
  readonly selectedSegmentId = signal(0);
  readonly activeTab = signal<'profiles' | 'outliers'>('profiles');
  readonly selectedOutlier = signal<OutlierCase | undefined>(undefined);
  readonly outlierSegmentFilter = signal<number | 'all'>('all');

  readonly selectedSegment = computed(() =>
    this.segments().find((segment) => segment.segment_id === this.selectedSegmentId()),
  );

  readonly filteredOutliers = computed(() => {
    const filter = this.outlierSegmentFilter();
    return filter === 'all'
      ? this.outliers()
      : this.outliers().filter((item) => item.segment_id === filter);
  });

  readonly populationOption = computed<EChartsCoreOption>(() => ({
    aria: { enabled: true },
    color: ['#168f83'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 18, right: 18, top: 10, bottom: 30, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#71807d' },
      splitLine: { lineStyle: { color: '#e7e8e4' } },
    },
    yAxis: {
      type: 'category',
      data: this.segments().map((segment) => segment.segment_name),
      axisLabel: { color: '#465653', width: 230, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: 16,
        data: this.segments().map((segment, index) => ({
          value: segment.population_size,
          itemStyle: { color: this.colors[index], borderRadius: [0, 7, 7, 0] },
        })),
      },
    ],
  }));

  readonly scatterOption = computed<EChartsCoreOption>(() => ({
    aria: { enabled: true },
    color: this.colors,
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: '#63716f', fontSize: 10 },
    },
    grid: { left: 54, right: 24, top: 20, bottom: 78 },
    xAxis: {
      type: 'value',
      name: 'PCA component 1',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: '#71807d' },
      splitLine: { lineStyle: { color: '#e7e8e4' } },
    },
    yAxis: {
      type: 'value',
      name: 'PCA component 2',
      nameLocation: 'middle',
      nameGap: 38,
      axisLabel: { color: '#71807d' },
      splitLine: { lineStyle: { color: '#e7e8e4' } },
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
  }));

  ngOnInit(): void {
    forkJoin({
      segments: this.api.segments(),
      points: this.api.segmentPoints(),
      outliers: this.api.outliers(),
    }).subscribe({
      next: ({ segments, points, outliers }) => {
        this.segments.set(segments);
        this.points.set(points);
        this.outliers.set(outliers);
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
