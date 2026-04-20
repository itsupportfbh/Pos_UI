import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

type ButtonSeverity = 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
type ButtonSize = 'small' | 'large';

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
  @Input() primarySeverity: ButtonSeverity | null = null;
  @Input() secondarySeverity: ButtonSeverity | null = 'secondary';
  @Input() primaryDisabled = false;
  @Input() secondaryDisabled = false;
  @Input() primaryLoading = false;
  @Input() secondaryLoading = false;
  @Input() primaryOutlined = false;
  @Input() secondaryOutlined = true;
  @Input() primaryText = false;
  @Input() secondaryText = false;
  @Input() primaryRaised = false;
  @Input() secondaryRaised = false;
  @Input() primaryRounded = false;
  @Input() secondaryRounded = false;
  @Input() buttonSize: ButtonSize | undefined;
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
