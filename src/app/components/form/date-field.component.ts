import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule],
  templateUrl: './date-field.component.html',
  styleUrl: './date-field.component.css'
})
export class DateFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() required = false;
  @Input() showRequiredMark = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() disabled = false;
  @Input() showIcon = true;
  @Input() showButtonBar = true;
  @Input() dateFormat = 'dd/mm/yy';
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() appendTo: 'body' | 'self' = 'body';
  @Input() model: Date | null = null;
  @Output() modelChange = new EventEmitter<Date | null>();

  get showRequiredError(): boolean {
    return this.submitted && this.required && !this.model;
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  onModelChange(value: Date | null): void {
    this.modelChange.emit(value);
  }
}
