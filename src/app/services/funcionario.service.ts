import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FuncionarioService {
  
  private apiUrl = environment.apiUrl; // API  NO ENVIROMENTS

  constructor(private http: HttpClient) {}

  // Método para obter todos os funcionários
  getFuncionarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/funcionarios`);
  }

  // Método para obter um funcionário específico
  getFuncionarioById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/funcionarios/${id}`);
  }

  // Método para adicionar um novo funcionário
  addFuncionario(funcionario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/funcionarios`, funcionario);
  }

  // Método para atualizar um funcionário existente
  updateFuncionario(id: string, funcionario: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/funcionarios/${id}`, funcionario);
  }

  // Método para deletar um funcionário
  deleteFuncionario(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/funcionarios/${id}`);
  }
}
