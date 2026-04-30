import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

type TextFieldRule = {
  enabled: boolean;
  message: string;
  isValid: (value: string) => boolean;
};

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.css'
})
export class TextFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() name = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() autocomplete = 'off';
  @Input() required = false;
  @Input() showRequiredMark = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() numbersOnly = false;
  @Input() emailOnly = false;
  @Input() textOnly = false;
  @Input() textWithNumbersOnly = false;
  @Input() percentageOnly = false;
  @Input() numbersWithSpecialCharactersOnly = false;
  @Input() textWithSpecialCharactersOnly = false;
  @Input() formatErrorMessage = '';
  @Input() showFormatErrorWhileTyping = true;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() minlength?: number;
  @Input() maxlength?: number;
  @Input() inputMode = '';
  @Input() step?: string;
  @Input() min?: number;
  @Input() max?: number;
  @Input() model: string | number = '';
  @Output() modelChange = new EventEmitter<string>();

  get showRequiredError(): boolean {
    return this.submitted && this.isRequiredValueMissing;
  }

  get showFormatError(): boolean {
    return (this.submitted || this.showFormatErrorWhileTyping) && this.isFormatInvalid;
  }

  get showValidationError(): boolean {
    return this.showRequiredError || this.showFormatError;
  }

  get isValid(): boolean {
    return !this.isRequiredValueMissing && !this.isFormatInvalid;
  }

  get requiredErrorMessage(): string {
    return this.errorMessage || `${this.label} is required.`;
  }

  get formatValidationMessage(): string {
    return this.formatErrorMessage || this.activeFormatRule?.message || `${this.label} format is invalid.`;
  }

  onModelChange(value: string): void {
    this.modelChange.emit(value);
  }

  private get modelValue(): string {
    return String(this.model ?? '');
  }

  private get activeFormatRule(): TextFieldRule | null {
    const rules: TextFieldRule[] = [
      {
        enabled: this.numbersOnly,
        message: `${this.label} allows numbers only.`,
        isValid: (value) => /^[0-9]+$/.test(value)
      },
      {
        enabled: this.emailOnly,
        message: `Enter a valid ${this.label.toLowerCase()}.`,
        isValid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      },
      {
        enabled: this.textOnly,
        message: `${this.label} allows text only.`,
        isValid: (value) => /^[A-Za-z\s]+$/.test(value)
      },
      {
        enabled: this.textWithNumbersOnly,
        message: `${this.label} allows text and numbers only.`,
        isValid: (value) => /^[A-Za-z0-9\s]+$/.test(value)
      },
      {
        enabled: this.percentageOnly,
        message: `${this.label} should be between 0 and 100.`,
        isValid: (value) => {
          const percentage = Number(value);
          return !Number.isNaN(percentage) && percentage >= 0 && percentage <= 100;
        }
      },
      {
        enabled: this.numbersWithSpecialCharactersOnly,
        message: `${this.label} allows numbers and special characters only.`,
        isValid: (value) => /^[0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(value)
      },
      {
        enabled: this.textWithSpecialCharactersOnly,
        message: `${this.label} allows text and special characters only.`,
        isValid: (value) => /^[A-Za-z\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(value)
      }
    ];

    return rules.find((rule) => rule.enabled) ?? null;
  }

  private get isRequiredValueMissing(): boolean {
    return this.required && !this.modelValue.trim();
  }

  private get isFormatInvalid(): boolean {
    const value = this.modelValue.trim();
    const activeRule = this.activeFormatRule;

    return !!value && !!activeRule && !activeRule.isValid(value);
  }
}
