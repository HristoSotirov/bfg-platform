import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div
      class="h-screen w-full flex flex-col items-center justify-center bg-white gap-6 px-4"
    >
      <div class="text-center">
        <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          Очаква се скоро
        </h1>
        <p class="text-lg text-gray-500">
          Тази страница е в процес на разработка.
        </p>
      </div>
      <app-button
        variant="outline"
        size="lg"
        text="← Начало"
        routerLink="/"
      ></app-button>
    </div>
  `,
})
export class ComingSoonComponent {}
