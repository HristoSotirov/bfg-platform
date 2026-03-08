import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {
  /** Label text shown at top-left of navigation cards */
  @Input() label = '';

  /** Title text shown centered (for section cards like News/Calendar) */
  @Input() title = '';

  /** Border color class for the card */
  @Input() borderColorClass = 'border-bfg-blue';

  /** Whether this is a section card (gray bg, full height, centered title) */
  @Input() section = false;
}
