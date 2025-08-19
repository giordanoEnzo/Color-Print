import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private apiUrl = (environment.apiUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  /** Helper para montar o FormData com chaves EXATAS do backend e números normalizados */
  buildFormData(prod: any, imagem: File | null): FormData {
    const fd = new FormData();

    // campos básicos
    fd.append('nome', prod.nome ?? '');
    fd.append('descricao', prod.descricao ?? '');
    fd.append('preco', this.numStr(prod.preco));
    fd.append('estoque', this.numStr(prod.estoque ?? 0, 0));
    fd.append('destaque', prod.destaque ? '1' : '0');
    fd.append('id_categoria', prod.id_categoria != null ? String(prod.id_categoria) : '');

    // dimensões/peso — nomes EXATOS da sua tabela/servidor
    if (this.hasValue(prod.width))  fd.append('width',  this.numStr(prod.width));
    if (this.hasValue(prod.height)) fd.append('height', this.numStr(prod.height));
    if (this.hasValue(prod.length)) fd.append('length', this.numStr(prod.length));
    if (this.hasValue(prod.weight)) fd.append('weight', this.numStr(prod.weight));

    if (imagem) fd.append('imagem', imagem);
    return fd;
  }

  private hasValue(v: any): boolean {
    return v !== null && v !== undefined && String(v) !== '';
  }

  private numStr(v: any, fallback: number | null = null): string {
    if (!this.hasValue(v)) {
      return fallback !== null ? String(fallback) : '';
    }
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? String(n) : (fallback !== null ? String(fallback) : '');
  }

  /* =========================
     PRODUTOS / CATEGORIAS
     ========================= */
  getProdutos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/produtos`);
  }

  getProdutoById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/produtos/${id}`);
  }

  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`);
  }

  /** << ESTE É O MÉTODO QUE FALTAVA >> */
  getCategoriasComProdutos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias-com-produtos`);
  }

  /** (Opcional – seu backend atual não tem essa rota; mantenha só se usar) */
  getProdutosPorCategoria(categoriaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/produtos/categoria/${categoriaId}`);
  }

  addProduto(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/produtos`, formData);
  }

  updateProduto(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/produtos/${id}`, formData);
  }

  deleteProduto(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/produtos/${id}`);
  }

  /* =========================
     UPLOAD / USUÁRIOS
     ========================= */
  uploadImagem(imagem: File): Observable<any> {
    const fd = new FormData();
    fd.append('imagem', imagem, imagem.name);
    return this.http.post(`${this.apiUrl}/upload`, fd);
  }

  getUsuarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios`);
  }

  /* =========================
     VARIAÇÕES
     ========================= */
  addVariacao(variacao: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/variacoes`, variacao);
  }

  getTodasVariacoes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/variacoes`);
  }

  getVariacoesPorProduto(id_produto: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/produtos/${id_produto}/variacoes`);
  }

  updateVariacao(id_variacao: number, variacao: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/variacoes/${id_variacao}`, variacao);
  }

  deleteVariacao(id_variacao: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/variacoes/${id_variacao}`);
  }

  /* =========================
     DESTAQUE
     ========================= */
  getProdutoDestaque(): Observable<any> {
    return this.http.get(`${this.apiUrl}/produto-destaque`);
  }
}
