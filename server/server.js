require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const axios = require('axios');

const app = express();
const port = process.env.PORT || 2000;

const allowedOrigins = ['http://localhost:4200', 'http://192.168.99.100:5000/api'];

const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiOTRkMGY5MDg3YWI3YzMzOGRhOWFkMWI4NWJlMTAzZmI3ZDFjNDg0Y2RhZjg0YjZkMmEyOGJkZDU4NzE5Y2IwNTZkZGNjODE5ZGUwNTIwZjciLCJpYXQiOjE3NTQ0MTg4MDcuNzk0OTQsIm5iZiI6MTc1NDQxODgwNy43OTQ5NDEsImV4cCI6MTc4NTk1NDgwNy43ODE2MjUsInN1YiI6IjlmOGQ1NDg3LWY5YTMtNDRjYy04ZTliLWY1Y2NiMzZkZjczYSIsInNjb3BlcyI6WyJzaGlwcGluZy1jYWxjdWxhdGUiXX0.oFa_S29Kj7A_7rYP-D-aafPLtRFxkts3OIicWq3DNdpF-HutZfDIO9SHowEx0mOLDTW4Xv8azRH24zlGaSbmKNJeXChp33OW-snld8KMA_L93DySPsHN66TbxyeBKgubxdB82QZNSQv5_tDIcdJFVx7jmuZVjr3ZfZbW-YZK5nB67QNBNU8JAvV2N-PaAKd4Uqr9H8401sl0CrIhShQuabsFb2orkyFXNid39FxEbtGJUrXlWfnGzOFDCQGjBDJRNH2QEmZBKeRF6tS6Uvofz1-0urNkxoH1H1PsVOiGh2W1ihMHjL7WORvEZjKK0E8ZXJZWOlFFEqTmWmcj7DUWx1jTA99rS_lGsTDHD2ZDNHIXvX-LSiabEp280PXbah_PVlUx2WtZq1oCKWjTR3ZpRWtgggNubneB9vBoyfGsekk2Hx_Gx6OcDZEHnzj3C7e5E7N0MlcjPeIzbNFjjpKAfjJnpKvPz4okn4ILKCR_z8cVxs-vWEoG29ao0JmlTwmRCzPoPpu9_N2iGBaX-WkDPukzJqW0340Ai4YtcIuX4s_CBrnKgGphU0ynSPyn4h94sXBlcL3DwPWTeekIIfTnAEKfhvvGX8QjMFKM4b9qO2FX0TzKtFll4-_oHUbKFuUzALPkjQL8-myA75up7Zppo_FjEW9uJkkvdTzmcW24R-U';

const corsOptions = {
  origin: function(origin, callback) {
    // Se não tem origem (ex: requisição de Postman), permite
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origem permitida
      callback(null, true);
    } else {
      // Origem não permitida
      callback(new Error('Não permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

const accessToken = 'APP_USR-6075250848382634-062113-eadc8f1b789f83bf6d218a2c84d5a5c5-2191408844'

const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

const { calcularPrecoPrazo } = require('correios-brasil');

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
        timeout: 5000
    }
});

app.post('/api/frete', (req, res) => {
  const { cepDestino, peso } = req.body;

  // Normalização do CEP (pega só números)
  const cep = (cepDestino || '').replace(/\D/g, '');

  // Regras de frete mock (simples por região)
  let fretes = [
    {
      id: '1',
      name: 'SEDEX',
      price: '27.50',
      delivery_time: { days: 2, working_days: true, estimated_date: '2025-08-09' },
      company: { name: 'Correios' },
      error: ''
    },
    {
      id: '2',
      name: 'PAC',
      price: '18.90',
      delivery_time: { days: 5, working_days: true, estimated_date: '2025-08-12' },
      company: { name: 'Correios' },
      error: ''
    }
  ];

  // Exemplo de ajuste simples por região
  if (cep.startsWith('1')) { // Sudeste (ex: SP)
    fretes[0].price = '21.00';
    fretes[0].delivery_time.days = 3;
    fretes[1].price = '15.00';
    fretes[1].delivery_time.days = 4;
  }
  if (cep.startsWith('7')) { // Norte
    fretes[0].price = '38.00';
    fretes[0].delivery_time.days = 5;
    fretes[1].price = '29.00';
    fretes[1].delivery_time.days = 8;
  }
  // Se quiser, adicione mais regras para outros estados

  // Pode simular ajuste pelo peso também, se quiser
  // if (peso && peso > 5) { ... }

  // Envia sempre no padrão esperado pelo seu front!
  res.json(fretes);
});



app.post('/api/checkout', async (req, res) => {
  const items = req.body.items || [];
  const frete = req.body.frete; // Vem do front

  // Adiciona o frete como item extra se existir
  if (frete && frete.price) {
    items.push({
      title: 'Frete',
      quantity: 1,
      currency_id: "BRL",
      unit_price: Number(frete.price.replace(',', '.'))
    });
  }

  try {
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: items.map(item => ({
          title: item.nome 
            ? `${item.nome}${item.tamanho ? ' (' + item.tamanho + ')' : ''}` 
            : item.title, // Caso seja o item de frete
          quantity: item.quantidade || item.quantity || 1,
          currency_id: "BRL",
          unit_price: Number(item.preco || item.unit_price)
        })),
        back_urls: {
          success: 'https://www.google.com/webhp?hl=pt-BR&sa=X&ved=0ahUKEwjWicSi38X2AhUtq5UCHfVhAuAQPAgI',
          failure: 'https://www.google.com/webhp?hl=pt-BR&sa=X&ved=0ahUKEwjWicSi38X2AhUtq5UCHfVhAuAQPAgI',
          pending: 'https://www.google.com/webhp?hl=pt-BR&sa=X&ved=0ahUKEwjWicSi38X2AhUtq5UCHfVhAuAQPAgI'
        },
        auto_return: "approved"
      }
    });

    return res.json({ init_point: result.init_point });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
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
    cb(null, './uploads/produtos'); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Pega a extensão do arquivo
    const filename = Date.now() + ext; // Cria um nome único para a imagem
    cb(null, filename); // Define o nome final do arquivo
  }
});

const upload = multer({ storage: storage });

// Middleware para servir arquivos estáticos da pasta 'uploads'
app.use('/uploads/produtos', express.static(path.join(__dirname, 'uploads/produtos')));
app.use('/uploads/imagens', express.static(path.join(__dirname, 'uploads/imagens')));




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


// Endpoint para listar categorias e seus produtos
app.get('/api/categorias-com-produtos', async (req, res) => {
  try {
    const [categorias] = await db.promise().query('SELECT * FROM categorias WHERE ativo = 1');

    const categoriasComProdutos = await Promise.all(
      categorias.map(async (categoria) => {
        const [produtos] = await db.promise().query(
          'SELECT * FROM produtos WHERE id_categoria = ?',
          [categoria.id_categoria]
        );

        return {
          ...categoria,
          produtos
        };
      })
    );

    res.json(categoriasComProdutos);
  } catch (error) {
    console.error('Erro ao buscar categorias e produtos:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar dados.' });
  }
});

app.get('/api/produtos', async (req, res) => {
  try {
    const [produtos] = await db.promise().query('SELECT * FROM produtos');

    const produtosComImagem = produtos.map(produto => ({
      ...produto,
      imagemUrl: produto.imagem
        ? `${req.protocol}://${req.headers.host}/uploads/produtos/${produto.imagem}`
        : null
    }));

    res.json(produtosComImagem);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// Nova rota (correta):
app.get('/api/categorias', (req, res) => {
  const sql = 'SELECT id_categoria, nome, descricao FROM categorias WHERE ativo = 1';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Erro no MySQL:', err);
      return res.status(500).json({ erro: 'Erro no banco de dados' });
    }
    res.json(result);
  });
});


app.post('/api/produtos', upload.single('imagem'), async (req, res) => {
  try {
    // Extrai os dados do FormData, incluindo descrição
    const { nome, preco, destaque, estoque, id_categoria, descricao } = req.body;
    const imagem = req.file?.filename || '';

    // Validação mínima (imagem é obrigatória na sua tabela)
    if (!imagem) {
      return res.status(400).json({ erro: 'A imagem é obrigatória' });
    }

    // Insere no banco incluindo descrição
    const [result] = await db.promise().query(
      `INSERT INTO produtos 
       (nome, descricao, preco, imagem, destaque, estoque, id_categoria) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        descricao || '',            // <-- adiciona descrição aqui
        parseFloat(preco), 
        imagem,
        destaque === '1' ? 1 : 0,
        parseInt(estoque) || 0,
        id_categoria || null
      ]
    );

    res.json({ 
      success: true,
      id: result.insertId 
    });

  } catch (error) {
    console.error('Erro no backend:', error);
    res.status(500).json({ 
      success: false,
      erro: 'Erro interno' 
    });
  }
});


app.put('/api/produtos/:id', upload.single('imagem'), async (req, res) => {
  const id = req.params.id;
  const { nome, preco, destaque, estoque, id_categoria, descricao } = req.body;

  try {
    // Verifica se o produto existe (com base no campo id, não id_produto)
    const [produtoAtual] = await db.promise().query('SELECT * FROM produtos WHERE id = ?', [id]);

    if (produtoAtual.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    let imagem = produtoAtual[0].imagem;

    // Se uma nova imagem foi enviada, substitui a antiga
    if (req.file) {
      imagem = req.file.filename;

      // Apaga a imagem antiga (se existir)
      if (produtoAtual[0].imagem) {
        const caminhoImagem = path.join(__dirname, 'uploads/produtos', produtoAtual[0].imagem);
        if (fs.existsSync(caminhoImagem)) {
          fs.unlinkSync(caminhoImagem);
        }
      }
    }

    // Atualiza os dados no banco
    await db.promise().query(
      `UPDATE produtos SET 
        nome = ?, 
        descricao = ?, 
        preco = ?, 
        imagem = ?, 
        destaque = ?, 
        estoque = ?, 
        id_categoria = ?
      WHERE id = ?`,
      [
        nome,
        descricao || '',
        parseFloat(preco),
        imagem,
        destaque === '1' ? 1 : 0,
        parseInt(estoque) || 0,
        id_categoria || null,
        id
      ]
    );

    res.json({ success: true, mensagem: 'Produto atualizado com sucesso!' });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ erro: 'Erro interno ao atualizar o produto.' });
  }
});


app.delete('/api/produtos/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // Verifica se o produto existe
    const [rows] = await db.promise().query('SELECT * FROM produtos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const produto = rows[0];

    // Deleta a imagem do disco
    if (produto.imagem) {
      const caminhoImagem = path.join(__dirname, 'uploads/produtos', produto.imagem);
      if (fs.existsSync(caminhoImagem)) {
        fs.unlinkSync(caminhoImagem);
      }
    }

    // Remove o produto do banco
    await db.promise().query('DELETE FROM produtos WHERE id = ?', [id]);

    res.json({ success: true, mensagem: 'Produto deletado com sucesso!' });

  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ erro: 'Erro interno ao deletar o produto.' });
  }
});


// Criar nova categoria
app.post('/api/categorias', async (req, res) => {
  const { nome, descricao, ativo } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
  }

  try {
    const [result] = await db.promise().query(
      'INSERT INTO categorias (nome, descricao, ativo, data_criacao) VALUES (?, ?, ?, NOW())',
      [nome, descricao || '', ativo ? 1 : 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Erro ao adicionar categoria:', error);
    res.status(500).json({ erro: 'Erro ao adicionar categoria.' });
  }
});


// Rota para listar todas as categorias (ativas e inativas)
app.get('/api/categorias/todas', async (req, res) => {
  try {
    const [result] = await db.promise().query('SELECT * FROM categorias');
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar todas as categorias:', error);
    res.status(500).json({ erro: 'Erro ao buscar categorias.' });
  }
});


// Atualizar categoria existente
app.put('/api/categorias/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, ativo } = req.body;

  try {
    const [result] = await db.promise().query(
      'UPDATE categorias SET nome = ?, descricao = ?, ativo = ? WHERE id_categoria = ?',
      [nome, descricao || '', ativo ? 1 : 0, id]
    );
    res.json({ success: true, mensagem: 'Categoria atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ erro: 'Erro ao atualizar categoria.' });
  }
});

// Deletar categoria
app.delete('/api/categorias/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.promise().query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    res.json({ success: true, mensagem: 'Categoria deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    res.status(500).json({ erro: 'Erro ao deletar categoria.' });
  }
});

// ROTAS PARA VARIAÇÕES DE PRODUTO

// Listar variações de um produto
app.get('/api/produtos/:id/variacoes', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM variacoes_produto WHERE id_produto = ?',
      [id]
    );

    console.log([rows],'Alguma merda vinda do backend')
    console.log([id],'ID DO PRODUTO NO BACKEND')
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar variações:', error);
    res.status(500).json({ erro: 'Erro ao buscar variações.' });
  }
});

// Criar variação
app.post('/api/variacoes', async (req, res) => {
  const { id_produto, nome_variacao, descricao_opcao, preco_adicional } = req.body;

  if (!id_produto || !descricao_opcao) {
    return res.status(400).json({ erro: 'Campos obrigatórios não preenchidos.' });
  }

  try {
    const [result] = await db.promise().query(
      `INSERT INTO variacoes_produto (id_produto, nome_variacao, descricao_opcao, preco_adicional)
       VALUES (?, ?, ?, ?)`,
      [id_produto, nome_variacao, descricao_opcao, preco_adicional || 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Erro ao criar variação:', error);
    res.status(500).json({ erro: 'Erro ao criar variação.' });
  }
});

// Atualizar variação
app.put('/api/variacoes/:id', async (req, res) => {
  const { id } = req.params;
  const { nome_variacao, descricao_opcao, preco_adicional } = req.body;

  try {
    await db.promise().query(
      `UPDATE variacoes_produto SET nome_variacao = ?, descricao_opcao = ?, preco_adicional = ?
       WHERE id_variacao = ?`,
      [nome_variacao, descricao_opcao, preco_adicional, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar variação:', error);
    res.status(500).json({ erro: 'Erro ao atualizar variação.' });
  }
});

// Deletar variação
app.delete('/api/variacoes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.promise().query('DELETE FROM variacoes_produto WHERE id_variacao = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar variação:', error);
    res.status(500).json({ erro: 'Erro ao deletar variação.' });
  }
});

const ip = '0.0.0.0'; // Permite conexões externas

app.listen(port, '0.0.0.0', () => {
  console.log('Servidor rodando');
});
