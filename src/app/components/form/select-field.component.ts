import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Option } from '../../pages/pos/config/models';

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
  @Input() options: Option[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() required = false;
  @Input() disabled = false;
  @Input() showClear = true;
  @Input() filter = true;
  @Input() appendTo: 'body' | 'self' = 'body';
  @Input() model: string | null = null;
  @Output() modelChange = new EventEmitter<string | null>();

  onModelChange(value: string | null): void {
    this.modelChange.emit(value);
  }
}
