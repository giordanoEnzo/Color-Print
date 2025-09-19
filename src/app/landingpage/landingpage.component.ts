import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';
import { PixService } from 'src/app/services/pix.service';
import { CartService, Produto } from 'src/app/services/cart.service';
import { Router } from '@angular/router';
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
  preco_adicional: number;
}

interface OrcForm {
  largura_cm: number | null;
  altura_cm: number | null;
  quantidade: number;
  arquivo?: File | null;
}

type PrecoMode = 'BUCKET' | 'AREA_CM2' | 'AREA_M2' | string;

interface SimulacaoUI {
  bucket_label?: string;
  tier?: string;
  preco_mode?: PrecoMode;
  // preço por peça que será usado para carrinho
  preco_unit_peca: number;
  // preço por área (se o backend enviar; R$/cm² ou R$/m²)
  preco_unidade_area?: number | null;
  // área calculada (se enviada pelo backend)
  area_cm2?: number | null;
  area_m2?: number | null;
  total: number;
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
  variacoesProduto: VariacaoProduto[] = [];
  variacaoSelecionada: VariacaoProduto | null = null;

  quantidade: number = 1;
  precoCalculado: number = 0;

  slides: { imagem: string; alt: string }[] = [];
  slideIndex = 0;
  private carouselTimerId: ReturnType<typeof setInterval> | null = null;
  private readonly carouselIntervalMs = 5000;

  produtoDestaque: Produto = {
    id_produto: 0,
    nome: 'Produto em destaque',
    preco: 0,
    imagem: '',
    descricao: ''
  };

  // Orçamento Online
  orcForm: OrcForm = {
    largura_cm: null,
    altura_cm: null,
    quantidade: 100,
    arquivo: null
  };
  orcConfig: any = null;

  simulacao: SimulacaoUI | null = null;
  loadingOrc: boolean = false;

  private _cb = `?v=${Date.now()}`;

  constructor(
    private toastr: ToastrService,
    private produtoService: ProdutoService,
    private pixService: PixService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private bannerService: BannerService
  ) {}

  ngOnInit(): void {
    this.produtoService.getProdutoDestaque().subscribe({
      next: (res: Produto) => { if (res) this.produtoDestaque = res; }
    });
    this.loadBannerSlides();
    this.carregarCategoriasComProdutos();
  }

  ngOnDestroy(): void { this.stopCarouselTimer(); }

  // ========== HELPERS ==========
  parseDecimal(v: any): number {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  private round2(x: number): number { return Math.round((x + Number.EPSILON) * 100) / 100; }

  onDimChange(field: 'altura_cm' | 'largura_cm', value: string) {
    this.orcForm[field] = this.parseDecimal(value);
  }

  normalizarIncrements() {
    if (this.orcForm.altura_cm != null) {
      this.orcForm.altura_cm = parseFloat(this.orcForm.altura_cm.toFixed(2));
    }
    if (this.orcForm.largura_cm != null) {
      this.orcForm.largura_cm = parseFloat(this.orcForm.largura_cm.toFixed(2));
    }
  }

  onOrcFile(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.orcForm.arquivo = file;
      this.toastr.info(`Arquivo "${file.name}" selecionado.`);
    }
  }

  enforceMinQty() {
    const q = Math.floor(this.orcForm.quantidade || 0);
    this.orcForm.quantidade = q < 100 ? 100 : q;
  }

  private toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  // ========== BANNERS ==========
  private loadBannerSlides(): void {
    this.bannerService.getAll().subscribe({
      next: (res: BannerFilesResponse) => {
        const ORDER: Array<keyof BannerFilesResponse> = ['B1', 'B2', 'B3'];
        const tmp: { imagem: string; alt: string }[] = [];
        ORDER.forEach((k, idx) => {
          const url = res[k];
          if (url) tmp.push({ imagem: url + this._cb, alt: `Banner ${idx + 1}` });
        });
        this.slides = tmp;
        this.slideIndex = 0;
        this.resetCarouselTimer();
      },
      error: () => {}
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

  // ========== PRODUTOS ==========
  carregarCategoriasComProdutos(): void {
    this.produtoService.getCategoriasComProdutos().subscribe({
      next: (res: Categoria[]) => this.categoriasComProdutos = res
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
    this.variacoesProduto = [];
    this.variacaoSelecionada = null;

    this.simulacao = null;
    this.orcForm = { largura_cm: null, altura_cm: null, quantidade: 100, arquivo: null };

    this.calcularPreco();
    this.carregarVariacoesProduto(idProduto);

    this.produtoService.getQuoteConfig(idProduto).subscribe({
      next: (res) => { this.orcConfig = res?.config; },
      error: () => { this.orcConfig = null; }
    });
  }

  carregarVariacoesProduto(id_produto: number): void {
    this.produtoService.getVariacoesPorProduto(id_produto).subscribe({
      next: (res: VariacaoProduto[]) => {
        this.variacoesProduto = (res || []).map(v => ({
          ...v,
          preco_adicional: this.toNum(v.preco_adicional)
        }));
      },
      error: () => { this.variacoesProduto = []; }
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

  calcularPreco(): void {
    const base = this.toNum(this.produtoSelecionado?.preco);
    const variacaoPreco = this.toNum(this.variacaoSelecionada?.preco_adicional);
    this.precoCalculado = (this.variacaoSelecionada ? variacaoPreco : base) * (this.quantidade || 1);
  }

  adicionarAoCarrinho(produto: Produto): void {
    const base = this.toNum(produto.preco);
    const variacaoPreco = this.toNum(this.variacaoSelecionada?.preco_adicional);
    const precoUnitario = this.variacaoSelecionada ? variacaoPreco : base;
    const descricao = this.variacaoSelecionada?.descricao_opcao || '';
    const nomeComVariacao = descricao ? `${produto.nome} (${descricao})` : produto.nome;

    this.cartService.adicionarAoCarrinho(
      { ...produto, nome: nomeComVariacao },
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

  // ========== ORÇAMENTO ONLINE ==========
  calcularOrcamento() {
    if (!this.produtoSelecionado) return;

    const largura = this.parseDecimal(this.orcForm.largura_cm);
    const altura  = this.parseDecimal(this.orcForm.altura_cm);
    const qtd     = Math.max(100, Math.floor(this.orcForm.quantidade || 0));

    if (this.orcForm.quantidade < 100) {
      this.toastr.warning('Quantidade mínima é 100.');
      this.orcForm.quantidade = 100;
      return;
    }

    if (this.orcConfig?.largura_min_cm && largura < this.orcConfig.largura_min_cm) {
      this.toastr.warning(`Largura mínima: ${this.orcConfig.largura_min_cm} cm`);
      return;
    }
    if (this.orcConfig?.largura_max_cm && largura > this.orcConfig.largura_max_cm) {
      this.toastr.warning(`Largura máxima: ${this.orcConfig.largura_max_cm} cm`);
      return;
    }
    if (this.orcConfig?.altura_min_cm && altura < this.orcConfig.altura_min_cm) {
      this.toastr.warning(`Altura mínima: ${this.orcConfig.altura_min_cm} cm`);
      return;
    }
    if (this.orcConfig?.altura_max_cm && altura > this.orcConfig.altura_max_cm) {
      this.toastr.warning(`Altura máxima: ${this.orcConfig.altura_max_cm} cm`);
      return;
    }

    this.loadingOrc = true;
    this.simulacao = null;

    this.produtoService.simularOrcamento({
      id_produto: (this.produtoSelecionado as any).id_produto,
      largura_cm: largura,
      altura_cm: altura,
      quantidade: qtd
    }).subscribe({
      next: (res: any) => {
        // Tenta identificar o modo
        const precoMode: PrecoMode =
          res.preco_mode ||
          (res.bucket ? 'BUCKET' : (this.orcConfig?.preco_unidade === 'M2' ? 'AREA_M2' : 'AREA_CM2'));

        // Em BACKEND antigo: BUCKET -> preco_unit já é por peça.
        // Em BACKEND por ÁREA: alguns retornam preco_unit = preço por área (R$/m² ou R$/cm²).
        // Para ficar robusto: se total e qtd vierem, garantimos o preço/peça por total/qtd.
        const total = this.toNum(res.total);
        const precoAreaUnitPossivel = this.toNum(res.preco_area_unit || res.preco_unit_area || 0);
        let precoUnitPeca: number;

        if (precoMode.startsWith('AREA')) {
          // Se vier explícito preco_unit_item, usamos. Senão total/qtd.
          const fromField = this.toNum(res.preco_unit_item);
          precoUnitPeca = fromField > 0 ? fromField : (qtd > 0 ? total / qtd : 0);
        } else {
          // BUCKET
          const fromField = this.toNum(res.preco_unit);
          precoUnitPeca = fromField > 0 ? fromField : (qtd > 0 ? total / qtd : 0);
        }

        this.simulacao = {
          bucket_label: res.bucket?.label_tamanho || (res.bucket?.area_max_cm2 ? `${res.bucket.area_max_cm2} cm²` : undefined),
          tier: res.tier_aplicado,
          preco_mode: precoMode,
          preco_unit_peca: this.round2(precoUnitPeca),
          preco_unidade_area: precoAreaUnitPossivel || (precoMode.startsWith('AREA') ? this.toNum(res.preco_unit) : null),
          area_cm2: this.toNum(res.area_cm2) || null,
          area_m2: this.toNum(res.area_m2) || null,
          total: this.round2(total)
        };

        this.loadingOrc = false;
      },
      error: (e) => {
        this.loadingOrc = false;
        this.toastr.error(e?.error?.erro || 'Erro ao calcular orçamento');
      }
    });
  }

  limparOrcamento() {
    this.simulacao = null;
    // mantém dimensões preenchidas; comente as 2 linhas abaixo se quiser limpar tudo
    // this.orcForm.altura_cm = null;
    // this.orcForm.largura_cm = null;
  }

  adicionarOrcamentoAoCarrinho() {
    if (!this.produtoSelecionado || !this.simulacao) return;

    const qtd = Math.max(100, Math.floor(this.orcForm.quantidade || 100));
    const produto = {
      ...this.produtoSelecionado,
      nome: `${this.produtoSelecionado.nome} (${this.orcForm.largura_cm}x${this.orcForm.altura_cm} cm)`
    };

    this.cartService.adicionarAoCarrinho(
      produto,
      this.simulacao.preco_unit_peca,
      'Orçamento Online',
      this.orcForm.largura_cm,
      this.orcForm.altura_cm,
      qtd
    );

    this.toastr.success('Orçamento adicionado ao carrinho!');
    this.fecharModal();
  }

  getImagemUrl(imagem: string): string {
    if (!imagem) return 'assets/images/placeholder.jpg';
    return `${environment.assetsUrl.replace(/\/$/, '')}/uploads/produtos/${imagem}`;
  }
}
