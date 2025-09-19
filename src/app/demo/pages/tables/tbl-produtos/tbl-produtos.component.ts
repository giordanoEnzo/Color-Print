import { Component, OnInit } from '@angular/core';
import { ProdutoService } from 'src/app/services/produto.service';
import { Produto } from 'src/app/interfaces/produto.interface';
import { ToastrService } from 'ngx-toastr';

type ProdutoDim = Produto & {
  width?: number | null;
  height?: number | null;
  length?: number | null;
  weight?: number | null;
  variacoes?: any[];
};

type PrecoUnidade = 'CM2' | 'M2';

type QuoteConfig = {
  aceita_orcamento: boolean;
  modo_precificacao: 'AREA';
  preco_unidade: PrecoUnidade;
  upload_obrigatorio: boolean;

  // preços por cm²
  preco_cm2_100?: number | null;
  preco_cm2_500?: number | null;
  preco_cm2_1000?: number | null;

  // preços por m²
  preco_m2_100?: number | null;
  preco_m2_500?: number | null;
  preco_m2_1000?: number | null;
};

@Component({
  selector: 'app-tbl-produtos',
  templateUrl: './tbl-produtos.component.html',
  styleUrls: ['./tbl-produtos.component.scss'],
})
export class TblProdutosComponent implements OnInit {
  produtos: ProdutoDim[] = [];
  categorias: any[] = [];
  erro: string | null = null;

  novoProduto: ProdutoDim = {
    id_produto: 0,
    nome: '',
    descricao: '',
    preco: 0,
    imagem: null,
    imagemUrl: '',
    estoque: 0,
    id_categoria: undefined,
    destaque: false,
    width: null,
    height: null,
    length: null,
    weight: null,
  };

  produtoEmEdicao: ProdutoDim | null = null;
  imagemEditada: File | null = null;

  mostrarFormulario = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  produtosPaginados: ProdutoDim[] = [];
  pages: number[] = [];

  // Config de orçamento (somente por área)
  quoteConfig: QuoteConfig = {
    aceita_orcamento: false,
    modo_precificacao: 'AREA',
    preco_unidade: 'CM2',
    upload_obrigatorio: true,
    preco_cm2_100: null,
    preco_cm2_500: null,
    preco_cm2_1000: null,
    preco_m2_100: null,
    preco_m2_500: null,
    preco_m2_1000: null,
  };

  simulacao: {
    preco_unit?: number;        // preço por unidade de área (cm² ou m²)
    preco_unit_item?: number;   // preço por peça (preço_unit * área)
    total?: number;
    tier?: string;
    preco_mode?: 'AREA_CM2' | 'AREA_M2';
    area_cm2?: number;
    area_m2?: number;
  } | null = null;

  constructor(
    private produtoService: ProdutoService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.produtoService.getCategorias().subscribe(
      (categorias) => { this.categorias = categorias; },
      () => {}
    );
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.resetarNovoProduto();
  }

  resetarNovoProduto(): void {
    this.novoProduto = {
      id_produto: 0,
      nome: '',
      descricao: '',
      preco: 0,
      imagem: null,
      imagemUrl: '',
      estoque: 0,
      id_categoria: undefined,
      destaque: false,
      width: null,
      height: null,
      length: null,
      weight: null,
    };
  }

  private toNum(v: any): number | null {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe(
      (response: any[]) => {
        this.produtos = response.map((produto) => ({
          ...produto,
          id_produto: produto.id,
          width: this.toNum(produto.width),
          height: this.toNum(produto.height),
          length: this.toNum(produto.length),
          weight: this.toNum(produto.weight),
        }));
        this.atualizarPaginacao();
        this.toastr.success('Produtos carregados com sucesso!', 'Sucesso');
      },
      () => {
        this.erro = 'Erro ao carregar produtos';
        this.toastr.error('Erro ao carregar produtos', 'Erro');
      }
    );
  }

  atualizarPaginacao(): void {
    this.totalPages = Math.ceil(this.produtos.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.produtosPaginados = this.produtos.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.atualizarPaginacao();
  }

  adicionarProduto(): void {
    if (!this.validarProduto(this.novoProduto, true)) return;
    if (this.novoProduto.destaque) this.desmarcarTodosDestaquesMenosAtual();

    const fd = this.produtoService.buildFormData(this.novoProduto, this.novoProduto.imagem as File | null);
    this.produtoService.addProduto(fd).subscribe({
      next: () => {
        this.toastr.success('Produto cadastrado com sucesso!', 'Sucesso');
        this.carregarProdutos();
        this.toggleFormulario();
      },
      error: (err) => {
        this.toastr.error(err.error?.erro || 'Erro ao cadastrar produto', 'Erro');
        console.error('Erro:', err);
      }
    });
  }

  validarProduto(p: ProdutoDim, exigirImagem = false): boolean {
    if (!p.nome) { this.toastr.warning('O nome do produto é obrigatório', 'Atenção'); return false; }
    if (p.preco == null || Number(String(p.preco).toString().replace(',', '.')) <= 0) {
      this.toastr.warning('O preço deve ser maior que zero', 'Atenção'); return false;
    }
    if (exigirImagem && !p.imagem) { this.toastr.warning('Selecione uma imagem', 'Atenção'); return false; }
    for (const v of [p.width, p.height, p.length, p.weight]) {
      if (v != null && Number(v) < 0) {
        this.toastr.warning('Dimensões e peso não podem ser negativos', 'Atenção'); return false;
      }
    }
    return true;
  }

  deletarProduto(id: number): void {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      this.produtoService.deleteProduto(id.toString()).subscribe(
        () => {
          this.produtos = this.produtos.filter(p => p.id_produto !== id);
          this.atualizarPaginacao();
          this.toastr.success('Produto deletado com sucesso!', 'Sucesso');
        },
        () => this.toastr.error('Erro ao deletar produto', 'Erro')
      );
    }
  }

  editarProduto(produto: ProdutoDim): void {
    this.produtoEmEdicao = {
      ...produto,
      id_produto: produto.id_produto ?? (produto as any).id,
      variacoes: [],
      width: this.toNum((produto as any).width),
      height: this.toNum((produto as any).height),
      length: this.toNum((produto as any).length),
      weight: this.toNum((produto as any).weight),
    } as ProdutoDim;

    this.produtoService.getVariacoesPorProduto(this.produtoEmEdicao.id_produto).subscribe({
      next: (res) => { (this.produtoEmEdicao as any).variacoes = res; },
      error: () => { (this.produtoEmEdicao as any).variacoes = []; }
    });

    this.imagemEditada = null;

    this.produtoService.getQuoteConfig(this.produtoEmEdicao.id_produto).subscribe({
      next: (res) => {
        const c = res?.config || {};
        this.quoteConfig = {
          aceita_orcamento: !!c.aceita_orcamento,
          modo_precificacao: 'AREA',
          preco_unidade: (c.preco_unidade === 'M2' ? 'M2' : 'CM2'),
          upload_obrigatorio: !!c.upload_obrigatorio,
          preco_cm2_100: this.toNum(c.preco_cm2_100),
          preco_cm2_500: this.toNum(c.preco_cm2_500),
          preco_cm2_1000: this.toNum(c.preco_cm2_1000),
          preco_m2_100: this.toNum(c.preco_m2_100),
          preco_m2_500: this.toNum(c.preco_m2_500),
          preco_m2_1000: this.toNum(c.preco_m2_1000),
        };
      },
      error: () => {
        this.quoteConfig = {
          aceita_orcamento: false,
          modo_precificacao: 'AREA',
          preco_unidade: 'CM2',
          upload_obrigatorio: true,
          preco_cm2_100: null,
          preco_cm2_500: null,
          preco_cm2_1000: null,
          preco_m2_100: null,
          preco_m2_500: null,
          preco_m2_1000: null,
        };
      }
    });
  }

  adicionarVariacao(): void {
    if (this.produtoEmEdicao) {
      (this.produtoEmEdicao as any).variacoes.push({ descricao_opcao: '', preco_adicional: 0 });
    }
  }

  removerVariacao(index: number): void {
    if (!this.produtoEmEdicao) return;
    const variacoes = (this.produtoEmEdicao as any).variacoes || [];
    const variacao = variacoes[index];
    if (variacao?.id_variacao) {
      this.produtoService.deleteVariacao(variacao.id_variacao).subscribe({
        next: () => {
          variacoes.splice(index, 1);
          this.toastr.success('Variação excluída com sucesso!', 'Sucesso');
        },
        error: () => this.toastr.error('Erro ao excluir variação', 'Erro')
      });
    } else {
      variacoes.splice(index, 1);
    }
  }

  salvarEdicao(): void {
    if (!this.produtoEmEdicao) return;
    if (!this.validarProduto(this.produtoEmEdicao)) return;
    if (this.produtoEmEdicao.destaque) {
      this.desmarcarTodosDestaquesMenosAtual(this.produtoEmEdicao.id_produto);
    }

    const fd = this.produtoService.buildFormData(this.produtoEmEdicao, this.imagemEditada);
    const idAtual = this.produtoEmEdicao.id_produto;

    this.produtoService.updateProduto(String(idAtual), fd).subscribe({
      next: () => {
        const variacoes = (this.produtoEmEdicao as any).variacoes || [];
        variacoes.forEach((v: any) => {
          if (v.id_variacao) this.produtoService.updateVariacao(v.id_variacao, v).subscribe();
          else this.produtoService.addVariacao({ ...v, id_produto: idAtual }).subscribe();
        });

        this.produtoService.saveQuoteConfig(idAtual, this.quoteConfig).subscribe({
          error: () => this.toastr.error('Erro ao salvar configuração de orçamento', 'Erro')
        });

        this.toastr.success('Produto atualizado com sucesso!', 'Sucesso');
        this.carregarProdutos();
        this.produtoEmEdicao = null;
        this.imagemEditada = null;
        this.simulacao = null;
      },
      error: (error) => {
        this.toastr.error('Erro ao atualizar produto', 'Erro');
        console.error('Erro ao atualizar produto:', error);
      }
    });
  }

  /** Simulador: calcula também o preço por peça (área × preço_unit) */
  simular(largura: number, altura: number, quantidade: number) {
    if (!this.produtoEmEdicao) return;
    const L = Number(largura);
    const A = Number(altura);
    const Q = Number(quantidade);
    if (!L || !A || !Q) {
      this.toastr.warning('Informe largura, altura e quantidade válidas', 'Atenção');
      return;
    }

    this.produtoService.simularOrcamento({
      id_produto: this.produtoEmEdicao.id_produto,
      largura_cm: L,
      altura_cm: A,
      quantidade: Q
    }).subscribe({
      next: (r: any) => {
        const area = r.preco_mode === 'AREA_CM2' ? Number(r.area_cm2) : Number(r.area_m2);
        this.simulacao = {
          preco_unit: Number(r.preco_unit),
          preco_unit_item: Number(r.preco_unit) * area,
          total: Number(r.total),
          tier: r.tier_aplicado,
          preco_mode: r.preco_mode,
          area_cm2: Number(r.area_cm2),
          area_m2: Number(r.area_m2)
        };
        this.toastr.success('Simulação calculada', 'Ok');
      },
      error: (e) => {
        this.simulacao = null;
        this.toastr.error(e?.error?.erro || 'Erro na simulação', 'Erro');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.novoProduto.imagem = file;
      this.gerarPreview(file, 'novoProduto');
    }
  }

  onFileSelectedEdicao(event: any): void {
    const file = event.target.files[0];
    if (file && this.produtoEmEdicao) {
      this.imagemEditada = file;
      this.gerarPreview(file, 'produtoEmEdicao');
    }
  }

  gerarPreview(file: File, target: 'novoProduto' | 'produtoEmEdicao'): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (target === 'novoProduto') this.novoProduto.imagemUrl = e.target.result;
      else if (this.produtoEmEdicao) this.produtoEmEdicao.imagemUrl = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  cancelarEdicao(): void {
    this.produtoEmEdicao = null;
    this.imagemEditada = null;
    this.simulacao = null;
  }

  limparSimulacao(): void {
    this.simulacao = null;
  }

  aoMarcarDestaqueNovoProduto() {
    if (this.novoProduto.destaque) this.desmarcarTodosDestaquesMenosAtual();
  }
  aoMarcarDestaqueEdicao() {
    if (this.produtoEmEdicao?.destaque) this.desmarcarTodosDestaquesMenosAtual(this.produtoEmEdicao.id_produto);
  }
  desmarcarTodosDestaquesMenosAtual(idAtual: number = 0) {
    this.produtos.forEach(p => { if (p.id_produto !== idAtual) p.destaque = false; });
  }
}
