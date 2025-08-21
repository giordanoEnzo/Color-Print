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
    this.calcularTotal();
  }

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
    const cepLimpo = (this.cepDestino || '').replace(/\D/g, '');
    console.log('[DEBUG] CEP digitado:', this.cepDestino, '| CEP limpo:', cepLimpo);

    if (!cepLimpo || cepLimpo.length !== 8) {
      this.freteErro = 'Informe um CEP válido';
      return;
    }

    this.carregandoFrete = true;
    this.freteErro = '';
    this.fretes = [];
    this.freteSelecionado = null;

    this.freteService.calcularFrete(cepLimpo, this.carrinho).subscribe({
      next: (res) => {
        console.log('[DEBUG] Resposta frete:', res);
        this.fretes = (res || []).filter(f => !f.error);
        if (!this.fretes.length) {
          this.freteErro = 'Nenhuma opção de frete encontrada.';
        }
        this.carregandoFrete = false;
      },
      error: (err) => {
        console.error('[DEBUG] Erro no frete:', err);
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

  finalizarCompra(): void {
    const nome = (document.getElementById('nome') as HTMLInputElement)?.value?.trim() || '';
    const email = (document.getElementById('email') as HTMLInputElement)?.value?.trim() || '';
    const telefone = (document.getElementById('telefone') as HTMLInputElement)?.value?.trim() || '';
    const endereco = (document.getElementById('endereco') as HTMLInputElement)?.value?.trim() || '';
    const cepRaw = (document.getElementById('cep') as HTMLInputElement)?.value?.trim() || '';
    const cep = cepRaw.replace(/\D/g, ''); // remove máscara
    const logradouro = (document.getElementById('logradouro') as HTMLInputElement)?.value?.trim() || '';
    const cidade = (document.getElementById('cidade') as HTMLInputElement)?.value?.trim() || '';
    const estado_uf = (document.getElementById('estado_uf') as HTMLInputElement)?.value?.trim() || '';

    console.log('[DEBUG] Dados capturados:', { nome, email, telefone, endereco, cepRaw, cep, logradouro, cidade, estado_uf });

    // Validação
    if (!nome || !email || !telefone || !endereco || !cep || cep.length < 8 || !logradouro || !cidade || !estado_uf) {
      this.toastr.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!this.freteSelecionado || this.carrinho.length === 0) {
      this.toastr.error('Selecione o frete para continuar.');
      return;
    }

    this.carregandoPagamento = true;

    const pedido = {
      nome,
      email,
      telefone,
      endereco,
      cep,
      logradouro,
      cidade,
      estado_uf,
      items: this.carrinho.map(item => ({
        nome: item.nome,
        tamanho: item.tamanho,
        preco: this.toNum(item.preco),
        quantidade: this.toNum(item.quantidade) || 1,
      })),
      frete: this.freteSelecionado,
      total: this.obterTotalComFrete()
    };

    console.log('[DEBUG] Pedido enviado para API:', pedido);

    this.http.post(`${environment.apiUrl}/vendas`, pedido).subscribe({
      next: () => {
        this.http.post<{ init_point: string }>(`${environment.apiUrl}/checkout`, pedido).subscribe({
          next: (res) => {
            this.carregandoPagamento = false;
            if (res?.init_point) {
              window.location.href = res.init_point;
            } else {
              this.toastr.error('Erro ao gerar link de pagamento.');
            }
          },
          error: (err) => {
            console.error('[DEBUG] Erro checkout:', err);
            this.carregandoPagamento = false;
            this.toastr.error('Erro ao finalizar compra.');
          }
        });
      },
      error: (err) => {
        console.error('[DEBUG] Erro salvar venda:', err);
        this.carregandoPagamento = false;
        this.toastr.error('Erro ao registrar pedido.');
      }
    });
  }



}
