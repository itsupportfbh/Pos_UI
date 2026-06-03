import { Pipe, PipeTransform } from '@angular/core';
import { AppTranslationService } from '../services/app-translation.service';

@Pipe({
  name: 'appTranslate',
  standalone: true,
  pure: false
})
export class AppTranslatePipe implements PipeTransform {
  constructor(private readonly translationService: AppTranslationService) { }

  transform(key: string, fallbackText = ''): string {
    return this.translationService.t(key, fallbackText);
  }
}
