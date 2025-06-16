import { Component, OnInit } from '@angular/core';
import { ProdutoService } from 'src/app/services/produto.service';
import { Produto } from 'src/app/interfaces/produto.interface';
import { ToastrService } from 'ngx-toastr';
import { PedidoService } from 'src/app/services/pedidos.service';
import { MesaService } from 'src/app/services/mesa.service';
import { PixService, PixRequest  } from 'src/app/services/pix.service';
import { interval, takeWhile, switchMap } from 'rxjs';

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingpageComponent implements OnInit {
  
  lanches: Produto[] = [];
  bebidas: Produto[] = [];
  dogs: Produto[] = [];
  frango: Produto[] = [];
  contra: Produto[] = [];
  doce: Produto[] = [];

  taxa_entrega: number = 10.00;

  pixLinkGerado: string | null = null;

  erro: string = '';

  dadosCliente = {
    nome: '',
    telefone: '',
    cpf: '',
    endereco: '',
    tipoEntrega: '',
    troco: 0,
    observacao: '',
    pagamento: ''
  };

  produtoDestaque = {
    id_produto: 999, // um ID fictício, só precisa ser único
    nome: 'Combo',
    descricao: 'Combo promocional especial',
    preco: 25.00,
    imagemUrl: 'assets/images/promo.jpg'
  };

  carrinho: any[] = [];
  carrinhoAberto = false;
  mostrarModal = false;
  qrCodePix: string = '';
  statusPagamento: string = 'Aguardando pagamento...';

  constructor(
    private produtoService: ProdutoService,
    private pedidoService: PedidoService,
    private mesaService: MesaService,
    private pixService: PixService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.carregarPorCategoria('lanche', 'lanches');
    this.carregarPorCategoria('bebidas', 'bebidas');
    this.carregarPorCategoria('dogs', 'dogs');
    this.carregarPorCategoria('contra', 'contra');
    this.carregarPorCategoria('frango', 'frango');
    this.carregarPorCategoria('doce', 'doce');
  }

  private carregarPorCategoria(categoria: string, destino: 'lanches' | 'bebidas' | 'dogs' | 'frango' | 'contra' | 'doce'): void {
    this.produtoService.getProdutosPorCategoria(categoria).subscribe(
      (response: Produto[]) => {
        this[destino] = response.map(produto => ({
          ...produto,
          imagemUrl: produto.imagem ? `https://haretable.com.br${produto.imagem}` : ''
        }));
      },
      (error) => {
        this.erro = 'Erro ao carregar produtos';
        console.error(`Erro ao carregar produtos da categoria ${categoria}:`, error);
      }
    );
  }

  adicionar(produto: any) {
    const existente = this.carrinho.find(p => p.id_produto === produto.id_produto);
    if (existente) {
      existente.quantidade += 1;
    } else {
      this.carrinho.push({ ...produto, quantidade: 1 });
    }
  }

  incrementarQuantidade(produto: any) {
    const item = this.carrinho.find(p => p.id === produto.id);
    if (item) {
      item.quantidade += 1;
    }
  }

  decrementarQuantidade(produto: any) {
    const existente = this.carrinho.find(p => p.id_produto === produto.id_produto);
    if (existente) {
      existente.quantidade -= 1;
      if (existente.quantidade <= 0) {
        this.carrinho = this.carrinho.filter(p => p.id_produto !== produto.id_produto);
      }
    }
  }

  removerDoCarrinho(produto: any) {
    this.carrinho = this.carrinho.filter(p => p.id !== produto.id);
  }

  calcularTotal() {
    return this.carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
  }

  toggleCarrinho() {
    this.carrinhoAberto = !this.carrinhoAberto;
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
  }

  atualizarTipoEntrega() {
    if (this.dadosCliente.tipoEntrega === 'Retirada') {
      this.dadosCliente.endereco = '';
    }
  }
  
  finalizarPedido(): void {
    const dataAtual = new Date();
    const data_pedido = dataAtual.toISOString().slice(0, 10);
    const hora_pedido = dataAtual.toLocaleTimeString('pt-BR', { hour12: false });
    const dataHoraPedido = `${data_pedido} ${hora_pedido}`;

    const valorpedido = this.calcularTotalCarrinho();


    const novaMesa = {
      nome: this.dadosCliente.nome,
      status: 'Aberta',
      numero: 100,
      ordem_type: 'Pedido',
      capacidade: 1,
      endereco: this.dadosCliente.endereco || '',
      id_empresa: 2,
      troco:this.dadosCliente.troco || 0,
      telefone:this.dadosCliente.telefone || '',
      totalConsumo: this.calcularTotalCarrinho()
    };

    console.log(this.dadosCliente.telefone ,'this.dadosCliente.telefone ')

    if (this.dadosCliente.pagamento === 'Pix') {

      const dadosPix = {
        transaction_amount: valorpedido,
        description:'pagamento via pix',
        payer_email: 'ramirezstwart@gmail.com',
      };
          
      this.pixService.gerarPagamentoPix(dadosPix).subscribe({
        next: (res) => {
          console.log('PIX gerado:', res);
          this.pixLinkGerado = res.ticket_url; // ✅ salva o link para exibir no HTML

          this.iniciarVerificacaoStatus(res.id, novaMesa, dataHoraPedido); // ✅ passa os dados aqui
        },
        error: (err) => {
          console.error('Erro ao gerar PIX:', err);
          this.toastr.error('Erro ao gerar pagamento. Tente novamente.');
        }
      });

    } else {

        // metodo para criar a mesa e adicionar pedido em lote
        this.mesaService.addMesa(novaMesa).subscribe({
          next: (mesaCriada) => {
            const id_mesa = mesaCriada.id;

            const pedidosEmLote = this.carrinho.map(produto => ({
              id_pedido: 0,
              id_mesa: id_mesa,
              id_item: produto.id_produto,
              nome_item: produto.nome,
              impresso: 0,
              preco: parseFloat(produto.preco),
              quantidade: produto.quantidade,
              observacao: this.dadosCliente.observacao || '',
              data_hora: dataHoraPedido,
              status: 'Solicitado',
              id_empresa: 2
            }));

            this.pedidoService.addPedidosEmLote(pedidosEmLote).subscribe(() => {
              this.toastr.success('Pedidos enviados com sucesso!');
              this.carrinho = [];
            }, err => {
              console.error('Erro ao enviar pedidos:', err);
              this.toastr.error('Erro ao enviar pedidos.');
            });
          },
          error: (err) => {
            console.error('Erro ao criar mesa:', err);
            this.toastr.error('Erro ao criar mesa. Tente novamente.');
          }
        });

    }

    // setTimeout(() => {
    //   window.location.reload();
    // }, 800);

  }


  
iniciarVerificacaoStatus(id: string, novaMesa: any, dataHoraPedido: string): void {
  interval(30000) // a cada 30 segundos
    .pipe(
      switchMap(() => this.pixService.consultarStatusPagamento(id)),
      takeWhile(res => res.status !== 'approved', true)
    )
    .subscribe(res => {
      this.statusPagamento = res.status;

      if (res.status === 'approved') {
        alert('Pagamento confirmado com sucesso!');

        // ✅ Agora cria a mesa e os pedidos
        this.mesaService.addMesa(novaMesa).subscribe({
          next: (mesaCriada) => {
            const id_mesa = mesaCriada.id;

            const pedidosEmLote = this.carrinho.map(produto => ({
              id_pedido: 0,
              id_mesa: id_mesa,
              id_item: produto.id_produto,
              nome_item: produto.nome,
              impresso: 0,
              preco: parseFloat(produto.preco),
              quantidade: produto.quantidade,
              observacao: this.dadosCliente.observacao || '',
              data_hora: dataHoraPedido,
              status: 'Solicitado',
              id_empresa: 2
            }));

            this.pedidoService.addPedidosEmLote(pedidosEmLote).subscribe(() => {
              this.toastr.success('Pedidos enviados com sucesso!');
              this.carrinho = [];
            }, err => {
              console.error('Erro ao enviar pedidos:', err);
              this.toastr.error('Erro ao enviar pedidos.');
            });
          },
          error: (err) => {
            console.error('Erro ao criar mesa:', err);
            this.toastr.error('Erro ao criar mesa. Tente novamente.');
          }
        });

      } else {
        console.log('Status atual do pagamento:', res.status);
        this.toastr.info('Aguardando confirmação de pagamento via PIX...');
      }
    });
}


calcularTotalCarrinho(): number {
  const subtotal = this.carrinho.reduce((total, item) => {
    return total + (parseFloat(item.preco) * item.quantidade);
  }, 0);

  // Só adiciona a taxa se for entrega (e não retirada)
  if (this.dadosCliente.tipoEntrega === 'Entrega') {
    return subtotal + this.taxa_entrega;
  }

  return subtotal;
}

}
