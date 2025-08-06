import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

// Estrutura do Melhor Envio
export interface FreteMelhorEnvio {
  id: string;
  name: string;
  price: string;
  delivery_time: {
    days: number;
    working_days: boolean;
    estimated_date: string;
  };
  company: {
    name: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FreteService {
  private apiUrl = `${environment.apiUrl}/frete`;

  constructor(private http: HttpClient) {}

  calcularFrete(cepDestino: string, peso: number = 1) {
    return this.http.post<FreteMelhorEnvio[]>(this.apiUrl, { cepDestino, peso });
  }
}
