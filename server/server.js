require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
// const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');


const app = express();
const port = process.env.PORT || 2000;


// const allowedOrigins = ['https://haretable.com.br', 'https://backend.haretable.com.br'];

// const corsOptions = {
//   origin: function(origin, callback) {
//     // Se não tem origem (ex: requisição de Postman), permite
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.indexOf(origin) !== -1) {
//       // Origem permitida
//       callback(null, true);
//     } else {
//       // Origem não permitida
//       callback(new Error('Não permitido por CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };

// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));

// Middleware para habilitar JSON
app.use(express.json());


// Configuração de conexão com o MySQL usando pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const accessToken = 'APP_USR-6836621365203261-060316-bee68e8296fad6316e04b9657ff4dc83-2456453806'

const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
        timeout: 5000
    }
});


app.post('/api/pix', async (req, res) => {
  const payment = new Payment(client);

  const { transaction_amount, description, payer_email } = req.body;

  const formattedAmount = parseFloat(parseFloat(transaction_amount).toFixed(2));

  const body = {
    transaction_amount: formattedAmount,
    description: description || 'Pagamento via PIX',
    payment_method_id: 'pix',
    payer: {
      email: payer_email
    },
    binary_mode: true
  };

  const result = await payment.create({ body });

  const paymentInfo = {
    id: result.id,
    status: result.status,
    status_detail: result.status_detail,
    qr_code: result.point_of_interaction.transaction_data.qr_code,
    qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
    ticket_url: result.point_of_interaction.transaction_data.ticket_url,
    transaction_amount: result.transaction_amount,
  };

  console.log('ID do pagamento criado:', result.id);
  res.json(paymentInfo);
  
});


app.get('/api/pix/status/:id', async (req, res) => {
  const paymentId = req.params.id;

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao consultar pagamento');
    }

    // Extrair apenas status
    const status = data.status;
    const statusDetail = data.status_detail;
    
    res.status(200).json({ status});
  
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error.message);
    res.status(500).json({ error: error.message });
  }

});



// Configuração do multer para o upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // Define o diretório de destino para armazenar as imagens
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Pega a extensão do arquivo
    const filename = Date.now() + ext; // Cria um nome único para a imagem
    cb(null, filename); // Define o nome final do arquivo
  }
});

const upload = multer({ storage: storage });

// Middleware para servir arquivos estáticos da pasta 'uploads'
app.use('/uploads', express.static('uploads'));


// Rota de login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ msg: 'Email e senha são obrigatórios' });
  }

  try {
    const [rows] = await db.promise().query('select * from usuarios where email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Usuário não encontrado' });
    }

    const usuario = rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.SENHA);

    if (!senhaCorreta) {
      return res.status(401).json({ msg: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { id: usuario.ID_USUARIO, role: usuario.ROLE },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.ID_USUARIO,
        nome: usuario.NOME,
        email: usuario.EMAIL,
        id_empresa:usuario.id_empresa,
        role: usuario.ROLE
      }
    });
  } catch (err) {
    console.error('Erro no login:', err); // <-- já tem isso
    res.status(500).json({ msg: 'Erro interno do servidor', erro: err.message });
  }
});


// Rota de impressão com filtro por id_empresa
app.get('/api/pedidos-para-imprimir', (req, res) => {
  const id_empresa = req.query.id_empresa;

  if (!id_empresa) {
    return res.status(400).json({ error: 'Parâmetro id_empresa é obrigatório.' });
  }

  const query = `
    SELECT * FROM pedido
    WHERE impresso = 0 
      AND id_empresa = ?
  `;

  db.query(query, [id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao buscar pedidos não impressos:', err);
      res.status(500).json({ error: 'Erro ao consultar pedidos', details: err });
    } else {
      res.json(results);
    }
  });
});


// Rota POST para imprimir o pedido sem salvar no banco
app.post('/api/imprimir-pedido', (req, res) => {

  console.log('Dados de impressao',req.body)

  const { id_mesa,numero, total, item, observacao, nome_pe, endereco_pe, ordem_type_pe } = req.body;

  // Verificar se os dados necessários foram passados
  if (!id_mesa || !total || !item) {
    return res.status(400).json({ error: 'Faltando dados obrigatórios para imprimir o pedido' });
  }

  // Dividir a string 'item' em um array de itens
  const itensArray = item.split(';').map(pedido => {
    const [id_produto, nome, quantidade, preco] = pedido.split('|');
    return { id_produto, nome, quantidade, preco };
  });

  // Formatar o conteúdo do ticket (não vai para o banco)
  const content = `
* MESA: ${numero} \n
* NOME: ${nome_pe} \n
* ORDEM: ${ordem_type_pe} \n
* ENDEREÇO: ${endereco_pe} \n
***************************************         
${itensArray.map(i => `* ${i.quantidade}X -- ${i.nome} `).join('\n')}  
***************************************
\n Observação: ${observacao || 'Nenhuma'} 
`.trim();

  // Caminho do arquivo temporário de ticket
  const filePath = path.resolve(__dirname, `ticket_temp_${id_mesa}.txt`);

  // Criar o arquivo de ticket
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Arquivo de ticket criado: ${filePath}`);

  // Enviar para impressão via Notepad
  exec(`notepad /p "${filePath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Erro ao imprimir:', err);
      return res.status(500).json({ error: 'Erro ao imprimir o pedido' });
    }

    console.log('Pedido enviado para impressão!');

    // Deletar o arquivo de ticket após a impressão
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Erro ao excluir o arquivo de ticket:', err);
      } else {
        console.log('Arquivo de ticket excluído');
      }
    });

    // Responder ao cliente que a impressão foi realizada com sucesso
    res.status(200).json({ message: 'Pedido impresso com sucesso' });
  });
});


// POST /api/solicitar-historico (Frontend chama ao clicar no botão)
app.post('/api/solicitar-historico', (req, res) => {
  const { id_mesa, pedidos, nome, endereco, id_empresa } = req.body;

  if (!id_mesa || !pedidos || pedidos.length === 0) {
    return res.status(400).json({ error: 'Dados obrigatórios faltando!' });
  }

  const query = `
    INSERT INTO historico (id_mesa, pedidos, nome_cliente, endereco_cliente,id_empresa) 
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(query, [id_mesa, JSON.stringify(pedidos), nome, endereco,id_empresa], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao salvar histórico.' });
    res.json({ success: true, message: 'Histórico enviado para fila de impressão.' });
  });
});


// PUT /api/historico/:id/marcar-impresso (App local chama após imprimir)
app.put('/api/historico/:id/marcar-impresso', (req, res) => {
  const { id } = req.params;
  db.query(
    'UPDATE historico_pedidos SET impresso = true WHERE id_historico = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar.' });
      res.json({ success: true });
    }
  );
});

app.delete('/api/historico/:id', (req, res) => {
  const id = req.params.id;

  const query = `DELETE FROM historico WHERE id_historico = ?`;
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar histórico:', err);
      return res.status(500).json({ error: 'Erro ao deletar histórico.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Histórico não encontrado.' });
    }

    res.json({ success: true, message: 'Histórico deletado com sucesso.' });
  });
});


app.get('/api/historico-para-imprimir', (req, res) => {
  const { id_empresa } = req.query;

  const query = `
    SELECT * FROM historico
    WHERE impresso = FALSE AND id_empresa = ?
  `;

  db.query(query, [id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao buscar históricos:', err);
      return res.status(500).json({ error: 'Erro ao buscar históricos.' });
    }

    res.json(results);
  });
});




// Rota POST para imprimir o histórico de pedidos de uma mesa
app.post('/api/imprimir-historico-mesa', (req, res) => {
  const { id_mesa, pedidos, nome , endereco } = req.body;

  // Verificar se os dados necessários foram passados
  if (!id_mesa || !pedidos || pedidos.length === 0) {
    return res.status(400).json({ error: 'Faltando dados obrigatórios para imprimir o histórico de pedidos' });
  }

  // Formatar o conteúdo do histórico de pedidos
  let content = `Histórico de Pedidos - Mesa: ${id_mesa}\n`;
  content += `Nome: ${nome}\n`;
  content += `Endereço: ${endereco}\n`;
  content += '***************************************\n';

  let totalGeral = 0;

  pedidos.forEach((pedido, index) => {
    content += `Pedido ${index + 1} - Data: ${new Date(pedido.data).toLocaleDateString()} ${new Date(pedido.data).toLocaleTimeString()}\n`;
    content += `Status: ${pedido.status}\n`;
    
    // Garantir que pedido.total seja um número antes de usar toFixed()
    let total = parseFloat(pedido.total);
    
    totalGeral+= total;

    if (!isNaN(total)) {
      content += `Total: R$ ${total.toFixed(2)}\n`;
    } else {
      content += `Total: R$ 0.00\n`;  // Caso total seja inválido, define como 0.00
    }

    content += 'Itens:\n';

    pedido.itens.forEach(item => {
      let preco = parseFloat(item.preco); // Garantir que item.preco seja um número
      if (!isNaN(preco)) {
        content += `* ${item.quantidade}X -- ${item.nome} - R$ ${preco.toFixed(2)} cada\n`;
      } else {
        content += `* ${item.quantidade}X -- ${item.nome} - R$ 0.00 cada\n`; // Caso o preço seja inválido, define como 0.00
      }
    });

    content += `Observação: ${pedido.observacao || 'Nenhuma'}\n`;
    content += '***************************************\n\n';
  });

  content += `TOTAL DO CONSUMO: R$ ${totalGeral.toFixed(2)}\n`;
  content += '***************************************\n\n';

  // Caminho do arquivo temporário de ticket
  const filePath = path.resolve(__dirname, `ticket_temp_${id_mesa}.txt`);

  // Criar o arquivo de ticket
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Arquivo de ticket criado: ${filePath}`);

  // Enviar para impressão via Notepad
  exec(`notepad /p "${filePath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Erro ao imprimir:', err);
      return res.status(500).json({ error: 'Erro ao imprimir o histórico de pedidos' });
    }

    console.log('Histórico de pedidos enviado para impressão!');

    // Deletar o arquivo de ticket após a impressão
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Erro ao excluir o arquivo de ticket:', err);
      } else {
        console.log('Arquivo de ticket excluído');
      }
    });

    // Responder ao cliente que a impressão foi realizada com sucesso
    res.status(200).json({ message: 'Histórico de pedidos impresso com sucesso' });
  });
});


// Rota GET para obter todos os produtos
app.get('/api/produtos', (req, res) => {
  db.query('SELECT id_produto, nome, descricao, preco, quantidade_estoque, imagem, categoria FROM produto WHERE id_empresa = 2', (err, results) => {
    if (err) {
      console.error('Erro ao consultar os produtos:', err);
      res.status(500).json({ error: 'Erro ao obter produtos', details: err });
    } else {
      console.log('Produtos encontrados:', results);
      res.json(results);
    }
  });
});

// Rota GET para obter produtos de uma categoria específica
app.get('/api/produtos/categoria/:id', (req, res) => {
  const categoriaId = req.params.id;

  const query = 'SELECT id_produto, nome, descricao, preco, quantidade_estoque, imagem, categoria FROM produto WHERE categoria = ? and id_empresa = 2';

  db.query(query, [categoriaId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter produtos por categoria', details: err });
    } else {
      res.json(results);
    }
  });
});

// Rota POST para adicionar produtos com upload de imagem
app.post('/api/produtos', upload.single('imagem'), (req, res) => {
  const { nome, descricao, preco, quantidade_estoque } = req.body;
  const imagemUrl = req.file ? `/uploads/${req.file.filename}` : null; // URL da imagem no servidor

  const query = 'INSERT INTO produto (nome, descricao, preco, quantidade_estoque, imagem) VALUES (?, ?, ?, ?, ?)';
  const values = [nome, descricao, preco, quantidade_estoque, imagemUrl];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao adicionar produto:', err);
      res.status(500).json({ error: 'Erro ao adicionar produto' });
    } else {
      console.log('Produto adicionado com sucesso:', result);
      res.status(201).json({ message: 'Produto adicionado com sucesso', id: result.insertId });
    }
  });
});

// Rota DELETE para deletar um produto
app.delete('/api/produtos/:id', (req, res) => {
  const id = req.params.id;

  const query = 'DELETE FROM produto WHERE id_produto = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao deletar produto:', err);
      res.status(500).json({ error: 'Erro ao deletar produto' });
    } else if (results.affectedRows === 0) {
      console.log('Produto não encontrado:', id);
      res.status(404).json({ message: 'Produto não encontrado' });
    } else {
      console.log('Produto deletado com sucesso:', id);
      res.status(200).json({ message: 'Produto deletado com sucesso' });
    }
  });
});

// Rota PUT para atualizar um produto
app.put('/api/produtos/:id', upload.single('imagem'), (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, quantidade_estoque } = req.body;
  const imagemUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const query = `
    UPDATE produto
    SET nome = ?, descricao = ?, preco = ?, quantidade_estoque = ?, imagem = ?
    WHERE id_produto = ?
  `;

  db.query(query, [nome, descricao, preco, quantidade_estoque, imagemUrl, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar produto:', err);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    } else if (result.affectedRows === 0) {
      console.log('Produto não encontrado para atualização:', id);
      res.status(404).json({ error: 'Produto não encontrado' });
    } else {
      console.log('Produto atualizado com sucesso:', id);
      res.json({ message: 'Produto atualizado com sucesso' });
    }
  });
});

// Rota GET para obter todos os funcionários
app.get('/api/funcionarios', (req, res) => {
  db.query('SELECT id, nome, cargo, departamento, salario, data_contratacao, email, telefone, ativo FROM funcionario', (err, results) => {
    if (err) {
      console.error('Erro ao consultar os funcionários:', err);
      res.status(500).json({ error: 'Erro ao obter funcionários', details: err });
    } else {
      console.log('Funcionários encontrados:', results);
      res.json(results);
    }
  });
});


// CRUD da Mesa

// Rota GET para obter todas as mesas com base no id_empresa
app.get('/api/mesas', (req, res) => {
  const id_empresa = req.query.id_empresa;

  const sql = `
    SELECT * FROM mesa 
    WHERE status != 'finalizada' AND id_empresa = ?
  `;

  db.query(sql, [id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao consultar as mesas:', err);
      res.status(500).json({ error: 'Erro ao obter mesas', details: err });
    } else {
      console.log('Mesas encontradas:', results);
      res.json(results);
    }
  });
});


// Rota GET para obter uma mesa pelo ID
app.get('/api/mesas/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM mesa WHERE id_mesa = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao consultar a mesa:', err);
      res.status(500).json({ error: 'Erro ao obter mesa', details: err });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'Mesa não encontrada' });
    } else {
      res.json(results[0]);
    }
  });
});

// Rota POST para adicionar uma nova mesa
app.post('/api/mesas', (req, res) => {
  const { numero, capacidade, status, pedidos, garcom, horaAbertura, totalConsumo,nome,ordem_type,endereco,id_empresa,troco,telefone } = req.body;
  const query = 'INSERT INTO mesa (numero, capacidade, status, pedidos, garcom, horaAbertura, totalConsumo, nome, ordem_type, endereco,id_empresa,troco,telefone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)';
  const values = [numero, capacidade, status, JSON.stringify(pedidos), garcom, horaAbertura, totalConsumo, nome, ordem_type, endereco,id_empresa,troco,telefone];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao adicionar mesa:', err);
      res.status(500).json({ error: 'Erro ao adicionar mesa' });
    } else {
      console.log('Mesa adicionada com sucesso:', result);
      res.status(201).json({ message: 'Mesa adicionada com sucesso', id: result.insertId });
    }
  });
});

app.put('/api/mesas/:id', (req, res) => {
  const { id } = req.params;
  const fieldsToUpdate = [];
  const values = [];

  // Adiciona os campos que foram enviados no corpo da requisição
  if (req.body.numero !== undefined) {
    fieldsToUpdate.push('numero = ?');
    values.push(req.body.numero);
  }
  if (req.body.capacidade !== undefined) {
    fieldsToUpdate.push('capacidade = ?');
    values.push(req.body.capacidade);
  }
  if (req.body.status !== undefined) {
    fieldsToUpdate.push('status = ?');
    values.push(req.body.status);
  }
  if (req.body.pedidos !== undefined) {
    fieldsToUpdate.push('pedidos = ?');
    values.push(JSON.stringify(req.body.pedidos));
  }
  if (req.body.garcom !== undefined) {
    fieldsToUpdate.push('garcom = ?');
    values.push(req.body.garcom);
  }
  if (req.body.horaAbertura !== undefined) {
    fieldsToUpdate.push('horaAbertura = ?');
    values.push(req.body.horaAbertura);
  }
  if (req.body.totalConsumo !== undefined) {
    fieldsToUpdate.push('totalConsumo = ?');
    values.push(req.body.totalConsumo);
  }

  // Se nenhum campo foi enviado, retorna um erro
  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  values.push(id);
  const query = `UPDATE mesa SET ${fieldsToUpdate.join(', ')} WHERE id_mesa = ?`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar mesa:', err);
      return res.status(500).json({ error: 'Erro ao atualizar mesa' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mesa não encontrada' });
    }
    res.json({ message: 'Mesa atualizada com sucesso' });
  });
});


// Rota DELETE para deletar uma mesa pelo ID
app.delete('/api/mesas/:id', (req, res) => {
  const { id } = req.params;
  db.query('delete from mesa where id_mesa = ?', [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar mesa:', err);
      res.status(500).json({ error: 'Erro ao deletar mesa' });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Mesa não encontrada' });
    } else {
      console.log('Mesa deletada com sucesso:', id);
      res.json({ message: 'Mesa deletada com sucesso' });
    }
  });
});

// Rota PUT para atualizar o status da mesa para "Finalizada"
app.put('/api/mesas/:id/status', (req, res) => {
  const { id } = req.params; // Pega o id da mesa da URL

  // Define diretamente o status como "Finalizada"
  const status = 'Finalizada';

  const query = `UPDATE mesa SET status = ? WHERE id_mesa = ?`;

  db.query(query, [status, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar status da mesa:', err);
      return res.status(500).json({ error: 'Erro ao atualizar status da mesa' });
    }

    // Se não encontrou a mesa para atualizar
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mesa não encontrada' });
    }

    res.json({ message: 'Status da mesa atualizado com sucesso' });
  });
});



// Rota POST para adicionar um novo pedido
app.post('/api/pedidos', (req, res) => {
  const { id_mesa, status, total, data, item, observacao,numero} = req.body;

  // Insira o pedido na tabela 'pedidos' (ajuste o nome da tabela conforme necessário)
  const query = `
    INSERT INTO pedidos (id_mesa, status, total, data, item ,observacao,num_mesa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [id_mesa, status, total, data, JSON.stringify(item), observacao,numero];

   // Verificar a observação que chegou
   console.log('Observação recebida:', observacao);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao adicionar pedido:', err);
      res.status(500).json({ error: 'Erro ao adicionar pedido' });
    } else {
      console.log('Pedido adicionado com sucesso:', result);
      res.status(201).json({ message: 'Pedido adicionado com sucesso', id: result.insertId });
    }
  });
});

// Rota POST para adicionar pedidos em lote
app.post('/api/pedidos/lote', (req, res) => {
  const pedidos = req.body; // Array de objetos

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    return res.status(400).json({ error: 'Lista de pedidos inválida ou vazia' });
  }

  const values = pedidos.map(p => [
    p.id_mesa,
    p.id_item,
    p.id_empresa,
    p.impresso,
    p.nome_item,
    p.preco,
    p.quantidade,
    p.observacao || null,
    p.data_pedido || new Date()
  ]);

  const sql = `
    INSERT INTO pedido (id_mesa, id_item, id_empresa, impresso, nome_item, preco, quantidade, observacao, data_pedido)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error('Erro ao adicionar pedidos em lote:', err);
      return res.status(500).json({ error: 'Erro ao adicionar pedidos em lote' });
    }

    res.status(201).json({ message: 'Pedidos adicionados com sucesso', inserted: result.affectedRows });
  });
});



app.get('/api/pedidos', (req, res) => {
  db.query('SELECT * FROM pedidos where  status != "Finalizado"', (err, results) => {
    if (err) {
      console.error('Erro ao consultar os pedidos:', err);
      res.status(500).json({ error: 'Erro ao obter pedidos', details: err });
    } else {
      console.log('Pedidos encontrados:', results);
      res.json(results);
    }
  });
});


app.get('/api/pedidos/total-mesa', (req, res) => {
  const { id_empresa, id_mesa } = req.query;

  const query = `
    SELECT 
      id_empresa,
      id_mesa,
      SUM(preco * quantidade) AS total_consumo
    FROM 
      pedido
    WHERE 
      id_empresa = ? AND id_mesa = ?
    GROUP BY 
      id_empresa, id_mesa
  `;

  db.query(query, [id_empresa, id_mesa], (err, results) => {
    if (err) {
      console.error('Erro ao buscar total da mesa:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Nenhum pedido encontrado para essa mesa' });
    }

    res.status(200).json(results[0]); // retorna o total_consumo
  });
});


// Rota para calcular e atualizar o total de consumo de uma mesa
app.get('/api/pedidos/atualizar-total-mesa', (req, res) => {
  const { id_empresa, id_mesa } = req.query;

  if (!id_empresa || !id_mesa) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }

  const sqlTotal = `
    SELECT SUM(preco * quantidade) AS total
    FROM pedido
    WHERE id_mesa = ? AND id_empresa = ?
  `;

  db.query(sqlTotal, [id_mesa, id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao calcular total:', err);
      return res.status(500).json({ error: 'Erro ao calcular total' });
    }

    const total = results[0].total || 0;

    const sqlUpdate = `
      UPDATE mesa
      SET totalConsumo = ?
      WHERE id_mesa = ? AND id_empresa = ?
    `;

    db.query(sqlUpdate, [total, id_mesa, id_empresa], (err, result) => {
      if (err) {
        console.error('Erro ao atualizar total na tabela mesa:', err);
        return res.status(500).json({ error: 'Erro ao atualizar total' });
      }

      res.status(200).json({ message: 'Total atualizado com sucesso', total });
    });
  });
});



app.get('/api/mesas/:id_mesa/historico-pedidos', (req, res) => {
  const id_mesa = req.params.id_mesa;
  const id_empresa = req.query.id_empresa;

  if (!id_empresa) {
    return res.status(400).json({ error: 'id_empresa é obrigatório' });
  }

  const query = `
    SELECT * FROM pedido
    WHERE id_mesa = ? AND id_empresa = ?
    ORDER BY data_hora DESC
  `;

  db.query(query, [id_mesa, id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao buscar histórico de pedidos:', err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de pedidos' });
    }

    res.json(results); // Apenas retorna os itens diretamente
  });
});


// Rota para buscar os pedidos de uma mesa específica por empresa
app.get('/api/mesas/:id_mesa/pedidos', (req, res) => {
  const id_mesa = req.params.id_mesa;
  const id_empresa = req.query.id_empresa;

  if (!id_empresa) {
    return res.status(400).json({ error: 'id_empresa é obrigatório' });
  }

  const query = `
    SELECT * FROM pedido
    WHERE id_mesa = ? AND id_empresa = ?
    ORDER BY data_pedido DESC
  `;

  db.query(query, [id_mesa, id_empresa], (err, results) => {
    if (err) {
      console.error('Erro ao buscar pedidos da mesa:', err);
      return res.status(500).json({ error: 'Erro ao buscar pedidos da mesa' });
    }

    res.json(results);
  });
});

// Rota GET para obter um pedido específico pelo ID
app.get('/api/pedidos/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM pedido WHERE id_pedido = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao consultar o pedido:', err);
      res.status(500).json({ error: 'Erro ao obter pedido', details: err });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'Pedido não encontrado' });
    } else {
      res.json(results[0]);
    }
  });
});


// Rota PUT para atualizar um pedido
app.put('/api/pedidos/:id', (req, res) => {
  const { id } = req.params;
  const { id_mesa, status } = req.body;

  const query = `
    UPDATE pedidos
    SET id_mesa = ?, status = ?
    WHERE id_pedido = ?
  `;
  const values = [id_mesa, status, id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar pedido:', err);
      res.status(500).json({ error: 'Erro ao atualizar pedido' });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pedido não encontrado' });
    } else {
      console.log('Pedido atualizado com sucesso:', id);
      res.json({ message: 'Pedido atualizado com sucesso' });
    }
  });
});

// Rota: PUT /api/pedidos/:id/impresso
app.put('/api/pedidos/:id/impresso', (req, res) => {
  const { id } = req.params;
  const { impresso } = req.body; // { "impresso": true/false }

  const query = `
    UPDATE pedido
    SET impresso = ?
    WHERE id_pedido = ?
  `;
  const values = [impresso, id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar impressão:', err);
      res.status(500).json({ error: 'Fodeu, deu erro no servidor' });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pedido não existe, bro' });
    } else {
      res.json({ success: true, message: 'Impressão atualizada, firmeza!' });
    }
  });
});


// Rota DELETE para excluir um pedido

app.delete('/api/pedidos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM pedido WHERE id_pedido = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar pedido' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    return res.json({ message: 'Pedido deletado com sucesso' });
  });
});


// Rota POST para adicionar uma nova venda (agora com ID_CAIXA incluso)
app.post('/api/vendas', (req, res) => {
  const {
    id_mesa,
    numero_mesa,
    id_empresa,
    total,
    data_venda,
    hora_venda,
    nota,
    status_venda,
    tipo_pagamento,
    movimento,
    card_type
  } = req.body;

  // Buscar o ID do caixa atualmente aberto
  db.query('SELECT id_caixa FROM caixa WHERE status = "ABERTO" and id_empresa = ?  ORDER BY id_caixa DESC LIMIT 1', [id_empresa],  (err, result) => {
    if (err) {
      console.error('Erro ao buscar caixa aberto:', err);
      return res.status(500).json({ error: 'Erro ao buscar caixa aberto' });
    }

    if (result.length === 0) {
      return res.status(400).json({ error: 'Nenhum caixa aberto no momento' });
    }

    const id_caixa = result[0].id_caixa;

    // Inserir a venda na tabela 'vendas' com ID_CAIXA
    const query = `
      INSERT INTO vendas (id_mesa, numero_mesa, total, data_venda, hora_venda, nota, status_venda, tipo_pagamento, movimento, card_type, id_caixa, id_empresa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [id_mesa, numero_mesa, total, data_venda, hora_venda, nota, status_venda, tipo_pagamento, movimento, card_type, id_caixa, id_empresa];

    db.query(query, values, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao adicionar venda' });
      }

      res.status(201).json({ message: 'Venda adicionada com sucesso', id_venda: result.insertId });
    });
  });
});


// Rota GET para listar todas as vendas de caixa aberto por empresa
app.get('/api/vendas', (req, res) => {
  const id_empresa = req.query.id_empresa;

  if (!id_empresa) {
    return res.status(400).json({ error: 'Parâmetro id_empresa é obrigatório' });
  }

  // Buscar o caixa aberto da empresa específica
  const queryCaixa = 'SELECT id_caixa FROM caixa WHERE status = "ABERTO" AND id_empresa = ? ORDER BY id_caixa DESC LIMIT 1';

  db.query(queryCaixa, [id_empresa], (err, result) => {
    if (err) {
      console.error('Erro ao buscar caixa aberto:', err);
      return res.status(500).json({ error: 'Erro ao buscar caixa aberto' });
    }

    if (result.length === 0) {
      return res.status(400).json({ error: 'Nenhum caixa aberto no momento para esta empresa' });
    }

    const id_caixa = result[0].id_caixa;

    // Buscar as vendas que pertencem a esse caixa
    const queryVendas = 'SELECT * FROM vendas WHERE id_caixa = ? AND id_empresa = ? AND status_venda != "CANCELADA" ORDER BY id_venda DESC';

    db.query(queryVendas, [id_caixa, id_empresa], (err, results) => {
      if (err) {
        console.error('Erro ao listar vendas:', err);
        return res.status(500).json({ error: 'Erro ao listar vendas' });
      }

      res.status(200).json(results);
    });
  });
});



// Rota PUT para atualizar uma venda
app.put('/api/vendas/:id', (req, res) => {
  const { id } = req.params;
  const { id_mesa, numero_mesa, total, data_venda, hora_venda, nota, status_venda, tipo_pagamento, movimento, card_type } = req.body;

  const query = `
    UPDATE vendas
    SET id_mesa = ?, numero_mesa = ?, total = ?, data_venda = ?, hora_venda = ?, nota = ?, status_venda = ?, tipo_pagamento = ?, movimento = ?, card_type = ?
    WHERE id_venda = ?
  `;
  const values = [id_mesa, numero_mesa, total, data_venda, hora_venda, nota, status_venda, tipo_pagamento, movimento, card_type, id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar venda:', err);
      return res.status(500).json({ error: 'Erro ao atualizar venda' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    console.log('Venda atualizada com sucesso:', id);
    res.json({ message: 'Venda atualizada com sucesso' });
  });
});


// Rota DELETE para remover uma venda específica pelo ID
app.delete('/api/vendas/:id_venda', (req, res) => {
  const { id_venda } = req.params;

  if (!id_venda) {
    return res.status(400).json({ error: 'ID da venda é obrigatório' });
  }

  const query = 'DELETE FROM vendas WHERE id_venda = ?';

  db.query(query, [id_venda], (err, result) => {
    if (err) {
      console.error('Erro ao deletar venda:', err);
      return res.status(500).json({ error: 'Erro ao deletar venda' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    console.log(`Venda com ID ${id_venda} deletada com sucesso`);
    res.status(200).json({ message: 'Venda deletada com sucesso' });
  });
});


// Rota POST para abrir um novo caixa
app.post('/api/caixa', (req, res) => {
  const { total_abertura, id_empresa } = req.body;

  if (total_abertura === undefined || !id_empresa) {
    return res.status(400).json({ error: 'O valor de abertura e o ID da empresa são obrigatórios' });
  }

  const data_abertura = new Date().toISOString().split('T')[0]; // Data atual (YYYY-MM-DD)
  const hora_abertura = new Date().toLocaleTimeString('pt-BR', { hour12: false }); // Hora atual (HH:mm:ss)

  const query = `
    INSERT INTO caixa (data_abertura, hora_abertura, total_abertura, status, id_empresa) 
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [data_abertura, hora_abertura, total_abertura, 'ABERTO', id_empresa];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao abrir o caixa:', err);
      return res.status(500).json({ error: 'Erro ao abrir o caixa' });
    }

    console.log('Caixa aberto com sucesso:', result.insertId);
    res.status(201).json({ message: 'Caixa aberto com sucesso', id: result.insertId });
  });
});


app.get('/api/caixa/aberto', (req, res) => {
  const query = "SELECT * FROM caixa WHERE status = 'ABERTO' LIMIT 1";

  db.query(query, (err, results) => {
      if (err) {
          console.error("Erro ao buscar caixa aberto:", err);
          return res.status(500).json({ message: "Erro no servidor" });
      }

      if (results.length > 0) {
          res.json(results[0]); // Retorna o primeiro caixa aberto
      } else {
          res.status(404).json({ message: "Nenhum caixa aberto encontrado" });
      }
  });
});

app.post('/api/caixa/fechar', async (req, res) => {
  try {
    const {
      idCaixa,
      totalFechamento,
      totalPix,
      totalDinheiro,
      totalCredito,
      totalDebito
    } = req.body;

    if (!idCaixa) {
      return res.status(400).json({ message: 'ID do caixa é obrigatório.' });
    }

    const sql = `
      UPDATE caixa SET 
        data_fechamento = NOW(),
        hora_fechamento = NOW(),
        total_fechamento = ?,
        total_pix = ?,
        total_dinheiro = ?,
        total_credito = ?,
        total_debito = ?,
        status = 'FECHADO'
      WHERE id_caixa = ?
    `;

    await db.execute(sql, [
      totalFechamento,
      totalPix,
      totalDinheiro,
      totalCredito,
      totalDebito,
      idCaixa
    ]);

    res.json({ message: 'Caixa fechado com sucesso.' });
  } catch (err) {
    console.error('Erro ao fechar caixa:', err);
    res.status(500).json({ message: 'Erro ao fechar caixa.' });
  }
});


const ip = '0.0.0.0'; // Permite conexões externas

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://192.168.99.104:${port}`);
});
