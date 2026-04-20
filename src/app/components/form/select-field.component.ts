import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FieldOption } from './field-option.model';

export type SelectFieldValue = string | number | null;

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule],
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.css'
})
export class SelectFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() placeholder = 'Select';
  @Input() helperText = '';
  @Input() options: FieldOption[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() required = false;
  @Input() showRequiredMark = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() disabled = false;
  @Input() showClear = true;
  @Input() filter = true;
  @Input() appendTo: 'body' | 'self' = 'body';
  @Input() numberValue = false;
  @Input() model: SelectFieldValue = null;
  @Output() modelChange = new EventEmitter<any>();

  get showRequiredError(): boolean {
    return this.submitted && this.required && !this.model;
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  onModelChange(value: SelectFieldValue): void {
    if (this.numberValue) {
      this.modelChange.emit(this.toNumberOrZero(value));
      return;
    }

    this.modelChange.emit(value);
  }

  private toNumberOrZero(value: SelectFieldValue): number {
    if (value === null || value === '') {
      return 0;
    }

    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  }
}
