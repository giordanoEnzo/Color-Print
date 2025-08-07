import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Método para obter todos os produtos
  getProdutos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/produtos`);
  }

  // Método para obter um produto específico
  getProdutoById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/produtos/${id}`);
  }

  // Buscar categorias (sem produtos)
  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`);
  }

  // Buscar produtos por categoria
  getProdutosPorCategoria(categoriaId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/produtos/categoria/${categoriaId}`);
  }

  // Adicionar novo produto (com imagem)
  addProduto(produto: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/produtos`, produto);
  }

  // Atualizar produto existente
  updateProduto(id: string, produto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/produtos/${id}`, produto);
  }

  // Deletar produto
  deleteProduto(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/produtos/${id}`);
  }

  // Upload da imagem (caso use endpoint separado)
  uploadImagem(imagem: File): Observable<any> {
    const formData = new FormData();
    formData.append('imagem', imagem, imagem.name);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  // Buscar usuários (opcional)
  getUsuarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios`);
  }

  // Buscar categorias com seus produtos
  getCategoriasComProdutos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias-com-produtos`);
  }

  // CRUD de variações de produtos
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

  // Buscar o produto em destaque
  getProdutoDestaque(): Observable<any> {
    return this.http.get(`${this.apiUrl}/produto-destaque`);
  }
}
