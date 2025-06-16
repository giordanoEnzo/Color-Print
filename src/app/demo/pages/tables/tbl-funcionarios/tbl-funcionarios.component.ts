import { Component, OnInit } from '@angular/core';
import { FuncionarioService } from 'src/app/services/funcionario.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tbl-funcionarios',
  templateUrl: './tbl-funcionarios.component.html',
  styleUrls: ['./tbl-funcionarios.component.scss'],
})

export class TblFuncionariosComponent implements OnInit {
  funcionarios: any[] = []; // Lista completa de funcionários
  erro: string | null = null;

  // Propriedades para controle do formulário de adicionar funcionário
  novoFuncionario: any = {
    id: 0,
    nome: '',
    cargo: '',
    email: '',
    telefone: ''
  };

  mostrarFormulario = false;

  currentPage: number = 1; // Página atual
  itemsPerPage: number = 5; // Itens por página
  totalPages: number = 0; // Total de páginas
  funcionariosPaginados: any[] = []; // Lista de itens da página atual
  pages: number[] = []; // Array com os números de páginas

  // Funcionário em edição
  funcionarioEmEdicao: any = null;

  constructor(private funcionarioService: FuncionarioService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.carregarFuncionarios(); // Carregar funcionários ao iniciar o componente
  }

  // Alternar exibição do formulário de adicionar
  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.resetarNovoFuncionario();
    }
  }

  // Resetar valores do novo funcionário
  resetarNovoFuncionario(): void {
    this.novoFuncionario = {
      id: 0,
      nome: '',
      cargo: '',
      email: '',
      telefone: ''
    };
  }

  // Carregar lista de funcionários
  carregarFuncionarios(): void {
    this.funcionarioService.getFuncionarios().subscribe(
      (response: any[]) => {
        this.funcionarios = response; // Atribui todos os funcionários
        this.atualizarPaginacao(); // Atualiza a paginação
        this.toastr.success('Funcionários carregados com sucesso!', 'Sucesso');
      },
      (error) => {
        this.erro = 'Erro ao carregar funcionários';
        console.error('Erro ao carregar funcionários:', error);
        this.toastr.error('Erro ao carregar funcionários', 'Erro');
      }
    );
  }

  // Atualizar os dados de paginação
  atualizarPaginacao(): void {
    // Calcular o número total de páginas
    this.totalPages = Math.ceil(this.funcionarios.length / this.itemsPerPage);
    // Criar um array com os números das páginas
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    // Pegar os funcionários da página atual
    this.funcionariosPaginados = this.funcionarios.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  // Alterar a página
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return; // Garantir que a página esteja no intervalo válido
    this.currentPage = page;
    this.atualizarPaginacao(); // Atualizar os funcionários para a página escolhida
  }

  // Adicionar novo funcionário
  adicionarFuncionario(): void {
    this.funcionarioService.addFuncionario(this.novoFuncionario).subscribe(
      () => {
        this.carregarFuncionarios(); // Recarregar funcionários após adição
        this.toastr.success('Funcionário adicionado com sucesso!', 'Sucesso');
        this.toggleFormulario(); // Fechar o formulário
      },
      (error) => {
        this.erro = 'Erro ao adicionar funcionário';
        console.error('Erro ao adicionar funcionário:', error);
        this.toastr.error('Erro ao adicionar funcionário', 'Erro');
      }
    );
  }

  // Deletar funcionário
  deletarFuncionario(id: number): void {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
      this.funcionarioService.deleteFuncionario(id.toString()).subscribe(
        () => {
          this.funcionarios = this.funcionarios.filter((funcionario) => funcionario.id !== id);
          this.atualizarPaginacao(); // Recalcular a paginação após exclusão
          this.toastr.success('Funcionário deletado com sucesso!', 'Sucesso');
        },
        (error) => {
          console.error('Erro ao deletar funcionário:', error);
          this.toastr.error('Erro ao deletar funcionário', 'Erro');
        }
      );
    }
  }

  // Iniciar edição do funcionário
  editarFuncionario(funcionario: any): void {
    this.funcionarioEmEdicao = { ...funcionario }; // Cria uma cópia do funcionário a ser editado
  }

  // Salvar alterações no funcionário
  salvarEdicao(): void {
    if (this.funcionarioEmEdicao) {
      this.funcionarioService.updateFuncionario(this.funcionarioEmEdicao.id, this.funcionarioEmEdicao).subscribe(
        () => {
          this.carregarFuncionarios(); // Recarregar funcionários após edição
          this.funcionarioEmEdicao = null; // Finaliza o modo de edição
          this.toastr.success('Alteração realizada com sucesso!', 'Sucesso');
        },
        (error) => {
          this.toastr.error('Erro na atualização do funcionário', 'Erro');
          console.error('Erro ao atualizar funcionário:', error);
        }
      );
    }
  }

  // Cancelar edição
  cancelarEdicao(): void {
    this.funcionarioEmEdicao = null; // Reseta o modo de edição
  }
}
