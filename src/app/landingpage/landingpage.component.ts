import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';
import { PixService } from 'src/app/services/pix.service';
import { CartService } from 'src/app/services/cart.service';
import { Router } from '@angular/router';
import { Produto } from 'src/app/services/cart.service';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BannerService, BannerFilesResponse } from 'src/app/services/banner.service';

interface Categoria {
  id_categoria: number;
  nome: string;
  produtos: Produto[];
}

interface VariacaoProduto {
  id_variacao: number;
  nome_variacao: string;
  descricao_opcao: string;
  preco_adicional: number; // pode vir string do backend; normalizo com toNum()
}

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingpageComponent implements OnInit, OnDestroy {
  categoriasComProdutos: Categoria[] = [];
  categoriaSelecionada: Categoria | null = null;
  produtosDaCategoria: Produto[] = [];

  textoDestaque: string = 'DESTAQUE DE PROMOÇÃO';
  repeteTexto = Array(20);

  produtoSelecionado: Produto | null = null;

  slides: { imagem: string; alt: string }[] = [
    { imagem: 'assets/images/banner.jpg',  alt: 'Banner 1' },
    { imagem: 'assets/images/banner2.jpg', alt: 'Banner 2' },
    { imagem: 'assets/images/banner3.jpg', alt: 'Banner 3' },
  ];
  slideIndex = 0;

  // autoplay
  private carouselTimerId: ReturnType<typeof setInterval> | null = null;
  private readonly carouselIntervalMs = 5000;

  variacoesProduto: VariacaoProduto[] = [];
  variacaoSelecionada: VariacaoProduto | null = null;
  quantidade: number = 1;
  precoCalculado: number = 0;

  // produto destaque (do backend)
  produtoDestaque: Produto = {
    id_produto: 0,
    nome: 'Produto em destaque',
    preco: 0,
    imagem: '',
    descricao: ''
  };

  // evita cache quando o admin troca banner
  private _cb = `?v=${Date.now()}`;

  constructor(
    private toastr: ToastrService,
    private produtoService: ProdutoService,
    private pixService: PixService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private bannerService: BannerService,
  ) {}

  ngOnInit(): void {
    // produto destaque
    this.produtoService.getProdutoDestaque().subscribe({
      next: (res: Produto) => { if (res) this.produtoDestaque = res; },
      error: () => {
        this.produtoDestaque = {
          id_produto: 0, nome: 'Produto em destaque', preco: 0, imagem: '', descricao: ''
        };
      }
    });

    // banners do carrossel (B1 -> B2 -> B3)
    this.loadBannerSlides();

    // categorias + produtos
    this.carregarCategoriasComProdutos();
  }

  ngOnDestroy(): void { this.stopCarouselTimer(); }

  // ------------ utils ------------
  private toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  // ------------ BANNERS (carrossel) ------------
  private loadBannerSlides(): void {
    this.bannerService.getAll().subscribe({
      next: (res: BannerFilesResponse) => {
        const ORDER: Array<keyof BannerFilesResponse> = ['B1', 'B2', 'B3'];
        const tmp: { imagem: string; alt: string }[] = [];

        ORDER.forEach((k, idx) => {
          const url = res[k];
          if (url) tmp.push({ imagem: url + this._cb, alt: `Banner ${idx + 1}` });
        });

        if (tmp.length === 0) {
          const base = environment.assetsUrl.replace(/\/$/, '');
          tmp.push(
            { imagem: `${base}/uploads/imagens/B1.jpg${this._cb}`, alt: 'Banner 1' },
            { imagem: `${base}/uploads/imagens/B2.jpg${this._cb}`, alt: 'Banner 2' },
            { imagem: `${base}/uploads/imagens/B3.jpg${this._cb}`, alt: 'Banner 3' },
          );
        }

        this.slides = tmp;
        this.slideIndex = 0;      // começa no B1
        this.resetCarouselTimer(); // autoplay
      },
      error: () => {
        const base = environment.assetsUrl.replace(/\/$/, '');
        this.slides = [
          { imagem: `${base}/uploads/imagens/B1.jpg${this._cb}`, alt: 'Banner 1' },
          { imagem: `${base}/uploads/imagens/B2.jpg${this._cb}`, alt: 'Banner 2' },
          { imagem: `${base}/uploads/imagens/B3.jpg${this._cb}`, alt: 'Banner 3' },
        ];
        this.slideIndex = 0;
        this.resetCarouselTimer();
      }
    });
  }

  private startCarouselTimer() {
    if (this.carouselTimerId || this.slides.length === 0) return;
    this.carouselTimerId = setInterval(() => this.avancarSlide(false), this.carouselIntervalMs);
  }
  private stopCarouselTimer() {
    if (this.carouselTimerId) { clearInterval(this.carouselTimerId); this.carouselTimerId = null; }
  }
  private resetCarouselTimer() { this.stopCarouselTimer(); this.startCarouselTimer(); }

  avancarSlide(userAction = true) {
    this.slideIndex = (this.slideIndex + 1) % this.slides.length;
    if (userAction) this.resetCarouselTimer();
  }
  voltarSlide() {
    this.slideIndex = (this.slideIndex - 1 + this.slides.length) % this.slides.length;
    this.resetCarouselTimer();
  }

  // ------------ CATEGORIAS/PRODUTOS ------------
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
    const idProduto = (produto as any).id_produto || (produto as any).id;
    if (!idProduto) return;

    this.produtoSelecionado = { ...produto, id_produto: idProduto };
    this.quantidade = 1;

    // começa sem variação selecionada
    this.variacoesProduto = [];
    this.variacaoSelecionada = null;

    // mostra o preço base imediatamente
    this.calcularPreco();

    // carrega variações reais do backend
    this.carregarVariacoesProduto(idProduto);
  }

  carregarVariacoesProduto(id_produto: number): void {
    this.produtoService.getVariacoesPorProduto(id_produto).subscribe({
      next: (res: VariacaoProduto[]) => {
        // normaliza preco_adicional para número
        this.variacoesProduto = (res || []).map(v => ({
          ...v,
          preco_adicional: this.toNum(v.preco_adicional)
        }));
        this.variacaoSelecionada = null; // nenhuma por padrão
        this.calcularPreco();            // mantém preço base
      },
      error: () => {
        this.variacoesProduto = [];
        this.variacaoSelecionada = null;
        this.calcularPreco();
      }
    });
  }

  fecharModal(): void { this.produtoSelecionado = null; }

  selecionarVariacao(variacao: VariacaoProduto): void {
    this.variacaoSelecionada = variacao;
    this.calcularPreco();
    this.cdr.detectChanges();
  }

  incrementarQuantidade() { this.quantidade++; this.calcularPreco(); }
  decrementarQuantidade() { if (this.quantidade > 1) { this.quantidade--; this.calcularPreco(); } }

  // PREÇO = preço base do produto + adicional (se houver)  × quantidade
  calcularPreco(): void {
    const base = this.toNum(this.produtoSelecionado?.preco);
    const adicional = this.toNum(this.variacaoSelecionada?.preco_adicional);
    this.precoCalculado = (base + adicional) * (this.quantidade || 1);
  }

  adicionarAoCarrinho(produto: Produto): void {
    const base = this.toNum(produto.preco);
    const adicional = this.toNum(this.variacaoSelecionada?.preco_adicional);
    const precoUnitario = base + adicional;
    const descricao = this.variacaoSelecionada?.descricao_opcao || 'Sem variação';

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
    if (carrinho.length === 0) { this.toastr.warning('Carrinho vazio!'); return; }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    this.router.navigate(['/checkout']);
  }

  getImagemUrl(imagem: string): string {
    if (!imagem) return 'assets/images/placeholder.jpg';
    return `${environment.assetsUrl.replace(/\/$/, '')}/uploads/produtos/${imagem}`;
  }
}
