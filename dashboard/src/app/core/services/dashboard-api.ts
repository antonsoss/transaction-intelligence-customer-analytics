import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  HealthResponse,
  MonthlyActivity,
  OutlierCase,
  SegmentPoint,
  SegmentProfile,
  ServiceRule,
  SummaryMetric,
  ValidationOverview,
} from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  health(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }

  summary(): Observable<SummaryMetric[]> {
    return this.http.get<SummaryMetric[]>(`${this.baseUrl}/summary`);
  }

  activity(): Observable<MonthlyActivity[]> {
    return this.http.get<MonthlyActivity[]>(`${this.baseUrl}/activity`);
  }

  serviceRules(minimumLift = 1): Observable<ServiceRule[]> {
    const params = new HttpParams().set('minimum_lift', minimumLift);
    return this.http.get<ServiceRule[]>(`${this.baseUrl}/service-rules`, { params });
  }

  segments(): Observable<SegmentProfile[]> {
    return this.http.get<SegmentProfile[]>(`${this.baseUrl}/segments`);
  }

  segmentPoints(): Observable<SegmentPoint[]> {
    return this.http.get<SegmentPoint[]>(`${this.baseUrl}/segments/points`);
  }

  outliers(minimumSignals = 2): Observable<OutlierCase[]> {
    const params = new HttpParams().set('minimum_signals', minimumSignals);
    return this.http.get<OutlierCase[]>(`${this.baseUrl}/outliers`, { params });
  }

  validation(): Observable<ValidationOverview> {
    return this.http.get<ValidationOverview>(`${this.baseUrl}/validation`);
  }
}
