import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-autocomplete-field',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  templateUrl: './autocomplete-field.component.html',
  styleUrl: './autocomplete-field.component.css'
})
export class AutocompleteFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() suggestions: string[] = [];
  @Input() required = false;
  @Input() disabled = false;
  @Input() dropdown = true;
  @Input() forceSelection = false;
  @Input() appendTo: 'body' | 'self' = 'body';
  @Input() model: string | null = null;
  @Output() modelChange = new EventEmitter<string | null>();

  filteredSuggestions: string[] = [];

  ngOnInit(): void {
    this.filteredSuggestions = [...this.suggestions];
  }

  filterSuggestions(event: AutoCompleteCompleteEvent): void {
    const query = (event.query ?? '').toLowerCase().trim();

    this.filteredSuggestions = !query
      ? [...this.suggestions]
      : this.suggestions.filter((entry) => entry.toLowerCase().includes(query));
  }

  onModelChange(value: string | null): void {
    this.modelChange.emit(value);
  }
}
