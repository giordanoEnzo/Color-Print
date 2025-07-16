import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';
import { PixService } from 'src/app/services/pix.service';
import { CartService } from 'src/app/services/cart.service';

import { Produto, CarrinhoItem } from 'src/app/services/cart.service';

interface Categoria {
  id_categoria: number;
  nome: string;
  produtos: Produto[];
}

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingpageComponent implements OnInit {
  categoriasComProdutos: Categoria[] = [];
  categoriaSelecionada: Categoria | null = null;
  produtosDaCategoria: Produto[] = [];

  textoDestaque: string = 'DESTAQUE DE PROMOÇÃO';
  repeteTexto = Array(20);

  altura = 1;
  largura = 1;
  precoCalculado = 0;

  produtoSelecionado: Produto | null = null;

  tamanhos = ['2.5x2.5', '3x3', '4x4', '5x5', 'Personalizado'];
  quantidades = [100, 500, 1000];

  tamanhoSelecionado = '2.5x2.5';
  quantidadeSelecionada: number | 'Outro' = 100;
  quantidadePersonalizada = 1;

  produtoDestaque: Produto = {
    id_produto: 999,
    nome: 'Placas adesivas proibido estacionar 2x2 100 Unidades',
    preco: 35.0,
    imagem: 'assets/images/produtos/SC001.jpg',
    descricao: 'Placa adesiva em vinil com tamanho 2x2 e pacote de 100 unidades.'
  };

  constructor(
    private toastr: ToastrService,
    private produtoService: ProdutoService,
    private pixService: PixService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.carregarCategoriasComProdutos();
    this.calcularPreco();
  }

  carregarCategoriasComProdutos(): void {
    this.produtoService.getCategoriasComProdutos().subscribe({
      next: (res: Categoria[]) => this.categoriasComProdutos = res,
      error: (err) => console.error('Erro ao carregar categorias e produtos:', err)
    });
  }

  verTodosDaCategoria(categoria: Categoria): void {
    this.categoriaSelecionada = categoria;
    this.produtosDaCategoria = categoria.produtos;
  }

  voltarParaHome(): void {
    this.categoriaSelecionada = null;
    this.produtosDaCategoria = [];
  }

  adicionarAoCarrinho(produto: Produto): void {
    this.cartService.adicionarAoCarrinho(
      produto,
      this.precoCalculado,
      this.tamanhoSelecionado,
      this.altura,
      this.largura,
      1
    );
    this.toastr.success('Produto adicionado ao carrinho!');
  }

  adicionarSelecionadoAoCarrinho(): void {
    if (!this.produtoSelecionado) return;
    this.adicionarAoCarrinho(this.produtoSelecionado);
    this.fecharModal();
  }

  abrirModal(produto: Produto): void {
    this.produtoSelecionado = produto;
    this.tamanhoSelecionado = '2.5x2.5';
    this.quantidadeSelecionada = 100;
    this.altura = 1;
    this.largura = 1;
    this.calcularPreco();
  }

  fecharModal(): void {
    this.produtoSelecionado = null;
  }

  calcularPreco(): void {
    const tabelaPrecos: Record<string, Record<number, number>> = {
      '2.5x2.5': { 100: 35, 500: 55, 1000: 90 },
      '3x3':     { 100: 40, 500: 60, 1000: 100 },
      '4x4':     { 100: 50, 500: 70, 1000: 120 },
      '5x5':     { 100: 60, 500: 90, 1000: 150 }
    };

    if (!this.tamanhoSelecionado) {
      this.precoCalculado = 0;
      return;
    }

    if (this.tamanhoSelecionado === 'Personalizado') {
      const area = (this.altura || 0) * (this.largura || 0);
      const precoMetroQuadrado = 80;
      const qtd = this.quantidadeSelecionada === 'Outro' ? +this.quantidadePersonalizada : +this.quantidadeSelecionada;
      this.precoCalculado = Number((area * precoMetroQuadrado * qtd).toFixed(2));
      return;
    }

    const tabela = tabelaPrecos[this.tamanhoSelecionado];
    if (!tabela) {
      this.precoCalculado = 0;
      return;
    }

    const quantidade = this.quantidadeSelecionada === 'Outro'
      ? +this.quantidadePersonalizada
      : +this.quantidadeSelecionada;

    if (tabela[quantidade]) {
      this.precoCalculado = tabela[quantidade];
      return;
    }

    const quantidades = Object.keys(tabela).map(Number).sort((a, b) => a - b);
    let menor = quantidades[0];
    let maior = quantidades[quantidades.length - 1];

    for (let i = 0; i < quantidades.length - 1; i++) {
      if (quantidade > quantidades[i] && quantidade < quantidades[i + 1]) {
        menor = quantidades[i];
        maior = quantidades[i + 1];
        break;
      }
    }

    const precoMenor = tabela[menor];
    const precoMaior = tabela[maior];
    const precoInterpolado = precoMenor + ((quantidade - menor) * (precoMaior - precoMenor)) / (maior - menor);
    this.precoCalculado = Number(precoInterpolado.toFixed(2));
  }

  finalizarCompra(): void {
    const carrinho = this.cartService.getCarrinhoAtual();

    if (carrinho.length === 0) {
      this.toastr.warning('Carrinho vazio!');
      return;
    }

    console.log('Enviando itens para o checkout:', carrinho);

    this.pixService.criarCheckoutPro(carrinho).subscribe({
      next: (res) => {
        if (res.init_point) {
          window.location.href = res.init_point;
        } else {
          this.toastr.error('Erro ao redirecionar para o Mercado Pago');
        }
      },
      error: (err) => {
        console.error('Erro ao finalizar compra:', err);
        this.toastr.error('Falha ao criar preferência');
      }
    });
  }
}
