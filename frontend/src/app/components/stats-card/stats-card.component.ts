import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-card.component.html',
})
export class StatsCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>();
}
