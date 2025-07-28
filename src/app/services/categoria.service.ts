import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Categoria } from '../interfaces/categoria.interface';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private baseUrl = 'http://localhost:5000/api/categorias';

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.baseUrl);
  }

  getCategoriaById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.baseUrl}/${id}`);
  }

  adicionarCategoria(categoria: Categoria): Observable<any> {
    return this.http.post(this.baseUrl, categoria);
  }

  atualizarCategoria(categoria: Categoria): Observable<any> {
    return this.http.put(`${this.baseUrl}/${categoria.id_categoria}`, categoria);
  }

  deletarCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
