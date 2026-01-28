import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorSummary } from '../../models/sensor.models';

@Component({
  selector: 'app-sensor-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-table.component.html',
})
export class SensorTableComponent {
  sensors = input.required<SensorSummary[]>();
  selectedSensorId = input<number | null>(null);
  sensorSelected = output<number>();

  onSensorSelect(sensorId: number): void {
    this.sensorSelected.emit(sensorId);
  }
}
