import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

import { FreteService, FreteMelhorEnvio } from 'src/app/services/frete.service';
import { VendasService } from 'src/app/services/vendas.service';
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
    private toastr: ToastrService,
    private vendasService: VendasService
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

    // Debug
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

    // Pedido que será enviado para o backend (vai para /checkout)
    // Normalize frete and total before sending
    const normalizedFrete = this.freteSelecionado ? {
      name: this.freteSelecionado.name,
      price: Number(String(this.freteSelecionado.price).replace(',', '.'))
    } : null;

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
      frete: normalizedFrete,
      total: Number(String(this.obterTotalComFrete()).replace(',', '.'))
    };

    console.log('[DEBUG] Pedido enviado para API/checkout:', pedido);

    // Agora só cria a preferência no Mercado Pago
    this.http.post<{ init_point: string }>(`${environment.apiUrl}/checkout`, pedido).subscribe({
      next: (res) => {
        this.carregandoPagamento = false;
        if (res?.init_point) {
          // Se houver arte(s) em base64 no carrinho, envie para o endpoint /api/vendas/:id/arte
          const orderId = (res as any).order_id || null;
          const itemComArquivo = this.carrinho.find(it => (it as any).arquivoBase64);

          const redirectToMP = () => { window.location.href = (res as any).init_point; };

          if (orderId && itemComArquivo && (itemComArquivo as any).arquivoBase64) {
            // Converte dataURL -> File (mesma lógica usada no método temporário)
            const b64DataUrl = (itemComArquivo as any).arquivoBase64 as string;
            const originalName = (itemComArquivo as any).arquivoName || `arte_${Date.now()}`;

            const dataURLtoFile = (dataurl: string, filename: string): File => {
              const parts = dataurl.split(',');
              const meta = parts[0] || '';
              const base64 = parts[1] || parts[0];
              const mimeMatch = meta.match(/data:([^;]+)/);
              const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
              const binary = atob(base64);
              const len = binary.length;
              const u8 = new Uint8Array(len);
              for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);

              let fname = filename;
              if (!/\./.test(fname)) {
                const ext = mime.split('/')[1] || 'bin';
                fname = `${fname}.${ext}`;
              }

              return new File([u8], fname, { type: mime });
            };

            try {
              const file = dataURLtoFile(b64DataUrl, originalName);
              const fd = new FormData();
              fd.append('arquivo', file);

              // envia arquivo para o endpoint específico de arte do pedido
              this.http.post(`${environment.apiUrl}/vendas/${orderId}/arte`, fd).subscribe({
                next: () => {
                  // independente do sucesso do upload, redirecionamos ao MP
                  redirectToMP();
                },
                error: (err) => {
                  console.warn('Upload de arte falhou, redirecionando ao Mercado Pago:', err);
                  redirectToMP();
                }
              });
              return; // não redireciona aqui — o redirect ocorre no callback acima
            } catch (e) {
              console.error('Erro ao converter base64 para arquivo antes do upload:', e);
              // continua e redireciona mesmo se falhar
              redirectToMP();
              return;
            }
          }

          // Sem arquivo para enviar ou sem orderId: redireciona direto
          redirectToMP();
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
  }

  /**
   * Método temporário para registrar a venda diretamente no backend sem passar pelo Mercado Pago.
   * Uso: apenas para testes locais. Será removido depois.
   */
  registrarVendaDireto(): void {
    // Captura campos (mesma validação mínima de finalizarCompra)
    const nome = (document.getElementById('nome') as HTMLInputElement)?.value?.trim() || '';
    const email = (document.getElementById('email') as HTMLInputElement)?.value?.trim() || '';
    const telefone = (document.getElementById('telefone') as HTMLInputElement)?.value?.trim() || '';
    const endereco = (document.getElementById('endereco') as HTMLInputElement)?.value?.trim() || '';
    const cepRaw = (document.getElementById('cep') as HTMLInputElement)?.value?.trim() || '';
    const cep = cepRaw.replace(/\D/g, ''); // remove máscara
    const logradouro = (document.getElementById('logradouro') as HTMLInputElement)?.value?.trim() || '';
    const cidade = (document.getElementById('cidade') as HTMLInputElement)?.value?.trim() || '';
    const estado_uf = (document.getElementById('estado_uf') as HTMLInputElement)?.value?.trim() || '';

    console.log('[TEMP] Dados para registro direto:', { nome, email, telefone, endereco, cep, logradouro, cidade, estado_uf });

    if (!nome || !email || !telefone || !endereco || !cep || cep.length < 8 || !logradouro || !cidade || !estado_uf) {
      this.toastr.error('Por favor, preencha todos os campos obrigatórios antes de registrar a venda.');
      return;
    }

    if (this.carrinho.length === 0) {
      this.toastr.error('Carrinho vazio.');
      return;
    }

    if (!this.freteSelecionado) {
      this.toastr.error('Selecione uma opção de frete antes de registrar a venda.');
      return;
    }

    this.carregandoPagamento = true;

    // Build items with additional fields coming from orçamento (largura/altura) when available
    const items = this.carrinho.map(item => ({
      nome: item.nome,
      tamanho: item.tamanho,
      preco: this.toNum(item.preco),
      quantidade: this.toNum(item.quantidade) || 1,
      largura: (item as any).largura ?? null,
      altura: (item as any).altura ?? null,
      // keep arquivoName to help identification (not the file content)
      arquivoName: (item as any).arquivoName || null
    }));

    const normalizedFrete2 = this.freteSelecionado ? {
      name: this.freteSelecionado.name,
      price: Number(String(this.freteSelecionado.price).replace(',', '.'))
    } : null;

    const pedido = {
      nome,
      email,
      telefone,
      endereco,
      cep,
      logradouro,
      cidade,
      estado_uf,
      items,
      frete: normalizedFrete2,
      total: Number(String(this.obterTotalComFrete()).replace(',', '.'))
    };

    console.log('[TEMP] Enviando pedido direto para /vendas (items summary):', items.map(i => ({ nome: i.nome, quantidade: i.quantidade })));

    // Find first cart item that carries an uploaded artwork as DataURL (base64)
    const itemComArquivo = this.carrinho.find(it => (it as any).arquivoBase64);
    if (itemComArquivo && (itemComArquivo as any).arquivoBase64) {
      const b64DataUrl = (itemComArquivo as any).arquivoBase64 as string;
      const originalName = (itemComArquivo as any).arquivoName || `arte_${Date.now()}`;

      const dataURLtoFile = (dataurl: string, filename: string): File => {
        // dataurl expected in format 'data:<mime>;base64,<data>'
        const parts = dataurl.split(',');
        const meta = parts[0] || '';
        const base64 = parts[1] || parts[0];
        const mimeMatch = meta.match(/data:([^;]+)/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(base64);
        const len = binary.length;
        const u8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);

        // try to preserve extension from filename; if none, infer from mime
        let fname = filename;
        if (!/\./.test(fname)) {
          const ext = mime.split('/')[1] || 'bin';
          fname = `${fname}.${ext}`;
        }

        return new File([u8], fname, { type: mime });
      };

      try {
        const file = dataURLtoFile(b64DataUrl, originalName);

        this.vendasService.addVendaWithArquivo(pedido, file).subscribe({
          next: (res: any) => {
            this.carregandoPagamento = false;
            console.log('[TEMP] Venda registrada com arquivo com sucesso:', res);
            if (res && res.success) {
              this.toastr.success('Venda registrada com sucesso (teste).');
              localStorage.removeItem('carrinho');
              this.carrinho = [];
              this.total = 0;
              this.fretes = [];
              this.freteSelecionado = null;
            } else {
              this.toastr.error('Registro retornou sem sucesso. Verifique o console.');
            }
          },
          error: (err) => {
            this.carregandoPagamento = false;
            console.error('[TEMP] Erro ao registrar venda com arquivo:', err);
            const msg = err?.error?.erro || err?.error?.message || 'Erro ao registrar venda.';
            this.toastr.error(typeof msg === 'string' ? msg : 'Erro ao registrar venda.');
          }
        });
        return;
      } catch (e) {
        console.error('Erro ao converter base64 para arquivo:', e);
        this.toastr.error('Erro interno ao processar arquivo de arte.');
      }
    }

    // No artwork attached: send JSON
    this.vendasService.addVenda(pedido).subscribe({
      next: (res: any) => {
        this.carregandoPagamento = false;
        console.log('[TEMP] Venda registrada com sucesso:', res);
        if (res && res.success) {
          this.toastr.success('Venda registrada com sucesso (teste).');
          localStorage.removeItem('carrinho');
          this.carrinho = [];
          this.total = 0;
          this.fretes = [];
          this.freteSelecionado = null;
        } else {
          this.toastr.error('Registro retornou sem sucesso. Verifique o console.');
        }
      },
      error: (err) => {
        this.carregandoPagamento = false;
        console.error('[TEMP] Erro ao registrar venda direto:', err);
        const msg = err?.error?.erro || err?.error?.message || 'Erro ao registrar venda.';
        this.toastr.error(typeof msg === 'string' ? msg : 'Erro ao registrar venda.');
      }
    });
  }

}
