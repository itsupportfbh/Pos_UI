import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

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
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() minlength?: number;
  @Input() maxlength?: number;
  @Input() model = '';
  @Output() modelChange = new EventEmitter<string>();

  onModelChange(value: string): void {
    this.modelChange.emit(value);
  }
}
