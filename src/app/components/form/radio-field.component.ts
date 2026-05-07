import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FieldOption } from './select-field.component';

@Component({
  selector: 'app-radio-field',
  standalone: true,
  imports: [CommonModule, FormsModule, RadioButtonModule],
  templateUrl: './radio-field.component.html',
  styleUrl: './radio-field.component.css'
})
export class RadioFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() name = '';
  @Input() helperText = '';
  @Input() options: FieldOption[] = [];
  @Input() required = false;
  @Input() showRequiredMark = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() disabled = false;
  @Input() model: string | null = null;
  @Output() modelChange = new EventEmitter<string | null>();

  get showRequiredError(): boolean {
    return this.submitted && this.required && !this.model;
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  onModelChange(value: string | null): void {
    this.modelChange.emit(value);
  }

  optionId(index: number): string {
    return `${this.inputId}-${index}`;
  }
}
