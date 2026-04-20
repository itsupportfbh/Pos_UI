import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

type TextFieldRule = {
  enabled: boolean;
  message: string;
  pattern: RegExp;
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
  @Input() numbersWithSpecialCharactersOnly = false;
  @Input() textWithSpecialCharactersOnly = false;
  @Input() formatErrorMessage = '';
  @Input() showFormatErrorWhileTyping = true;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() minlength?: number;
  @Input() maxlength?: number;
  @Input() model = '';
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

  private get activeFormatRule(): TextFieldRule | null {
    const rules: TextFieldRule[] = [
      {
        enabled: this.numbersOnly,
        message: `${this.label} allows numbers only.`,
        pattern: /^[0-9]+$/
      },
      {
        enabled: this.emailOnly,
        message: `Enter a valid ${this.label.toLowerCase()}.`,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      {
        enabled: this.textOnly,
        message: `${this.label} allows text only.`,
        pattern: /^[A-Za-z\s]+$/
      },
      {
        enabled: this.textWithNumbersOnly,
        message: `${this.label} allows text and numbers only.`,
        pattern: /^[A-Za-z0-9\s]+$/
      },
      {
        enabled: this.numbersWithSpecialCharactersOnly,
        message: `${this.label} allows numbers and special characters only.`,
        pattern: /^[0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/
      },
      {
        enabled: this.textWithSpecialCharactersOnly,
        message: `${this.label} allows text and special characters only.`,
        pattern: /^[A-Za-z\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/
      }
    ];

    return rules.find((rule) => rule.enabled) ?? null;
  }

  private get isRequiredValueMissing(): boolean {
    return this.required && !this.model.trim();
  }

  private get isFormatInvalid(): boolean {
    const value = this.model.trim();
    const activeRule = this.activeFormatRule;

    return !!value && !!activeRule && !activeRule.pattern.test(value);
  }
}
