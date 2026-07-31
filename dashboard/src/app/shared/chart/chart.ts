import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption, EChartsType, ECElementEvent } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  MarkLineComponent,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
]);

export interface ChartClickEvent {
  name: string;
  dataIndex: number;
}

@Component({
  selector: 'ti-chart',
  template: '<div #chartHost class="chart-host" role="img" [attr.aria-label]="ariaLabel()"></div>',
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chart implements AfterViewInit, OnDestroy {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Analytical chart');
  readonly chartClick = output<ChartClickEvent>();

  private readonly chartHost = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private chart?: EChartsType;
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      const option = this.option();
      this.chart?.setOption(this.withBrandTypography(option), true);
    });
  }

  ngAfterViewInit(): void {
    const host = this.chartHost().nativeElement;
    this.chart = echarts.init(host, undefined, { renderer: 'canvas' });
    this.chart.setOption(this.withBrandTypography(this.option()));
    this.chart.on('click', (event: ECElementEvent) => {
      if (event.componentType === 'series') {
        this.chartClick.emit({ name: event.name, dataIndex: event.dataIndex });
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private withBrandTypography(option: EChartsCoreOption): EChartsCoreOption {
    return {
      textStyle: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 400,
      },
      ...option,
    };
  }
}
