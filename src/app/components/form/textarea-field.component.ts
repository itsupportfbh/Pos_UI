import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-textarea-field',
  standalone: true,
  imports: [CommonModule, FormsModule, TextareaModule],
  templateUrl: './textarea-field.component.html',
  styleUrl: './textarea-field.component.css'
})
export class TextareaFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() name = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() required = false;
  @Input() showRequiredMark = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() rows = 4;
  @Input() maxlength?: number;
  @Input() model = '';
  @Output() modelChange = new EventEmitter<string>();

  get showRequiredError(): boolean {
    return this.submitted && this.required && !this.model.trim();
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  onModelChange(value: string): void {
    this.modelChange.emit(value);
  }
}
