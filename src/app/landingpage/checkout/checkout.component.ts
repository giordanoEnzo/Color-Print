import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

import { FreteService, FreteMelhorEnvio } from 'src/app/services/frete.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  carrinho: any[] = [];
  total: number = 0;

  cepDestino: string = '';
  freteErro: string = '';
  carregandoFrete: boolean = false;

  fretes: FreteMelhorEnvio[] = [];
  freteSelecionado: FreteMelhorEnvio | null = null;

  carregandoPagamento: boolean = false;

  constructor(
    private freteService: FreteService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const carrinhoLocal = localStorage.getItem('carrinho');
    this.carrinho = carrinhoLocal ? JSON.parse(carrinhoLocal) : [];

    // Enriquecer o carrinho com peso/dimensões se estiverem faltando
    this.enriquecerCarrinhoComDimensoes()
      .then(() => this.calcularTotal())
      .catch(() => this.calcularTotal());
  }

  /**
   * Busca /api/produtos e injeta width_cm, height_cm, length_cm, weight_kg
   * nos itens do carrinho que não tiverem essas propriedades.
   * (Funciona se seu backend já estiver retornando essas colunas novas.)
   */
  private async enriquecerCarrinhoComDimensoes(): Promise<void> {
    if (!this.carrinho?.length) return;

    // Se todos já têm dimensões/peso, não precisa buscar nada
    const precisaBuscar = this.carrinho.some(it =>
      it.width_cm == null && it.width == null ||
      it.height_cm == null && it.height == null ||
      it.length_cm == null && it.length == null ||
      it.weight_kg == null && it.weight == null
    );
    if (!precisaBuscar) return;

    try {
      const produtos: any[] = await this.http
        .get<any[]>(`${environment.apiUrl.replace(/\/$/, '')}/produtos`)
        .toPromise()
        .then(res => res || []);

      const porId = new Map<number, any>();
      produtos.forEach(p => porId.set(Number(p.id), p));

      this.carrinho = this.carrinho.map(item => {
        const id = Number(item.id_produto || item.id);
        const ref = porId.get(id);
        if (!ref) return item;

        // só preenche o que estiver faltando
        return {
          ...item,
          width_cm:   item.width_cm   ?? item.width   ?? ref.width_cm,
          height_cm:  item.height_cm  ?? item.height  ?? ref.height_cm,
          length_cm:  item.length_cm  ?? item.length  ?? ref.length_cm,
          weight_kg:  item.weight_kg  ?? item.weight  ?? ref.weight_kg
        };
      });
    } catch (e) {
      // Se der erro, seguimos com o que tivermos (backend usará DEFAULT_PKG)
      console.warn('Falha ao enriquecer dimensões do carrinho. Usando DEFAULT_PKG no backend.', e);
    }
  }

  // --- helpers numéricos (evita NaN quando vier "29,90" ou "29.90" como string)
  private toNum(v: any): number {
    if (v == null) return 0;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  calcularTotal(): void {
    this.total = this.carrinho.reduce((acc, item) => {
      const preco = this.toNum(item.preco);
      const qtd = this.toNum(item.quantidade) || 1;
      return acc + (preco * qtd);
    }, 0);
  }

  calcularFrete(): void {
    const cep = (this.cepDestino || '').replace(/\D/g, '');
    if (!cep || cep.length < 8) {
      this.freteErro = 'Informe um CEP válido';
      return;
    }

    this.carregandoFrete = true;
    this.freteErro = '';
    this.fretes = [];
    this.freteSelecionado = null;

    // Envia CEP + CARRINHO (com dimensões/peso) para o backend
    this.freteService.calcularFrete(this.cepDestino, this.carrinho).subscribe({
      next: (res) => {
        this.fretes = (res || []).filter(f => !f.error);
        if (!this.fretes.length) {
          this.freteErro = 'Nenhuma opção de frete encontrada.';
        }
        this.carregandoFrete = false;
      },
      error: (err) => {
        console.error('Erro no frete:', err);
        // Mensagem vinda do backend (quando possível)
        const msg = err?.error?.error || err?.error?.message || 'Erro ao calcular frete.';
        this.freteErro = typeof msg === 'string' ? msg : 'Erro ao calcular frete.';
        this.carregandoFrete = false;
      }
    });
  }

  selecionarFrete(frete: FreteMelhorEnvio): void {
    this.freteSelecionado = frete;
  }

  obterTotalComFrete(): string {
    const valorFrete = this.freteSelecionado ? this.toNum(this.freteSelecionado.price) : 0;
    return (this.total + valorFrete).toFixed(2);
  }

  /** Exibe "X dia(s) úteis)" se tivermos days normalizado pelo backend */
  prazoTexto(f: FreteMelhorEnvio): string {
    const days = f?.delivery_time?.days;
    if (typeof days === 'number' && Number.isFinite(days)) {
      return `${days} dia${days === 1 ? '' : 's'} úteis`;
    }
    return 'Prazo a confirmar';
    // Se preferir, você pode checar faixa (min/max) se enviar isso do backend.
  }

  /** Data estimada amigável, se o backend tiver preenchido */
  dataEstimada(f: FreteMelhorEnvio): string {
    const raw = f?.delivery_time?.estimated_date;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  }

  getNomeServico(nome: string): string {
    if (!nome) return '';
    const n = nome.toLowerCase();
    if (n.includes('sedex')) return 'SEDEX';
    if (n.includes('pac')) return 'PAC';
    return nome;
  }

  finalizarCompra(): void {
    if (!this.freteSelecionado || this.carrinho.length === 0) {
      this.toastr.error('Selecione o frete para continuar.');
      return;
    }

    this.carregandoPagamento = true;

    const pedido = {
      nome: (document.getElementById('nome') as HTMLInputElement)?.value || '',
      email: (document.getElementById('email') as HTMLInputElement)?.value || '',
      telefone: (document.getElementById('telefone') as HTMLInputElement)?.value || '',
      endereco: (document.getElementById('endereco') as HTMLInputElement)?.value || '',
      cep: this.cepDestino,
      logradouro: (document.getElementById('logradouro') as HTMLInputElement)?.value || '',
      cidade: (document.getElementById('cidade') as HTMLInputElement)?.value || '',
      items: this.carrinho.map(item => ({
        nome: item.nome,
        tamanho: item.tamanho,
        preco: this.toNum(item.preco),
        quantidade: this.toNum(item.quantidade) || 1,
      })),
      frete: this.freteSelecionado,
      total: this.obterTotalComFrete()
    };

    // 1) salva a venda
    this.http.post(`${environment.apiUrl}/vendas`, pedido).subscribe({
      next: () => {
        // 2) gera link de pagamento (MP)
        this.http.post<{ init_point: string }>(`${environment.apiUrl}/checkout`, pedido)
          .subscribe({
            next: (res) => {
              this.carregandoPagamento = false;
              if (res?.init_point) {
                window.location.href = res.init_point;
              } else {
                this.toastr.error('Erro ao gerar link de pagamento.');
              }
            },
            error: () => {
              this.carregandoPagamento = false;
              this.toastr.error('Erro ao finalizar compra.');
            }
          });
      },
      error: () => {
        this.carregandoPagamento = false;
        this.toastr.error('Erro ao registrar pedido.');
      }
    });
  }
}
