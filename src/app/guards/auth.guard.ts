import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('usuario');

    // 🔒 Se não tiver token ou usuário → redireciona para login
    if (!token || !userData) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    const user = JSON.parse(userData);
    const userRole = user.role; // "ADMIN" ou "FUNCIONARIO"
    const allowedRoles = route.data['roles'] as string[];

    // 🔒 Se a rota tiver restrição de roles e o usuário não tiver permissão
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      this.router.navigate(['/home']);
      return false;
    }

    return true;
  }
}
