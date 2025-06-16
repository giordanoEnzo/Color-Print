import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MesaService {
  
  private apiUrl = environment.apiUrl; // API  NO ENVIROMENTS

  constructor(private http: HttpClient) {}

  // Método para obter todas as mesas de uma empresa (padrão com valor na URL)
  getMesas(id_empresa: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesas?id_empresa=${id_empresa}`);
  }

  // Método para obter uma mesa específica
  getMesaById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesas/${id}`);
  }

  // Método para adicionar uma nova mesa
  addMesa(mesa: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mesas`, mesa);
  }

  // Método para atualizar uma mesa existente
  updateMesa(id: string, mesa: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/mesas/${id}`, mesa);
  }

  // Método para deletar uma mesa
  deleteMesa(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/mesas/${id}`);
  }


  // Método para atualizar o status de uma mesa para "Finalizada"
  atualizarStatusMesa(id: string): Observable<any> {
    const url = `${this.apiUrl}/mesas/${id}/status`;  // A URL da sua API
    const body = { status: 'Finalizada' };  // Corpo da requisição com o status "Finalizada"
    return this.http.put(url, body);  // Requisição PUT para atualizar o status da mesa
  }


   // Método para atualizar o total de consumo de uma mesa
   atualizarTotalConsumo(idMesa: string, novoTotalConsumo: number): Observable<any> {
    const url = `${this.apiUrl}/mesas/${idMesa}`;
    const body = { totalConsumo: novoTotalConsumo };  // Corpo com o novo total consumido
    return this.http.put(url, body);  // Requisição PUT para atualizar
  }

}
