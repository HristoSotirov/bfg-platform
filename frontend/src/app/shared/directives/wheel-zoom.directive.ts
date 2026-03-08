import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

/**
 * Директива за зум с колелцето на мишката/тръгпад.
 * Регистрира wheel с { passive: false }, за да може да се извика preventDefault() и да не се скролва съдържанието.
 */
@Directive({
  selector: '[appWheelZoom]',
  standalone: true,
})
export class WheelZoomDirective implements OnInit, OnDestroy {
  @Output() appWheelZoom = new EventEmitter<WheelEvent>();

  private handler = (e: WheelEvent) => {
    e.preventDefault();
    this.appWheelZoom.emit(e);
  };

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.el.nativeElement.addEventListener('wheel', this.handler, { passive: false });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('wheel', this.handler);
  }
}
