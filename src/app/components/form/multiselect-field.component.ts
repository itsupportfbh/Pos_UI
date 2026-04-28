import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { FieldOption } from './field-option.model';

export type MultiSelectFieldValue = Array<string | number>;

@Component({
  selector: 'app-multiselect-field',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  templateUrl: './multiselect-field.component.html',
  styleUrl: './multiselect-field.component.css'
})
export class MultiSelectFieldComponent {
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
  @Input() filter = true;
  @Input() appendTo: 'body' | 'self' = 'body';
  @Input() display: 'comma' | 'chip' = 'chip';
  @Input() model: MultiSelectFieldValue = [];
  @Output() modelChange = new EventEmitter<MultiSelectFieldValue>();

  get isValid(): boolean {
    return !(this.required && this.model.length === 0);
  }

  get showRequiredError(): boolean {
    return this.submitted && this.required && this.model.length === 0;
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  onModelChange(value: MultiSelectFieldValue | null): void {
    this.modelChange.emit(value ?? []);
  }
}
