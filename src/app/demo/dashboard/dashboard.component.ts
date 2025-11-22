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

  // Variáveis para drag-to-scroll
  private isDown = false;
  private startX = 0;
  private scrollLeft = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarVendas();
    this.setupDragScroll();
  }

  setupDragScroll() {
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-responsive');
      if (!tableContainer) return;

      tableContainer.addEventListener('mousedown', (e: any) => {
        this.isDown = true;
        tableContainer.classList.add('active-drag');
        this.startX = e.pageX - (tableContainer as HTMLElement).offsetLeft;
        this.scrollLeft = (tableContainer as HTMLElement).scrollLeft;
      });

      tableContainer.addEventListener('mouseleave', () => {
        this.isDown = false;
        tableContainer.classList.remove('active-drag');
      });

      tableContainer.addEventListener('mouseup', () => {
        this.isDown = false;
        tableContainer.classList.remove('active-drag');
      });

      tableContainer.addEventListener('mousemove', (e: any) => {
        if (!this.isDown) return;
        e.preventDefault();
        const x = e.pageX - (tableContainer as HTMLElement).offsetLeft;
        const walk = (x - this.startX) * 2; // Multiplicador para velocidade do scroll
        (tableContainer as HTMLElement).scrollLeft = this.scrollLeft - walk;
      });
    }, 100);
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

  // Retorna URL completa para o arquivo de arte (ou retorna a URL diretamente se já for absoluta)
  getArteUrl(artePath: string): string {
    if (!artePath) return '';
    // Se já for URL completa, retorna como está
    if (/^https?:\/\//i.test(artePath)) return artePath;
    // Remove barras iniciais e concatena com apiUrl
    const clean = artePath.replace(/^\/+/, '');
    return `${environment.apiUrl}/${clean}`;
  }

  // Baixa um arquivo pela URL (força o download via blob) para contornar falta de Content-Disposition
  async baixarArte(url: string | null) {
    if (!url) return alert('URL da arte não disponível');
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Falha ao baixar arquivo');
      const blob = await resp.blob();
      // tenta extrair nome do arquivo da URL
      const pathname = new URL(url, window.location.href).pathname;
      const name = pathname.split('/').pop() || `arte_${Date.now()}`;

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Erro ao baixar arte:', err);
      alert('Erro ao baixar o arquivo da arte. Verifique o console para mais detalhes.');
    }
  }

  // MÉTODO NOVO: Remover venda
  removerVenda(id: number) {
    if (confirm('Tem certeza que deseja remover esta venda?')) {
      this.http.delete(`${environment.apiUrl}/vendas/${id}`).subscribe({
        next: () => {
          // Remove localmente para resposta rápida
          this.vendas = this.vendas.filter(v => v.id_pedido !== id);
          // Recalcula os contadores
          this.pedidosFinalizados = this.vendas.filter(v => v.status_pedido === 'FINALIZADA').length;
          this.pedidosPendentes = this.vendas.filter(v => v.status_pedido === 'PENDENTE').length;
          this.pedidosCancelados = this.vendas.filter(v => v.status_pedido === 'CANCELADA').length;
        },
        error: (err) => {
          alert('Erro ao remover venda!');
          console.error('Erro ao remover venda:', err);
        }
      });
    }
  }
}
