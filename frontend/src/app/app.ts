import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorApiService } from './services/sensor-api.service';
import { WebSocketService } from './services/websocket.service';
import { SensorStats, SensorSummary, SensorDetail } from './models/sensor.models';
import { StatsCardComponent } from './components/stats-card/stats-card.component';
import { SensorTableComponent } from './components/sensor-table/sensor-table.component';
import { SensorDetailComponent } from './components/sensor-detail/sensor-detail.component';
import { ErrorBannerComponent } from './components/error-banner/error-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardComponent,
    SensorTableComponent,
    SensorDetailComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  private readonly apiService = inject(SensorApiService);
  readonly wsService = inject(WebSocketService);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  stats = signal<SensorStats | null>(null);
  sensors = signal<SensorSummary[]>([]);
  selectedSensor = signal<SensorDetail | null>(null);
  selectedSensorId = signal<number | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.loadData();
    this.wsService.connect();

    // Refresh data every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.wsService.disconnect();
  }

  loadData(): void {
    this.apiService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.error.set(null);
      },
      error: (err: Error) => {
        console.error('Failed to load stats:', err);
        this.error.set(err.message);
      },
    });

    this.apiService.getAllSensors().subscribe({
      next: (sensors) => {
        this.sensors.set(sensors);
        this.loading.set(false);
        this.error.set(null);

        // Refresh selected sensor if one is selected
        const selectedId = this.selectedSensorId();
        if (selectedId !== null) {
          const updated = sensors.find((s) => s.sensorId === selectedId);
          if (updated && this.selectedSensor()) {
            this.loadSensorDetail(selectedId);
          }
        }
      },
      error: (err: Error) => {
        console.error('Failed to load sensors:', err);
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  onSensorSelected(sensorId: number): void {
    this.selectedSensorId.set(sensorId);
    this.loadSensorDetail(sensorId);
  }

  loadSensorDetail(sensorId: number): void {
    this.apiService.getSensor(sensorId).subscribe({
      next: (detail) => {
        this.selectedSensor.set(detail);
      },
      error: (err: Error) => {
        console.error(`Failed to load sensor ${sensorId}:`, err);
        this.error.set(err.message);
      },
    });
  }

  onSensorDetailClosed(): void {
    this.selectedSensor.set(null);
    this.selectedSensorId.set(null);
  }
}
