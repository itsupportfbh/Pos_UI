import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppShellService {
  private readonly chromeHiddenSubject = new BehaviorSubject<boolean>(false);
  readonly chromeHidden$ = this.chromeHiddenSubject.asObservable();

  getChromeHidden(): boolean {
    return this.chromeHiddenSubject.value;
  }

  setChromeHidden(hidden: boolean): void {
    this.chromeHiddenSubject.next(hidden);
  }
}
