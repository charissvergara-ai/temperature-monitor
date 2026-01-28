import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-banner.component.html',
})
export class ErrorBannerComponent {
  message = input<string | null>(null);

  refresh(): void {
    window.location.reload();
  }
}
