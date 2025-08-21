import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Definido no environments

  constructor(private http: HttpClient) {}

  // 🔑 Login
  login(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, senha });
  }

  // 🚪 Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  // ✅ Verifica se existe token
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // 👤 Retorna o usuário atual
  getUsuario(): any {
    const user = localStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
  }
}
