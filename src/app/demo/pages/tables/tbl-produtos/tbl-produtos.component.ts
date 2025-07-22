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
  erro: string | null = null;

  novoProduto: Produto = {
    id_produto: 0,
    nome: '',
    descricao: '',
    preco: 0,
    quantidade_estoque: 0,
    imagem: null,
    imagemUrl: '',
    categoria: '',
  };

  produtoEmEdicao: Produto | null = null;
  imagemEditada: File | null = null;

  mostrarFormulario = false;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  produtosPaginados: Produto[] = [];
  pages: number[] = [];

  constructor(
    private ProdutoService: ProdutoService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarProdutos();
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
      quantidade_estoque: 0,
      imagem: null,
      imagemUrl: '',
      categoria: '',
    };
  }

  carregarProdutos(): void {
    this.ProdutoService.getProdutos().subscribe(
      (response: Produto[]) => {
        this.produtos = response;
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
    const formData: FormData = new FormData();
    formData.append('nome', this.novoProduto.nome);
    formData.append('descricao', this.novoProduto.descricao);
    formData.append('preco', this.novoProduto.preco.toString());
    formData.append('quantidade_estoque', this.novoProduto.quantidade_estoque.toString());
    formData.append('categoria', this.novoProduto.categoria || '');

    if (this.novoProduto.imagem) {
      formData.append('imagem', this.novoProduto.imagem, this.novoProduto.imagem.name);
    }

    this.ProdutoService.addProduto(formData).subscribe(
      (response) => {
        response.imagemUrl = `http://localhost:5000/uploads/${response.imagem}`;
        this.produtos.push(response);
        this.toastr.success('Produto adicionado com sucesso!', 'Sucesso');
        this.toggleFormulario();
      },
      (error) => {
        this.erro = 'Erro ao adicionar produto';
        console.error('Erro ao adicionar produto:', error);
        this.toastr.error('Erro ao adicionar produto', 'Erro');
      }
    );
  }

  deletarProduto(id: number): void {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      this.ProdutoService.deleteProduto(id.toString()).subscribe(
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

  editarProduto(produto: Produto): void {
    this.produtoEmEdicao = { ...produto };
    this.imagemEditada = null;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.novoProduto.imagem = file;
    }
  }

  onFileChangeEdicao(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.imagemEditada = file;

      const reader = new FileReader();
      reader.onload = () => {
        if (this.produtoEmEdicao) {
          this.produtoEmEdicao.imagemUrl = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  salvarEdicao(): void {
    if (this.produtoEmEdicao) {
      const formData: FormData = new FormData();
      formData.append('nome', this.produtoEmEdicao.nome);
      formData.append('descricao', this.produtoEmEdicao.descricao);
      formData.append('preco', this.produtoEmEdicao.preco.toString());
      formData.append('quantidade_estoque', this.produtoEmEdicao.quantidade_estoque.toString());
      formData.append('categoria', this.produtoEmEdicao.categoria);

      if (this.produtoEmEdicao.imagem) {
        formData.append('imagem', this.produtoEmEdicao.imagem);
      }

      this.ProdutoService.updateProduto(this.produtoEmEdicao.id_produto.toString(), formData).subscribe(
        () => {
          this.carregarProdutos();
          this.produtoEmEdicao = null;
          this.toastr.success('Produto atualizado com sucesso!', 'Sucesso');
        },
        (error) => {
          this.toastr.error('Erro ao atualizar produto', 'Erro');
          console.error('Erro ao atualizar produto:', error);
        }
      );
    }
  }

  onFileSelectedEdicao(event: any): void {
    const file: File = event.target.files[0];
    if (file && this.produtoEmEdicao) {
      this.produtoEmEdicao.imagem = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.produtoEmEdicao!.imagemUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


  cancelarEdicao(): void {
    this.produtoEmEdicao = null;
    this.imagemEditada = null;
  }
}
