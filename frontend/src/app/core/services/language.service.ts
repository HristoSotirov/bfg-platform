import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'bg' | 'en';

const LANGUAGE_STORAGE_KEY = 'bfg_language';
const DEFAULT_LANGUAGE: AppLanguage = 'bg';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly languageSubject: BehaviorSubject<AppLanguage>;

  constructor() {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null;
    const initial: AppLanguage =
      stored === 'bg' || stored === 'en' ? stored : DEFAULT_LANGUAGE;
    this.languageSubject = new BehaviorSubject<AppLanguage>(initial);
  }

  get language$() {
    return this.languageSubject.asObservable();
  }

  get currentLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  setLanguage(lang: AppLanguage): void {
    if (lang !== 'bg' && lang !== 'en') {
      return;
    }
    if (this.languageSubject.value === lang) {
      return;
    }
    this.languageSubject.next(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }
}

