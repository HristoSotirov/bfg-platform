import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'bfg-frontend';
  private languageService = inject(LanguageService);

  ngOnInit(): void {
    document.addEventListener('wheel', (e) => {
      const el = document.activeElement as HTMLInputElement;
      if (el?.type === 'number') {
        el.blur();
      }
    }, { passive: true });
  }
}
