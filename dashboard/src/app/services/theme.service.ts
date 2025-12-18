import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkModeSignal = signal<boolean>(
    localStorage.getItem('darkMode') === 'true' || 
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  public darkMode = this.darkModeSignal.asReadonly();

  constructor() {
    // Apply theme on initialization
    this.applyTheme(this.darkModeSignal());

    // Watch for changes and apply theme
    effect(() => {
      const isDark = this.darkModeSignal();
      this.applyTheme(isDark);
      localStorage.setItem('darkMode', String(isDark));
    });
  }

  toggleTheme(): void {
    this.darkModeSignal.update(mode => !mode);
  }

  setDarkMode(isDark: boolean): void {
    this.darkModeSignal.set(isDark);
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

