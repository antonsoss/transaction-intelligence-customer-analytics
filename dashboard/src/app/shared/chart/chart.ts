import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  ScatterChart,
  TooltipComponent,
]);

@Component({
  selector: 'ti-chart',
  template: '<div #chartHost class="chart-host" role="img" [attr.aria-label]="ariaLabel()"></div>',
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chart implements AfterViewInit, OnDestroy {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Analytical chart');

  private readonly chartHost = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private chart?: EChartsType;
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      const option = this.option();
      this.chart?.setOption(option, true);
    });
  }

  ngAfterViewInit(): void {
    const host = this.chartHost().nativeElement;
    this.chart = echarts.init(host, undefined, { renderer: 'canvas' });
    this.chart.setOption(this.option());

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }
}
