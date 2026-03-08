import { Directive, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SystemRole } from '../../core/models/navigation.model';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  @Input() appHasRole: SystemRole[] = [];
  @Input() appHasAnyRole = false;

  private subscription?: Subscription;

  constructor(
    private elementRef: ElementRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAccess();
    this.subscription = this.authService.currentUser$.subscribe(() => {
      this.checkAccess();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private checkAccess(): void {
    const userRoles = this.authService.getCurrentUserRoles();
    let hasAccess = false;

    if (this.appHasRole.length === 0) {
      hasAccess = true;
    } else if (this.appHasAnyRole) {
      hasAccess = this.appHasRole.some(role => userRoles.includes(role));
    } else {
      hasAccess = this.appHasRole.some(role => userRoles.includes(role));
    }

    if (!hasAccess) {
      this.elementRef.nativeElement.style.display = 'none';
    } else {
      this.elementRef.nativeElement.style.display = '';
    }
  }
}

