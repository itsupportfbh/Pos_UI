import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';

@Component({
  selector: 'app-image-upload-field',
  standalone: true,
  imports: [CommonModule, ButtonModule, ImageModule],
  templateUrl: './image-upload-field.component.html',
  styleUrl: './image-upload-field.component.css'
})
export class ImageUploadFieldComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) inputId = '';
  @Input() required = false;
  @Input() submitted = false;
  @Input() errorMessage = '';
  @Input() disabled = false;
  @Input() model: File | null = null;
  @Input() previewUrl: string | null = null;
  @Output() modelChange = new EventEmitter<File | null>();
  @Output() previewUrlChange = new EventEmitter<string | null>();

  get showRequiredError(): boolean {
    return this.submitted && this.required && !this.model;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file is image
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Emit the file
      this.modelChange.emit(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const url = e.target?.result as string;
        this.previewUrlChange.emit(url);
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.modelChange.emit(null);
    this.previewUrlChange.emit(null);
    const input = document.getElementById(this.inputId) as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  get showRequiredMark(): boolean {
    return this.required;
  }
}
