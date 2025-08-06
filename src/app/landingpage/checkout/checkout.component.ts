import { Component, OnInit } from '@angular/core';
import { FreteService, FreteMelhorEnvio } from 'src/app/services/frete.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';

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
    private toastr: ToastrService // Pode remover se não usar
  ) {}

  ngOnInit(): void {
    const carrinhoLocal = localStorage.getItem('carrinho');
    this.carrinho = carrinhoLocal ? JSON.parse(carrinhoLocal) : [];
    this.calcularTotal();
  }

  calcularTotal(): void {
    this.total = this.carrinho.reduce((acc, item) => {
      return acc + (item.preco * (item.quantidade || 1));
    }, 0);
  }

  calcularFrete(): void {
    if (!this.cepDestino || this.cepDestino.replace(/\D/g, '').length < 8) {
      this.freteErro = 'Informe um CEP válido';
      return;
    }

    this.carregandoFrete = true;
    this.freteErro = '';
    this.fretes = [];
    this.freteSelecionado = null;

    this.freteService.calcularFrete(this.cepDestino, 1).subscribe({
      next: (res) => {
        if (res && Array.isArray(res)) {
          this.fretes = res.filter(f => !f.error || f.error === '');
          if (!this.fretes.length) {
            this.freteErro = 'Nenhuma opção de frete encontrada.';
          }
        } else {
          this.freteErro = 'Nenhuma opção de frete encontrada.';
        }
        this.carregandoFrete = false;
      },
      error: (err) => {
        this.freteErro = 'Erro ao calcular frete.';
        console.error('Erro no frete:', err);
        this.carregandoFrete = false;
      }
    });
  }

  selecionarFrete(frete: FreteMelhorEnvio): void {
    this.freteSelecionado = frete;
  }

  obterTotalComFrete(): string {
    const valorFrete = this.freteSelecionado
      ? parseFloat(this.freteSelecionado.price.replace(',', '.'))
      : 0;
    return (this.total + valorFrete).toFixed(2);
  }

  getNomeServico(nome: string): string {
    if (nome.toLowerCase().includes('sedex')) return 'SEDEX';
    if (nome.toLowerCase().includes('pac')) return 'PAC';
    return nome;
  }

  finalizarCompra(): void {
    if (!this.freteSelecionado || this.carrinho.length === 0) {
      this.toastr.error('Selecione o frete para continuar.');
      return;
    }

    this.carregandoPagamento = true;

    const pedido = {
      items: this.carrinho.map(item => ({
        nome: item.nome,
        tamanho: item.tamanho,
        preco: item.preco,
        quantidade: item.quantidade || 1,
      })),
      frete: this.freteSelecionado,
      cepDestino: this.cepDestino,
      total: this.obterTotalComFrete()
    };

    this.http.post<{ init_point: string }>(`${environment.apiUrl}/checkout`, pedido)
      .subscribe({
        next: (res) => {
          this.carregandoPagamento = false;
          if (res.init_point) {
            window.location.href = res.init_point;
          } else {
            this.toastr.error('Erro ao gerar link de pagamento.');
          }
        },
        error: (err) => {
          this.carregandoPagamento = false;
          console.error('Erro ao finalizar compra:', err);
          this.toastr.error('Erro ao finalizar compra.');
        }
      });
  }
}
