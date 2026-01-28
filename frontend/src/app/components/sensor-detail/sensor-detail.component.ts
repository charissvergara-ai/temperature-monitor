import { Component, input, output, effect, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDetail } from '../../models/sensor.models';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-sensor-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-detail.component.html',
})
export class SensorDetailComponent implements OnDestroy {
  sensor = input<SensorDetail | null>(null);
  closed = output<void>();

  readonly wsService = inject(WebSocketService);
  liveReading = this.wsService.lastReading;

  constructor() {
    // Subscribe to WebSocket when sensor changes
    effect(() => {
      const s = this.sensor();
      if (s) {
        this.wsService.subscribe(s.sensorId);
      }
    });
  }

  ngOnDestroy(): void {
    this.wsService.unsubscribe();
  }

  onClose(): void {
    this.wsService.unsubscribe();
    this.closed.emit();
  }
}
