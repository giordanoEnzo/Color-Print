import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pedido, Produto } from 'src/app/interfaces/pedidos.interface';  // Importe a interface de Pedido
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {

  private apiUrl = environment.apiUrl; // API  NO ENVIROMENTS

  constructor(private http: HttpClient) {}

  // Método para obter todos os pedidos
  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/pedidos`);
  }

  // Método para obter um pedido específico
  getPedidoById(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/pedidos/${id}`);
  }

  // Método para obter pedidos de uma mesa
  getHistoricoPedidosPorMesa(id_mesa: number, id_empresa: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesas/${id_mesa}/historico-pedidos?id_empresa=${id_empresa}`);
  }

  // Método para obter os pedidos de uma mesa por id_mesa e id_empresa
  getPedidosPorMesa(id_mesa: number, id_empresa: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesas/${id_mesa}/pedidos?id_empresa=${id_empresa}`);
  }
  
  // Método para adicionar um novo pedido
  addPedido(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos`, pedido);
  }

  // Método para atualizar um pedido existente
  updatePedido(id: string, pedido: Pedido): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.apiUrl}/pedidos/${id}`, pedido);
  }

  // Método para deletar um pedido
  deletePedido(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pedidos/${id}`);
  }

  // Método para obter os produtos de um pedido específico
  getProdutosDoPedido(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos/${id}/produtos`);
  }

  // Método para adicionar produtos a um pedido
  adicionarProdutoNoPedido(idPedido: number, produto: Produto): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos/${idPedido}/produtos`, produto);
  }

  // Método para remover um produto de um pedido
  removerProdutoDoPedido(idPedido: number, idProduto: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pedidos/${idPedido}/produtos/${idProduto}`);
  }

  // Método para imprimir o pedido antes de salvar no banco de dados
  imprimirPedido(pedido: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/imprimir-pedido`, pedido);
  }

  // Método para imprimir o histórico de pedidos de uma mesa
  imprimirHistoricoMesa(mesaId: number, pedidos: any[],nome: string, endereco: string): Observable<any> {
    const payload = { id_mesa: mesaId, pedidos: pedidos,nome: nome, endereco: endereco };
    return this.http.post(`${this.apiUrl}/imprimir-historico-mesa`, payload);
  }

  // Método para solicitar o histórico de uma mesa solicitarHistorico
  solicitarHistorico(mesaId: number, pedidos: any[],nome: string, endereco: string,id_empresa: number): Observable<any> {
    const payload = { id_mesa: mesaId, pedidos: pedidos,nome: nome, endereco: endereco, id_empresa: id_empresa };
    return this.http.post(`${this.apiUrl}/solicitar-historico`, payload);
  }

  addPedidosEmLote(pedidos: any[]) {
    return this.http.post(`${this.apiUrl}/pedidos/lote`, pedidos);
  }

  // Método para obter o total consumido por uma mesa de uma empresa
  getTotalConsumoMesa(id_empresa: number, id_mesa: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos/total-mesa`, {
      params: {
        id_empresa: id_empresa.toString(),
        id_mesa: id_mesa.toString()
      }
    });
  }

 // Método para obter o total consumido por uma mesa de uma empresa
  getAtualizaTotalMesa(id_empresa: number, id_mesa: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pedidos/atualizar-total-mesa`, {
      params: {
        id_empresa: id_empresa.toString(),
        id_mesa: id_mesa.toString()
      }
    });
  }


  

  
}
