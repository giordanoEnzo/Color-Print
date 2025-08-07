import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';
import { PixService } from 'src/app/services/pix.service';
import { CartService } from 'src/app/services/cart.service';
import { Router } from '@angular/router';
import { Produto } from 'src/app/services/cart.service';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from 'src/environments/environment';

interface Categoria {
  id_categoria: number;
  nome: string;
  produtos: Produto[];
}

interface VariacaoProduto {
  id_variacao: number;
  nome_variacao: string;
  descricao_opcao: string;
  preco_adicional: number;
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

  produtoSelecionado: Produto | null = null;

  slides = [
    { imagem: 'assets/images/banner.jpg', alt: 'Banner 1' },
    { imagem: 'assets/images/banner2.jpg', alt: 'Banner 2' },
    { imagem: 'assets/images/banner3.jpg', alt: 'Banner 3' },
  ];
  slideIndex = 0;

  variacoesProduto: VariacaoProduto[] = [];
  variacaoSelecionada: VariacaoProduto | null = null;
  quantidade: number = 1;
  precoCalculado: number = 0;

  // Agora ele será sobrescrito pelo backend (produto em destaque do banco)
  produtoDestaque: Produto = {
    id_produto: 0,
    nome: 'Produto em destaque',
    preco: 0,
    imagem: '',
    descricao: ''
  };

  constructor(
    private toastr: ToastrService,
    private produtoService: ProdutoService,
    private pixService: PixService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Busca o produto destaque na inicialização
    this.produtoService.getProdutoDestaque().subscribe({
      next: (res: Produto) => {
        if (res) this.produtoDestaque = res;
      },
      error: () => {
        this.produtoDestaque = {
          id_produto: 0,
          nome: 'Produto em destaque',
          preco: 0,
          imagem: '',
          descricao: ''
        };
      }
    });

    this.carregarCategoriasComProdutos();
  }

  avancarSlide() {
    this.slideIndex = (this.slideIndex + 1) % this.slides.length;
  }

  voltarSlide() {
    this.slideIndex = (this.slideIndex - 1 + this.slides.length) % this.slides.length;
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

  abrirModal(produto: Produto): void {
    const idProduto = produto.id_produto || (produto as any).id;
    if (!idProduto) {
      console.error('ID do produto não encontrado:', produto);
      return;
    }

    this.produtoSelecionado = {
      ...produto,
      id_produto: idProduto
    };

    this.quantidade = 1;
    this.variacoesProduto = [];
    this.variacaoSelecionada = null;

    this.carregarVariacoesProduto(idProduto);
  }

  carregarVariacoesProduto(id_produto: number): void {
    this.produtoService.getVariacoesPorProduto(id_produto).subscribe({
      next: (res: VariacaoProduto[]) => {
        const variacoes = [
          {
            id_variacao: 0,
            nome_variacao: 'Padrão',
            descricao_opcao: 'Padrão',
            preco_adicional: this.produtoSelecionado?.preco || 0
          },
          ...res
        ];

        this.variacoesProduto = variacoes;
        this.variacaoSelecionada = variacoes[0];
        this.calcularPreco();
      },
      error: (err) => {
        const variacoes = [
          {
            id_variacao: 0,
            nome_variacao: 'Padrão',
            descricao_opcao: 'Padrão',
            preco_adicional: this.produtoSelecionado?.preco || 0
          }
        ];

        this.variacoesProduto = variacoes;
        this.variacaoSelecionada = variacoes[0];
        this.calcularPreco();
      }
    });
  }

  fecharModal(): void {
    this.produtoSelecionado = null;
  }

  selecionarVariacao(variacao: VariacaoProduto): void {
    this.variacaoSelecionada = variacao;
    this.calcularPreco();
    this.cdr.detectChanges();
  }

  incrementarQuantidade() {
    this.quantidade++;
    this.calcularPreco();
  }

  decrementarQuantidade() {
    if (this.quantidade > 1) {
      this.quantidade--;
      this.calcularPreco();
    }
  }

  calcularPreco(): void {
    const precoUnitario = this.variacaoSelecionada?.preco_adicional || 0;
    this.precoCalculado = precoUnitario * this.quantidade;
  }

  adicionarAoCarrinho(produto: Produto): void {
    const precoUnitario = this.variacaoSelecionada?.preco_adicional || produto.preco;
    const descricao = this.variacaoSelecionada?.descricao_opcao || 'Padrão';

    this.cartService.adicionarAoCarrinho(
      produto,
      precoUnitario,
      descricao,
      1,
      1,
      this.quantidade
    );

    this.toastr.success('Produto adicionado ao carrinho!');
  }

  adicionarSelecionadoAoCarrinho(): void {
    if (!this.produtoSelecionado) return;
    this.adicionarAoCarrinho(this.produtoSelecionado);
    this.fecharModal();
  }

  finalizarCompra(): void {
    const carrinho = this.cartService.getCarrinhoAtual();

    if (carrinho.length === 0) {
      this.toastr.warning('Carrinho vazio!');
      return;
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    this.router.navigate(['/checkout']);
  }

  getImagemUrl(imagem: string): string {
    if (!imagem) return 'assets/images/placeholder.jpg';
    return `${environment.assetsUrl.replace(/\/$/, '')}/uploads/produtos/${imagem}`;
  }
}
