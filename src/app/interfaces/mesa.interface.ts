export interface Mesa {
  id_mesa: number;       // ID da mesa
  numero: number;        // Número da mesa
  capacidade: number;    // Capacidade de pessoas
  status: 'Aberta' | 'Finalizada'; // status da Mesa
  pedidos?: any[];       // Lista de pedidos da mesa
  garcom?: string;       // Nome do garçom responsável
  horaAbertura?: string; // Horário de abertura da mesa
  totalConsumo: number;  // Total consumido na mesa
  troco: number;         // Troco
  totalMesa?: number;    // Adicionando a propriedade totalMesa
  nome: string;          // Nome da mesa
  endereco: string;      // Endedreço de entrega
  id_empresa: number;    // ID EMRPESA 
  ordem_type: 'Pedido' | 'Retirada' | 'Entrega'; // Tipo de ordem
  telefone:'';           //TELEFONE DO CALANGO
}
