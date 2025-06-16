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
    imagemUrl: '',  // Propriedade para URL da imagem
    categoria:'',
  };

  mostrarFormulario = false;

  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  produtosPaginados: Produto[] = [];
  pages: number[] = [];

  produtoEmEdicao: Produto | null = null;

  constructor(private ProdutoService: ProdutoService, private toastr: ToastrService) {}

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
      imagemUrl: '',  // Resetando a URL da imagem
    };
  }

  carregarProdutos(): void {
    this.ProdutoService.getProdutos().subscribe(
      (response: Produto[]) => {
        this.produtos = response;
        this.produtos.forEach(produto => {
          if (produto.imagem) {
            // Supondo que a imagem seja retornada pela API
            produto.imagemUrl = `http://localhost:5000${produto.imagem}`;  // Ajuste conforme a URL de imagem
          }
        });
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

    if (this.novoProduto.imagem) {
      formData.append('imagem', this.novoProduto.imagem, this.novoProduto.imagem.name);
    }

    this.ProdutoService.addProduto(formData).subscribe(
      (response) => {
        // Supondo que a resposta do backend tenha a URL da imagem
        response.imagemUrl = `http://localhost:5000/uploads/${response.imagem}`;  // Ajuste conforme a URL de imagem
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
          this.produtos = this.produtos.filter((produto) => produto.id_produto !== id);
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
  }

  salvarEdicao(): void {
    if (this.produtoEmEdicao) {
      this.ProdutoService.updateProduto(this.produtoEmEdicao.id_produto.toString(), this.produtoEmEdicao).subscribe(
        () => {
          this.carregarProdutos();
          this.produtoEmEdicao = null;
          this.toastr.success('Alteração realizada com sucesso!', 'Sucesso');
        },
        (error) => {
          this.toastr.error('Erro na atualização do produto', 'Erro');
          console.error('Erro ao atualizar produto:', error);
        }
      );
    }
  }

  cancelarEdicao(): void {
    this.produtoEmEdicao = null;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.novoProduto.imagem = file;
    }
  }
}
