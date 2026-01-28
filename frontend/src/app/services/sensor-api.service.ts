import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SensorStats, SensorSummary, SensorDetail } from '../models/sensor.models';

@Injectable({
  providedIn: 'root',
})
export class SensorApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getStats(): Observable<SensorStats> {
    return this.http.get<SensorStats>(`${this.baseUrl}/stats`).pipe(
      catchError((error) => {
        console.error('Failed to fetch stats:', error);
        return throwError(() => new Error('Failed to fetch statistics'));
      })
    );
  }

  getAllSensors(): Observable<SensorSummary[]> {
    return this.http.get<SensorSummary[]>(`${this.baseUrl}/sensors`).pipe(
      catchError((error) => {
        console.error('Failed to fetch sensors:', error);
        return throwError(() => new Error('Failed to fetch sensors'));
      })
    );
  }

  getSensor(sensorId: number): Observable<SensorDetail> {
    return this.http.get<SensorDetail>(`${this.baseUrl}/sensors/${sensorId}`).pipe(
      catchError((error) => {
        console.error(`Failed to fetch sensor ${sensorId}:`, error);
        return throwError(() => new Error(`Failed to fetch sensor ${sensorId}`));
      })
    );
  }
}
