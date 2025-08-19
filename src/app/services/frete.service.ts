import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

// Estrutura vinda do backend (normalizada)
export interface FreteMelhorEnvio {
  id: string;
  name: string;
  price: string; // string por compatibilidade (ex.: "27.50")
  delivery_time?: {
    days: number;
    working_days?: boolean;
    estimated_date?: string | null;
  } | null;
  company: { name: string };
  error?: string | null;
}

// (opcional) tipo mínimo do item do carrinho p/ facilitar autocomplete
export interface ItemCarrinhoFrete {
  id_produto?: number;
  id?: number;
  quantidade?: number;

  // dimensões/peso (preferimos *_cm e *_kg que vêm do backend)
  width_cm?: number | string;
  height_cm?: number | string;
  length_cm?: number | string;
  weight_kg?: number | string;

  // fallback caso o seu front já tenha usado nomes sem sufixo:
  width?: number | string;
  height?: number | string;
  length?: number | string;
  weight?: number | string;
}

@Injectable({ providedIn: 'root' })
export class FreteService {
  private baseUrl = environment.apiUrl.replace(/\/$/, '');
  private endpoint = `${this.baseUrl}/frete-melhor-envio`;

  // (opcional) mock antigo p/ testes locais
  private legacyEndpoint = `${this.baseUrl}/frete`;

  constructor(private http: HttpClient) {}

  /**
   * Calcula frete via Melhor Envio (backend).
   * Envie SEMPRE o carrinho para compor peso/medidas reais.
   *
   * @param cepDestino CEP do cliente (com ou sem máscara)
   * @param carrinho   Array de itens do carrinho
   * @param useLegacy  Opcional: usar rota mock antiga (/frete) se true
   */
  calcularFrete(
    cepDestino: string,
    carrinho: ItemCarrinhoFrete[],
    useLegacy = false
  ): Observable<FreteMelhorEnvio[]> {
    const cep = (cepDestino || '').replace(/\D/g, '');

    if (useLegacy) {
      // Rota de mock (mantida só para fallback)
      return this.http.post<FreteMelhorEnvio[]>(this.legacyEndpoint, {
        cepDestino: cep,
        peso: 1
      });
    }

    // Mapeia itens do carrinho -> payload esperado pelo backend (cm/kg)
    // Observação: não enviamos preco/insurance_value
    const items = (carrinho || []).map((item: ItemCarrinhoFrete, idx: number) => ({
      id: item.id_produto || item.id || idx + 1,
      width:  this.toNumber(item.width_cm ?? item.width),
      height: this.toNumber(item.height_cm ?? item.height),
      length: this.toNumber(item.length_cm ?? item.length),
      weight: this.toNumber(item.weight_kg ?? item.weight),
      quantity: Number(item.quantidade || 1)
    }));

    return this.http.post<FreteMelhorEnvio[]>(this.endpoint, {
      cepDestino: cep,
      items
    });
  }

  /** Converte para número ou retorna undefined (deixa o backend aplicar o DEFAULT_PKG) */
  private toNumber(v: any): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }

  /** Helper opcional para somar preços com segurança */
  toNum(v: any): number {
    if (v == null) return 0;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
}
