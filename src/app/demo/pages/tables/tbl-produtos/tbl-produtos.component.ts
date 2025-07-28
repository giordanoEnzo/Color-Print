import { Component, OnInit } from '@angular/core';
import { ProdutoService } from 'src/app/services/produto.service';
import { Produto } from 'src/app/interfaces/produto.interface';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tbl-produtos',
  templateUrl: './tbl-produtos.component.html',
  styleUrls: ['./tbl-produtos.component.scss'],
})
export class TblProdutosComponent implements OnInit {
  produtos: Produto[] = [];
  categorias: any[] = [];
  erro: string | null = null;

  novoProduto: Produto = {
    id_produto: 0,
    nome: '',
    descricao: '',
    preco: 0,
    imagem: null,
    imagemUrl: '',
    estoque: 0,
    id_categoria: undefined,
    destaque: false,
  };

  produtoEmEdicao: Produto | null = null;
  imagemEditada: File | null = null;

  mostrarFormulario = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  produtosPaginados: Produto[] = [];
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
      (categorias) => {
        this.categorias = categorias;
      },
      (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    );
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.resetarNovoProduto();
    }
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
    };
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe(
      (response: any[]) => {
        this.produtos = response.map(produto => ({
          ...produto,
          id_produto: produto.id // mapeamento automático, opcional
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
    if (!this.validarProduto()) return;

    const formData = new FormData();
    formData.append('nome', this.novoProduto.nome);
    formData.append('descricao', this.novoProduto.descricao || '');
    formData.append('preco', this.novoProduto.preco.toString());
    formData.append('estoque', this.novoProduto.estoque?.toString() || '0');
    formData.append('destaque', this.novoProduto.destaque ? '1' : '0');
    formData.append('id_categoria', this.novoProduto.id_categoria?.toString() || '');

    if (this.novoProduto.imagem) {
      formData.append('imagem', this.novoProduto.imagem);
    }

    this.produtoService.addProduto(formData).subscribe({
      next: (res) => {
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

  validarProduto(): boolean {
    if (!this.novoProduto.nome) {
      this.toastr.warning('O nome do produto é obrigatório', 'Atenção');
      return false;
    }
    if (!this.novoProduto.preco || this.novoProduto.preco <= 0) {
      this.toastr.warning('O preço deve ser maior que zero', 'Atenção');
      return false;
    }
    if (!this.novoProduto.imagem) {
      this.toastr.warning('Selecione uma imagem para o produto', 'Atenção');
      return false;
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
      id_produto: produto.id // 👈 mapeia o campo certo
    };
    this.imagemEditada = null;
  }

  salvarEdicao(): void {
    if (!this.produtoEmEdicao) return;

    const {
      id_produto,
      nome,
      descricao,
      preco,
      estoque,
      destaque,
      id_categoria
    } = this.produtoEmEdicao;

    if (!nome || preco == null || estoque == null || id_categoria == null) {
      this.toastr.warning('Preencha todos os campos obrigatórios antes de salvar.', 'Atenção');
      return;
    }

    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('descricao', descricao || '');
    formData.append('preco', preco.toString());
    formData.append('estoque', estoque.toString());
    formData.append('destaque', destaque ? '1' : '0');
    formData.append('id_categoria', id_categoria.toString());

    if (this.imagemEditada) {
      formData.append('imagem', this.imagemEditada);
    }

    this.produtoService.updateProduto(id_produto.toString(), formData).subscribe({
      next: () => {
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
        this.produtoEmEdicao.imagemUrl = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  cancelarEdicao(): void {
    this.produtoEmEdicao = null;
    this.imagemEditada = null;
  }
}
