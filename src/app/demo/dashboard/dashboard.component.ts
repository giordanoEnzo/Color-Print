import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export default class DashboardComponent implements OnInit {
  vendas: any[] = [];

  pedidosFinalizados = 0;
  pedidosPendentes = 0;
  pedidosCancelados = 0;

  paginaAtual: number = 1;
  itensPorPagina: number = 10; // Ajuste conforme necessário

  mostrarModalAjuste: boolean = false;
  pedidoSelecionado: any = null;
  carregandoStatus: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarVendas();
  }

  carregarVendas() {
    this.http.get<any[]>(`${environment.apiUrl}/vendas`).subscribe({
      next: (dados) => {
        this.vendas = dados || [];
        // Atualizar contadores de status
        this.pedidosFinalizados = this.vendas.filter(v => v.status_pedido === 'FINALIZADA').length;
        this.pedidosPendentes = this.vendas.filter(v => v.status_pedido === 'PENDENTE').length;
        this.pedidosCancelados = this.vendas.filter(v => v.status_pedido === 'CANCELADA').length;
      },
      error: (err) => {
        console.error('Erro ao buscar vendas:', err);
      }
    });
  }

  getValorTotal(venda: any): string {
    if (!venda || !venda.itens_pedido) return '0,00';
    const total = venda.itens_pedido.reduce((acc: number, item: any) => acc + (item.preco * (item.quantidade || 1)), 0);
    return total.toFixed(2).replace('.', ',');
  }

  get vendasPaginadas() {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.vendas.slice(inicio, fim);
  }
  get totalPaginas() {
    return Math.ceil(this.vendas.length / this.itensPorPagina);
  }

  irParaPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaAtual = pagina;
    }
  }

  paginaAnterior() {
    if (this.paginaAtual > 1) this.paginaAtual--;
  }

  proximaPagina() {
    if (this.paginaAtual < this.totalPaginas) this.paginaAtual++;
  }

  abrirModalAjuste(venda: any) {
    this.pedidoSelecionado = { ...venda }; // Cópia para edição
    this.mostrarModalAjuste = true;
  }

  fecharModalAjuste() {
    this.mostrarModalAjuste = false;
    this.pedidoSelecionado = null;
  }

  salvarStatusPedido() {
    if (!this.pedidoSelecionado) return;

    this.carregandoStatus = true;

    this.http.put(`${environment.apiUrl}/vendas/${this.pedidoSelecionado.id_pedido}`, {
      status_pedido: this.pedidoSelecionado.status_pedido
    }).subscribe({
      next: () => {
        this.carregandoStatus = false;
        this.fecharModalAjuste();
        this.carregarVendas();
      },
      error: (err) => {
        this.carregandoStatus = false;
        alert('Erro ao atualizar status da venda!');
        console.error(err);
      }
    });
  }
}
