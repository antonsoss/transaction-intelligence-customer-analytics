import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EChartsCoreOption } from 'echarts/core';
import { of } from 'rxjs';

import type {
  ClusteringEvaluation,
  OutlierCase,
  SegmentPoint,
  SegmentProfile,
} from '../../core/models/dashboard.models';
import { DashboardApi } from '../../core/services/dashboard-api';
import { Chart, ChartClickEvent } from '../../shared/chart/chart';
import { Segments } from './segments';

@Component({
  selector: 'ti-chart',
  standalone: true,
  template: '',
})
class ChartStub {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Analytical chart');
  readonly chartClick = output<ChartClickEvent>();
}

describe('Segments', () => {
  const segment: SegmentProfile = {
    segment_id: 0,
    segment_name: 'Established household users',
    population_size: 1519,
    population_share: 1519 / 4500,
    median_transactions_per_observed_month: 4.2,
    median_average_inflow: 12000,
    median_average_outflow: 11000,
    median_inflow_to_outflow_ratio: 1.09,
    median_average_balance: 45000,
    median_balance_std: 7000,
    median_negative_balance_share: 0,
    median_transaction_diversity: 5,
    median_service_diversity: 3,
    rate_has_card: 0.4,
    rate_has_loan: 0.2,
    rate_has_standing_order: 0.8,
    defining_features: 'High transaction intensity and service diversity.',
    transaction_patterns: 'Regular account activity.',
    balance_characteristics: 'Typical balances are stable.',
    banking_service_usage: 'Standing orders are common.',
    possible_business_relevance: 'Useful for descriptive service planning.',
    limitations: 'A segment is not a permanent customer label.',
    behavioral_outlier_count: 2,
    behavioral_outlier_rate: 2 / 1519,
  };

  const point: SegmentPoint = {
    point_id: 'account-1',
    segment_id: 0,
    segment_name: segment.segment_name,
    pca_component_1: 0.5,
    pca_component_2: -0.25,
  };

  const secondSegment: SegmentProfile = {
    ...segment,
    segment_id: 1,
    segment_name: 'Low-service cash users',
    population_size: 2981,
    population_share: 2981 / 4500,
  };

  const outlier: OutlierCase = {
    case_id: 'account-1',
    segment_id: 0,
    segment_name: segment.segment_name,
    outlier_signal_count: 2,
    top_robust_deviation_feature: 'average_balance',
    top_robust_feature_value: 120000,
    top_robust_feature_segment_median: 45000,
    centroid_distance_percentile_within_segment: 0.995,
    gmm_max_membership_probability: 0.12,
    robust_deviation_score: 8,
    isolation_anomaly_score: 0.7,
    composite_outlier_percentile: 0.99,
    transactions_per_observed_month: 8,
    average_inflow: 30000,
    average_outflow: 29000,
    average_balance: 120000,
    negative_balance_share: 0,
    transaction_diversity: 7,
    service_diversity: 4,
    has_card: true,
    has_loan: false,
    has_standing_order: true,
  };

  const evaluation: ClusteringEvaluation[] = [
    {
      algorithm: 'K-means',
      k: 4,
      inertia: 20231.252337,
      inertia_reduction_from_previous_k: 0.172976,
      aic: null,
      bic: null,
      silhouette: 0.291206,
      davies_bouldin: 1.18429,
      smallest_group: 262,
      largest_group: 1457,
      smallest_group_share: 262 / 4500,
      is_selected_k: false,
      is_selected_solution: false,
    },
    {
      algorithm: 'K-means',
      k: 5,
      inertia: 17075.236757,
      inertia_reduction_from_previous_k: 0.155997,
      aic: null,
      bic: null,
      silhouette: 0.304458,
      davies_bouldin: 1.179629,
      smallest_group: 251,
      largest_group: 1519,
      smallest_group_share: 251 / 4500,
      is_selected_k: true,
      is_selected_solution: true,
    },
    {
      algorithm: 'K-means',
      k: 6,
      inertia: 15580.84623,
      inertia_reduction_from_previous_k: 0.087518,
      aic: null,
      bic: null,
      silhouette: 0.264367,
      davies_bouldin: 1.246993,
      smallest_group: 250,
      largest_group: 1177,
      smallest_group_share: 250 / 4500,
      is_selected_k: false,
      is_selected_solution: false,
    },
    {
      algorithm: 'GMM',
      k: 5,
      inertia: null,
      inertia_reduction_from_previous_k: null,
      aic: -5845.363035,
      bic: -4088.520882,
      silhouette: 0.156777,
      davies_bouldin: 2.138954,
      smallest_group: 288,
      largest_group: 1441,
      smallest_group_share: 288 / 4500,
      is_selected_k: true,
      is_selected_solution: false,
    },
    {
      algorithm: 'GMM',
      k: 8,
      inertia: null,
      inertia_reduction_from_previous_k: null,
      aic: -17888.616869,
      bic: -15073.822324,
      silhouette: 0.132512,
      davies_bouldin: 2.244698,
      smallest_group: 250,
      largest_group: 924,
      smallest_group_share: 250 / 4500,
      is_selected_k: false,
      is_selected_solution: false,
    },
  ];

  const api = {
    segments: vi.fn(() => of([segment, secondSegment])),
    segmentPoints: vi.fn(() => of([point])),
    outliers: vi.fn(() => of([outlier])),
    clusteringEvaluation: vi.fn(() => of(evaluation)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Segments],
      providers: [{ provide: DashboardApi, useValue: api }],
    })
      .overrideComponent(Segments, {
        remove: { imports: [Chart] },
        add: { imports: [ChartStub] },
      })
      .compileComponents();
  });

  it('names the methods used for segment profiles and charts', () => {
    const fixture = TestBed.createComponent(Segments);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('K-means was fitted for K = 2–8');
    expect(text).toContain('Yeo-Johnson transformation and standardization');
    expect(text).toContain('Median value among the accounts assigned to this segment');
    expect(text).toContain('Percentage of accounts in this segment');
    expect(text).toContain('First two PCA components');
    expect(text).toContain('How to read this segment');
    expect(text).toContain('What this pattern may suggest');
    expect(text).toContain('Limit to keep in mind');
    expect(text).not.toContain('Basis:');
  });

  it('shows why five K-means segments were selected over the GMM challenger', () => {
    const fixture = TestBed.createComponent(Segments);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.clusteringEvaluation).toHaveBeenCalledOnce();
    expect(text).toContain('Why five segments?');
    expect(text).toContain('Why K-means instead of GMM?');
    expect(text).toContain('Highest tested');
    expect(text).toContain('Lowest tested');
    expect(text).toContain('GMM · 5 components');
    expect(text).toContain('K = 8');

    type TestSeries = {
      data: Array<{ value: [number, number] }>;
    };
    const option = fixture.componentInstance.kmeansEvaluationOption() as {
      series: TestSeries[];
    };
    expect(option.series[0].data).toEqual([
      { value: [4, 0.291206], itemStyle: {}, symbolSize: 9 },
      {
        value: [5, 0.304458],
        itemStyle: {
          color: expect.any(String),
          borderColor: expect.any(String),
          borderWidth: 2,
        },
        symbolSize: 13,
      },
      { value: [6, 0.264367], itemStyle: {}, symbolSize: 9 },
    ]);
  });

  it('uses one interactive donut to show and select segment population', () => {
    const fixture = TestBed.createComponent(Segments);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    const option = fixture.componentInstance.populationDonutOption() as {
      title: { text: string; subtext: string };
      series: Array<{
        type: string;
        data: Array<{ name: string; value: number; selected: boolean }>;
      }>;
    };

    expect(element.querySelector('.segment-picker')).toBeNull();
    expect(text).not.toContain('Relative size');
    expect(text).toContain('100% of accounts');
    expect(option.title).toMatchObject({ text: '4,500', subtext: 'accounts' });
    expect(option.series[0].type).toBe('pie');
    expect(option.series[0].data.reduce((total, item) => total + item.value, 0)).toBe(4500);

    fixture.componentInstance.chooseSegmentFromChart({
      name: secondSegment.segment_name,
      dataIndex: 1,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedSegmentId()).toBe(secondSegment.segment_id);
    const updatedOption = fixture.componentInstance.populationDonutOption() as {
      series: Array<{
        type: string;
        data: Array<{ name: string; value: number; selected: boolean }>;
      }>;
    };
    expect(
      updatedOption.series[0].data.find((item) => item.name === secondSegment.segment_name),
    ).toMatchObject({ selected: true });
    expect(element.querySelectorAll('.segment-key button[aria-pressed="true"]')).toHaveLength(1);
  });

  it('names all four methods used to select outlier cases', () => {
    const fixture = TestBed.createComponent(Segments);
    fixture.detectChanges();
    fixture.componentInstance.activeTab.set('outliers');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('K-means centre distance');
    expect(text).toContain('low GMM membership');
    expect(text).toContain('robust within-segment deviation');
    expect(text).toContain('Isolation Forest');
    expect(text).toContain('robust median/MAD comparison');
  });
});
