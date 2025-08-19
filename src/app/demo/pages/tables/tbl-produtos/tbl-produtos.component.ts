import { Component, OnInit } from '@angular/core';
import { ProdutoService } from 'src/app/services/produto.service';
import { Produto } from 'src/app/interfaces/produto.interface';
import { ToastrService } from 'ngx-toastr';

// Produto + dimensões/peso usados no frete
type ProdutoDim = Produto & {
  width?: number | null;
  height?: number | null;
  length?: number | null;
  weight?: number | null;
  variacoes?: any[];
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
    // novos
    width: null,
    height: null,
    length: null,
    weight: null,
  };

  produtoEmEdicao: ProdutoDim | null = null;
  imagemEditada: File | null = null;

  mostrarFormulario = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  produtosPaginados: ProdutoDim[] = [];
  pages: number[] = [];

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
      (error) => { console.error('Erro ao carregar categorias:', error); }
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

  // helper numérico (converte "10,5" -> 10.5; vazio -> null)
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
          id_produto: produto.id, // compatibilidade
          width:  this.toNum(produto.width),
          height: this.toNum(produto.height),
          length: this.toNum(produto.length),
          weight: this.toNum(produto.weight),
        }));
        this.atualizarPaginacao();
        this.toastr.success('Produtos carregados com sucesso!', 'Sucesso');
      },
      (error) => {
        this.erro = 'Erro ao carregar produtos';
        console.error('Erro ao carregar produtos:', error);
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

    // usa o helper do service para normalizar vírgula → ponto e chaves corretas
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
    if (!p.nome) {
      this.toastr.warning('O nome do produto é obrigatório', 'Atenção');
      return false;
    }
    if (p.preco == null || Number(String(p.preco).toString().replace(',', '.')) <= 0) {
      this.toastr.warning('O preço deve ser maior que zero', 'Atenção');
      return false;
    }
    if (exigirImagem && !p.imagem) {
      this.toastr.warning('Selecione uma imagem para o produto', 'Atenção');
      return false;
    }
    for (const v of [p.width, p.height, p.length, p.weight]) {
      if (v != null && Number(v) < 0) {
        const msg = 'Dimensões e peso não podem ser negativos';
        this.toastr.warning(msg, 'Atenção');
        return false;
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
        (error) => {
          console.error('Erro ao deletar produto:', error);
          this.toastr.error('Erro ao deletar produto', 'Erro');
        }
      );
    }
  }

  editarProduto(produto: any): void {
    this.produtoEmEdicao = {
      ...produto,
      id_produto: produto.id,
      variacoes: [],
      width:  this.toNum(produto.width),
      height: this.toNum(produto.height),
      length: this.toNum(produto.length),
      weight: this.toNum(produto.weight),
    } as ProdutoDim;

    this.produtoService.getVariacoesPorProduto(produto.id).subscribe({
      next: (res) => { (this.produtoEmEdicao as any).variacoes = res; },
      error: () => { (this.produtoEmEdicao as any).variacoes = []; }
    });

    this.imagemEditada = null;
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
        error: () => {
          this.toastr.error('Erro ao excluir variação', 'Erro');
        }
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

    // monta o FormData pelo helper (faz vírgula→ponto e chaves corretas)
    const fd = this.produtoService.buildFormData(this.produtoEmEdicao, this.imagemEditada);

    this.produtoService.updateProduto(String(this.produtoEmEdicao.id_produto), fd).subscribe({
      next: () => {
        const variacoes = (this.produtoEmEdicao as any).variacoes || [];
        variacoes.forEach((v: any) => {
          if (v.id_variacao) {
            this.produtoService.updateVariacao(v.id_variacao, v).subscribe();
          } else {
            this.produtoService.addVariacao({ ...v, id_produto: this.produtoEmEdicao!.id_produto }).subscribe();
          }
        });

        this.toastr.success('Produto atualizado com sucesso!', 'Sucesso');
        this.carregarProdutos();
        this.produtoEmEdicao = null;
        this.imagemEditada = null;
      },
      error: (error) => {
        this.toastr.error('Erro ao atualizar produto', 'Erro');
        console.error('Erro ao atualizar produto:', error);
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
      if (target === 'novoProduto') {
        this.novoProduto.imagemUrl = e.target.result;
      } else if (this.produtoEmEdicao) {
        this.produtoEmEdicao.imagemUrl = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  cancelarEdicao(): void {
    this.produtoEmEdicao = null;
    this.imagemEditada = null;
  }

  // destaque único
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
