import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { SyncEngineService } from './services/sync-engine.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(
    private syncEngine:
      SyncEngineService
  ) {
  }

  ngOnInit() {
    this.syncEngine.startSync();
  }
}
