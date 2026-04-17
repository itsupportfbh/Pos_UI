import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-action-buttons',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './action-buttons.component.html',
  styleUrl: './action-buttons.component.css'
})
export class ActionButtonsComponent {
  @Input({ required: true }) primaryLabel = '';
  @Input() secondaryLabel = '';
  @Input() primaryIcon = 'pi pi-check';
  @Input() secondaryIcon = 'pi pi-refresh';
  @Input() primaryDisabled = false;
  @Input() secondaryDisabled = false;
  @Input() showSecondary = true;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();

  onPrimaryClick(): void {
    this.primaryClick.emit();
  }

  onSecondaryClick(): void {
    this.secondaryClick.emit();
  }
}
