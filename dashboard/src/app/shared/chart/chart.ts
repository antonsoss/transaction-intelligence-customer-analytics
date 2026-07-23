import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
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
  template: '<div #chartHost class="chart-host" role="img" [attr.aria-label]="ariaLabel"></div>',
  styles: [
    `
      :host,
      .chart-host {
        display: block;
        height: 100%;
        min-height: inherit;
        width: 100%;
      }
    `,
  ],
})
export class Chart implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartHost', { static: true }) private chartHost!: ElementRef<HTMLDivElement>;
  @Input({ required: true }) option!: EChartsCoreOption;
  @Input() ariaLabel = 'Analytical chart';

  private chart?: EChartsType;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartHost.nativeElement, undefined, { renderer: 'canvas' });
    this.chart.setOption(this.option);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(this.chartHost.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['option'] && this.chart) {
      this.chart.setOption(this.option, true);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }
}
