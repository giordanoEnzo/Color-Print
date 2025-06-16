import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface PixRequest {
  nome: string;
  sobrenome: string;
  email: string;
  valor: number;
}

export interface PixResponse {
  id: string;
  status: string;
  qr_code_base64: string;
  qr_code: string;
}

export interface PixStatusResponse {
  id: string;
  status: string;
  status_detail: string;
  approved_at?: string;
}


@Injectable({
  providedIn: 'root',
})


export class PixService {

  private apiUrl = environment.apiUrl; // API  NO ENVIROMENTS

  constructor(private http: HttpClient) {}

  gerarPagamentoPix(dados: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pix`, dados); // <- certifique-se que a rota está correta
  }

  consultarStatusPagamento(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pix/status/${id}`);
  }

}