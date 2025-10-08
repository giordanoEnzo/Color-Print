require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const path = require('path');
const fs = require('fs');

const axios = require('axios');

const app = express();
const port = process.env.PORT || 2000;

/** CORS – adicione aqui as origens do seu front */
// const allowedOrigins = [
//   'http://localhost:4200',
//   'http://192.168.99.102:4200'
// ];

/** Helpers numéricos */
function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function toNumber(v, fallback = 0) {
  const n = numOrNull(v);
  return n === null ? fallback : n;
}

/** Token do Melhor Envio (obrigatório) */
const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;
if (!MELHOR_ENVIO_TOKEN) {
  console.error('Defina MELHOR_ENVIO_TOKEN no .env');
  process.exit(1);
}

/** Melhor Envio: config */
const ME_BASE_URL   = process.env.ME_BASE_URL || 'https://sandbox.melhorenvio.com.br'; // sandbox por padrão
const ME_CEP_ORIGEM = (process.env.ME_CEP_ORIGEM || '13635-203').replace(/\D/g, '');     // CEP de origem

/** Pacote default (cm/kg) – usado se itens não tiverem dimensões/peso */
const DEFAULT_PKG = {
  width:  Number(process.env.ME_PKG_WIDTH)  || 20,
  height: Number(process.env.ME_PKG_HEIGHT) || 5,
  length: Number(process.env.ME_PKG_LENGTH) || 20,
  weight: Number(process.env.ME_PKG_WEIGHT) || 0.3
};

/** Headers recomendados pelo Melhor Envio */
const meHeaders = {
  Authorization: `Bearer ${MELHOR_ENVIO_TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'ColorPrint/1.0 (contato@colorprint.com.br)'
};

console.log('[ME] Base:', ME_BASE_URL, '| Token set:', Boolean(MELHOR_ENVIO_TOKEN));

// const corsOptions = {
//   origin: function(origin, callback) {
//     if (!origin) return callback(null, true); // permite Postman/sem origem
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
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

const accessToken = 'APP_USR-6075250848382634-062113-eadc8f1b789f83bf6d218a2c84d5a5c5-2191408844';

const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: {
    timeout: 5000
  }
});

/* ===========================================
   MELHOR ENVIO
=========================================== */

// Ping – verifica token/ambiente
app.get('/api/melhor-envio/ping', async (req, res) => {
  try {
    const { data } = await axios.get(`${ME_BASE_URL}/api/v2/me`, { headers: meHeaders });
    res.json({ ok: true, me: data });
  } catch (err) {
    console.error('Ping ME erro:', err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json(err?.response?.data || { error: 'Falha no ping' });
  }
});

// Cálculo de frete via Melhor Envio
app.post('/api/frete-melhor-envio', async (req, res) => {
  try {
    if (!MELHOR_ENVIO_TOKEN) {
      return res.status(500).json({ error: 'Token do Melhor Envio não configurado.' });
    }

    const cepDestino = String(req.body.cepDestino || '').replace(/\D/g, '');
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    console.log("[DEBUG][FRETE] CEP origem configurado:", ME_CEP_ORIGEM);
    console.log("[DEBUG][FRETE] CEP destino recebido:", cepDestino);

    // === DEBUG: dados recebidos ===
    console.log("\x1b[36m[DEBUG][FRETE] Items recebidos do front:\x1b[0m", JSON.stringify(items, null, 2));

    if (!cepDestino || cepDestino.length < 8) {
      return res.status(400).json({ error: 'CEP de destino inválido.' });
    }

    // Monta "products" usando medidas vindas do front ou do banco
    const products = items.map((it, idx) => ({
      id: String(it.id || it.id_produto || idx + 1),

      // aceita width/height/length/weight OU largura_cm/altura_cm/comprimento/peso
      width:  numOrNull(it.width  || it.largura_cm)  ?? DEFAULT_PKG.width,
      height: numOrNull(it.height || it.altura_cm)   ?? DEFAULT_PKG.height,
      length: numOrNull(it.length || it.comprimento) ?? DEFAULT_PKG.length,
      weight: numOrNull(it.weight || it.peso)        ?? DEFAULT_PKG.weight,

      quantity: Number(it.quantity ?? it.quantidade) || 1
    }));

    // === DEBUG: normalização dos produtos ===
    console.log("\x1b[33m[DEBUG][FRETE] Produtos normalizados (para envio):\x1b[0m", JSON.stringify(products, null, 2));

    const body = {
      from: { postal_code: ME_CEP_ORIGEM },
      to:   { postal_code: cepDestino },
      options: { receipt: false, own_hand: false },
      ...(products.length ? { products } : { package: DEFAULT_PKG })
      // services: "1,2,18"
    };

    // === DEBUG: corpo final enviado ===
    console.log("\x1b[35m[DEBUG][FRETE] Body enviado para API do Melhor Envio:\x1b[0m", JSON.stringify(body, null, 2));

    const { data } = await axios.post(
      `${ME_BASE_URL}/api/v2/me/shipment/calculate`,
      body,
      { headers: meHeaders, timeout: 10000 }
    );

    // === DEBUG: resposta bruta ===
    console.log("\x1b[32m[DEBUG][FRETE] Resposta recebida da API do Melhor Envio:\x1b[0m", JSON.stringify(data, null, 2));

    // Normaliza retorno
    const quotes = (Array.isArray(data) ? data : []).map((q) => {
      const dt    = q.custom_delivery_time ?? q.delivery_time ?? {};
      const range = q.custom_delivery_range ?? q.delivery_range ?? {};

      const days =
        (typeof dt.days === 'number' ? dt.days : null) ??
        (typeof range.max === 'number' ? range.max : null) ??
        (typeof range.min === 'number' ? range.min : null);

      return {
        id: q.id,
        name: q.name,
        company: { name: q.company?.name || q.company?.alias || '' },
        price: String(q.custom_price ?? q.price ?? ''),
        delivery_time: {
          days,
          working_days: Boolean(dt.working_days ?? true),
          estimated_date: dt.estimated_date || null
        },
        error: q.error || ''
      };
    });

    res.json(quotes);
  } catch (err) {
    console.error('\x1b[31m[ERRO][FRETE] Falha no cálculo:\x1b[0m', err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json(
      err?.response?.data || { error: 'Erro ao calcular frete no Melhor Envio.' }
    );
  }
});




/* ===========================================
   MERCADO PAGO (Checkout/PIX)
   =========================================== */

app.post('/api/checkout', async (req, res) => {
  try {
    const { nome, email, telefone, endereco, cep, logradouro, cidade, estado_uf, items, frete, total } = req.body;

    const preference = {
      items: [
        {
          title: "Compra no E-commerce",
          unit_price: Number(total),
          quantity: 1,
        }
      ],
      payer: {
        name: nome,
        email: email,
        phone: { number: telefone },
        address: {
          street_name: logradouro,
          zip_code: cep
        }
      },
      back_urls: {
        success: "https://colorprintdigital.com.br/home",   // ✅ ajuste para sua URL do Angular
        failure: "https://colorprintdigital.com.br/home",
        pending: "https://colorprintdigital.com.br/home"
      },
      auto_return: "approved", // só funciona se back_urls.success existir
      notification_url: "https://colorprintdigital.com.br/api/webhook/mercadopago", // ✅ URL do webhook
      metadata: {
        nome,
        email,
        telefone,
        endereco,
        cep,
        logradouro,
        cidade,
        estado_uf,
        total,
        items,
        frete
      }
    };

    const preferenceResponse = await new Preference(client).create({ body: preference });
    res.json({ init_point: preferenceResponse.init_point });

  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    res.status(500).json({ error: "Erro ao criar checkout" });
  }
});


// webhook mercado pago
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    const paymentId = req.body.data?.id;
    if (!paymentId) return res.sendStatus(400);

    const payment = new Payment(client);
    const result = await payment.get({ id: paymentId });

    if (result.status === "approved") {
      const meta = result.metadata;

      await db.promise().query(
        `INSERT INTO vendas 
         (nome_cliente, email_cliente, telefone_cliente, endereco_cliente, cep_cliente, logradouro, cidade, estado_uf, total_compra, itens_pedido, frete_nome, frete_valor, status_pedido, data_pedido)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FINALIZADA', NOW())`,
        [
          meta.nome,
          meta.email,
          meta.telefone,
          meta.endereco,
          meta.cep,
          meta.logradouro,
          meta.cidade,
          meta.estado_uf,
          Number(meta.total), // ✅ corrigido
          JSON.stringify(meta.items),
          meta.frete?.name || null,
          meta.frete?.price ? Number(meta.frete.price) : null
        ]
      );

      console.log("💰 Venda registrada no banco (pagamento aprovado):", meta.nome, meta.total);
    } else {
      console.log("⚠️ Pagamento não aprovado:", result.status);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    res.sendStatus(500);
  }
});

app.post('/api/pix', async (req, res) => {
  const payment = new Payment(client);

  const { transaction_amount, description, payer_email } = req.body;

  const formattedAmount = toNumber(transaction_amount);

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

    res.status(200).json({ status });

  } catch (error) {
    console.error('Erro ao consultar pagamento:', error.message);
    res.status(500).json({ error: error.message });
  }

});

/* ===========================================
   UPLOADS / BANNERS
   =========================================== */

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

// === BANNERS por arquivos fixos (B1..B4) ===
const ensureDir = (dirPath) => { try { fs.mkdirSync(dirPath, { recursive: true }); } catch (_) {} };
const bannersDir = path.join(__dirname, 'uploads', 'imagens');
ensureDir(bannersDir);

// Mapeia campo -> arquivo final .jpg
const BANNER_MAP = { B1: 'B1.jpg', B2: 'B2.jpg', B3: 'B3.jpg', B4: 'B4.jpg' };

// Aceitamos apenas JPEG p/ manter extensão fixa .jpg
const uploadBanners = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, bannersDir),
    filename: (req, file, cb) => {
      const field = file.fieldname; // 'B1' | 'B2' | 'B3' | 'B4'
      const targetName = BANNER_MAP[field];
      cb(null, targetName || `IGNORADO_${Date.now()}.jpg`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/jpg'].includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Apenas JPEG é permitido para banners (use .jpg).'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Lista nomes existentes com URL
function listBannerUrls(req) {
  const out = {};
  for (const [slot, filename] of Object.entries(BANNER_MAP)) {
    const full = path.join(bannersDir, filename);
    out[slot] = fs.existsSync(full)
      ? `${req.protocol}://${req.headers.host}/uploads/imagens/${filename}`
      : null;
  }
  return out;
}

// GET atual (URLs estáveis)
app.get('/api/banner-files', (req, res) => {
  try {
    return res.json(listBannerUrls(req)); // { B1: "http://.../B1.jpg", ... }
  } catch (err) {
    console.error('[BANNERS FILES][GET] Erro:', err);
    return res.status(500).json({ erro: 'Erro ao listar banners.' });
  }
});

// PUT multipart: atualiza 1..n slots (B1,B2,B3,B4) sobrescrevendo B?.jpg
app.put(
  '/api/banner-files',
  uploadBanners.fields([
    { name: 'B1', maxCount: 1 },
    { name: 'B2', maxCount: 1 },
    { name: 'B3', maxCount: 1 },
    { name: 'B4', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Como o filename já é fixo no storage, ao salvar substitui o antigo automaticamente.
      // Apenas garantimos que só campos válidos foram aceitos.
      return res.json(listBannerUrls(req));
    } catch (err) {
      console.error('[BANNERS FILES][PUT] Erro:', err);
      return res.status(500).json({ erro: err.message || 'Erro ao atualizar banners.' });
    }
  }
);

// DELETE opcional: limpa um slot (remove B?.jpg)
app.delete('/api/banner-files/:slot', (req, res) => {
  const slot = req.params.slot.toUpperCase(); // B1..B4
  const filename = BANNER_MAP[slot];
  if (!filename) return res.status(400).json({ erro: 'Slot inválido. Use B1, B2, B3 ou B4.' });

  try {
    const full = path.join(bannersDir, filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    return res.json({ success: true });
  } catch (err) {
    console.error('[BANNERS FILES][DELETE] Erro:', err);
    return res.status(500).json({ erro: 'Erro ao remover banner.' });
  }
});


// Rota de login (sem bcrypt)
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ msg: 'Email e senha são obrigatórios' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Usuário não encontrado' });
    }

    const usuario = rows[0];

    // 👉 comparação direta, sem hash
    if (senha !== usuario.senha) {
      return res.status(401).json({ msg: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, role: usuario.role },
      process.env.JWT_SECRET || 'segredo_jwt',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ msg: 'Erro interno do servidor', erro: err.message });
  }
});


/* ===========================================
   AUTENTICAÇÃO / CATEGORIAS / PRODUTOS / VARIAÇÕES / VENDAS
   =========================================== */

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
    const { nome, preco, destaque, estoque, id_categoria, descricao } = req.body;
    const imagem = req.file?.filename || '';

    // novas dimensões/peso (vêm como string no multipart)
    const width  = numOrNull(req.body.width);
    const height = numOrNull(req.body.height);
    const length = numOrNull(req.body.length);
    const weight = numOrNull(req.body.weight);

    if (!imagem) {
      return res.status(400).json({ erro: 'A imagem é obrigatória' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO produtos 
       (nome, descricao, preco, imagem, destaque, estoque, id_categoria, width, height, length, weight) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        descricao || '',
        toNumber(preco, 0),
        imagem,
        destaque === '1' ? 1 : 0,
        parseInt(estoque) || 0,
        id_categoria || null,
        width, height, length, weight
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Erro no backend:', error);
    res.status(500).json({ success: false, erro: 'Erro interno' });
  }
});

app.put('/api/produtos/:id', upload.single('imagem'), async (req, res) => {
  const id = req.params.id;
  const { nome, preco, destaque, estoque, id_categoria, descricao } = req.body;

  try {
    const [produtoAtual] = await db.promise().query('SELECT * FROM produtos WHERE id = ?', [id]);
    if (produtoAtual.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    let imagem = produtoAtual[0].imagem;

    if (req.file) {
      imagem = req.file.filename;
      if (produtoAtual[0].imagem) {
        const caminhoImagem = path.join(__dirname, 'uploads/produtos', produtoAtual[0].imagem);
        if (fs.existsSync(caminhoImagem)) fs.unlinkSync(caminhoImagem);
      }
    }

    // novas dimensões/peso (podem vir vazias -> null)
    const width  = numOrNull(req.body.width);
    const height = numOrNull(req.body.height);
    const length = numOrNull(req.body.length);
    const weight = numOrNull(req.body.weight);

    await db.promise().query(
      `UPDATE produtos SET 
        nome = ?, 
        descricao = ?, 
        preco = ?, 
        imagem = ?, 
        destaque = ?, 
        estoque = ?, 
        id_categoria = ?,
        width  = ?,
        height = ?,
        length = ?,
        weight = ?
      WHERE id = ?`,
      [
        nome,
        descricao || '',
        toNumber(preco, 0),
        imagem,
        destaque === '1' ? 1 : 0,
        parseInt(estoque) || 0,
        id_categoria || null,
        width, height, length, weight,
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

/* VARIAÇÕES */

// Listar variações de um produto
app.get('/api/produtos/:id/variacoes', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM variacoes_produto WHERE id_produto = ?',
      [id]
    );
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

/* VENDAS */

app.post('/api/vendas', async (req, res) => {
  const {
    nome, email, telefone, endereco, cep, logradouro, cidade, estado_uf,
    items, frete, total
  } = req.body;

  try {
    const [result] = await db.promise().query(
      `INSERT INTO vendas
        (nome_cliente, email_cliente, telefone_cliente, endereco_cliente, cep_cliente, logradouro, cidade, estado_uf, total_compra, itens_pedido, frete_nome, frete_valor, status_pedido)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        email,
        telefone,
        endereco,
        cep,
        logradouro,
        cidade,
        estado_uf,
        total, // ✅ novo campo
        JSON.stringify(items),
        frete?.name || null,
        frete?.price ? Number(String(frete.price).replace(',', '.')) : null,
        'PENDENTE'
      ]
    );

    res.json({ success: true, id_pedido: result.insertId });
  } catch (err) {
    console.error('Erro ao salvar venda:', err);
    res.status(500).json({ success: false, erro: 'Erro ao salvar venda' });
  }
});



app.get('/api/vendas', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM vendas ORDER BY data_pedido DESC');
    // Parseia o campo itens_pedido para JSON antes de enviar ao frontend
    const vendas = rows.map(row => ({
      ...row,
      itens_pedido: row.itens_pedido ? JSON.parse(row.itens_pedido) : []
    }));
    res.json(vendas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar vendas' });
  }
});

// Atualizar status da venda
app.put('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  const { status_pedido } = req.body;

  try {
    await db.promise().query(
      'UPDATE vendas SET status_pedido = ? WHERE id_pedido = ?',
      [status_pedido, id]
    );
    res.json({ success: true, mensagem: 'Status da venda atualizado.' });
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ erro: 'Erro ao atualizar status da venda.' });
  }
});

// Rota para retornar o produto em destaque (se houver)
app.get('/api/produto-destaque', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM produtos WHERE destaque = 1 LIMIT 1"
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Nenhum produto em destaque encontrado.' });
    }
    const produto = rows[0];
    produto.imagemUrl = produto.imagem
      ? `${req.protocol}://${req.headers.host}/uploads/produtos/${produto.imagem}`
      : null;
    res.json(produto);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar produto em destaque.' });
  }
});

// Deletar venda
app.delete('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('DELETE FROM vendas WHERE id_pedido = ?', [id]);
    res.json({ success: true, mensagem: 'Venda deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({ erro: 'Erro ao deletar venda.' });
  }
});


/* ===========================================
   ORÇAMENTO ONLINE: CONFIG + MATRIZ DE PREÇOS
   =========================================== */
/** GET config do produto (campos do produto + buckets) */

app.get('/api/produtos/:id/quote-config', async (req, res) => {
  const { id } = req.params;
  try {
    const [[prod]] = await db.promise().query(
      `SELECT id, aceita_orcamento, modo_precificacao, preco_unidade,
              largura_min_cm, altura_min_cm, largura_max_cm, altura_max_cm, incremento_cm,
              upload_obrigatorio,
              preco_cm2_100, preco_cm2_500, preco_cm2_1000,
              preco_m2_100, preco_m2_500, preco_m2_1000
         FROM produtos WHERE id = ?`, [id]
    );
    if (!prod) return res.status(404).json({ erro: 'Produto não encontrado' });

    const [buckets] = await db.promise().query(
      `SELECT id_bucket, label_tamanho, area_max_cm2, preco_100, preco_500, preco_1000
         FROM produto_preco_buckets
        WHERE id_produto = ?
        ORDER BY area_max_cm2 ASC`, [id]
    );

    res.json({ config: prod, buckets });
  } catch (err) {
    console.error('[QUOTE CONFIG][GET] Err:', err);
    res.status(500).json({ erro: 'Erro ao buscar configuração.' });
  }
});

/** PUT config (campos do produto + preços por área) */
app.put('/api/produtos/:id/quote-config', async (req, res) => {
  const { id } = req.params;
  const {
    aceita_orcamento,
    modo_precificacao,
    largura_min_cm, altura_min_cm,
    largura_max_cm, altura_max_cm,
    incremento_cm,
    upload_obrigatorio,
    preco_unidade,
    preco_cm2_100, preco_cm2_500, preco_cm2_1000,
    preco_m2_100, preco_m2_500, preco_m2_1000
  } = req.body;

  try {
    await db.promise().query(
      `UPDATE produtos SET 
         aceita_orcamento   = ?,
         modo_precificacao  = ?,
         largura_min_cm     = ?,
         altura_min_cm      = ?,
         largura_max_cm     = ?,
         altura_max_cm      = ?,
         incremento_cm      = ?,
         upload_obrigatorio = ?,
         preco_unidade      = ?,
         preco_cm2_100      = ?,
         preco_cm2_500      = ?,
         preco_cm2_1000     = ?,
         preco_m2_100       = ?,
         preco_m2_500       = ?,
         preco_m2_1000      = ?
       WHERE id = ?`,
      [
        aceita_orcamento ? 1 : 0,
        modo_precificacao || 'AREA',
        numOrNull(largura_min_cm), numOrNull(altura_min_cm),
        numOrNull(largura_max_cm), numOrNull(altura_max_cm),
        numOrNull(incremento_cm),
        upload_obrigatorio ? 1 : 0,
        preco_unidade || 'CM2',
        numOrNull(preco_cm2_100),
        numOrNull(preco_cm2_500),
        numOrNull(preco_cm2_1000),
        numOrNull(preco_m2_100),
        numOrNull(preco_m2_500),
        numOrNull(preco_m2_1000),
        id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[QUOTE CONFIG][PUT] Err:', err);
    res.status(500).json({ erro: 'Erro ao salvar configuração.' });
  }
});

/** LIST buckets */
app.get('/api/produtos/:id/price-buckets', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT id_bucket, label_tamanho, area_max_cm2, preco_100, preco_500, preco_1000
         FROM produto_preco_buckets WHERE id_produto = ?
        ORDER BY area_max_cm2 ASC`, [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[BUCKET][LIST] Err:', err);
    res.status(500).json({ erro: 'Erro ao buscar buckets.' });
  }
});

/** ADD bucket */
app.post('/api/produtos/:id/price-buckets', async (req, res) => {
  const { id } = req.params;
  const { label_tamanho, area_max_cm2, preco_100, preco_500, preco_1000 } = req.body;

  if (!area_max_cm2 || !preco_100 || !preco_500 || !preco_1000) {
    return res.status(400).json({ erro: 'Campos obrigatórios: area_max_cm2, preco_100, preco_500, preco_1000' });
  }

  try {
    const [r] = await db.promise().query(
      `INSERT INTO produto_preco_buckets 
         (id_produto, label_tamanho, area_max_cm2, preco_100, preco_500, preco_1000)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, label_tamanho || null, toNumber(area_max_cm2), toNumber(preco_100), toNumber(preco_500), toNumber(preco_1000)]
    );
    res.json({ success: true, id_bucket: r.insertId });
  } catch (err) {
    console.error('[BUCKET][ADD] Err:', err);
    res.status(500).json({ erro: 'Erro ao adicionar bucket.' });
  }
});

/** UPDATE bucket */
app.put('/api/price-buckets/:id_bucket', async (req, res) => {
  const { id_bucket } = req.params;
  const { label_tamanho, area_max_cm2, preco_100, preco_500, preco_1000 } = req.body;

  try {
    await db.promise().query(
      `UPDATE produto_preco_buckets SET
         label_tamanho = ?,
         area_max_cm2  = ?,
         preco_100     = ?,
         preco_500     = ?,
         preco_1000    = ?
       WHERE id_bucket = ?`,
      [label_tamanho || null, toNumber(area_max_cm2), toNumber(preco_100), toNumber(preco_500), toNumber(preco_1000), id_bucket]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[BUCKET][UPDATE] Err:', err);
    res.status(500).json({ erro: 'Erro ao atualizar bucket.' });
  }
});

/** DELETE bucket */
app.delete('/api/price-buckets/:id_bucket', async (req, res) => {
  const { id_bucket } = req.params;
  try {
    await db.promise().query('DELETE FROM produto_preco_buckets WHERE id_bucket = ?', [id_bucket]);
    res.json({ success: true });
  } catch (err) {
    console.error('[BUCKET][DELETE] Err:', err);
    res.status(500).json({ erro: 'Erro ao deletar bucket.' });
  }
});

/** SIMULAR preço: encaixe por área + tier de quantidade */
app.post('/api/orcamento/simular', async (req, res) => {
  try {
    const { id_produto, largura_cm, altura_cm, quantidade } = req.body;

    if (!id_produto || !largura_cm || !altura_cm || !quantidade) {
      return res.status(400).json({ erro: 'Campos obrigatórios: id_produto, largura_cm, altura_cm, quantidade' });
    }

    const [[prod]] = await db.promise().query(
      `SELECT aceita_orcamento, modo_precificacao, preco_unidade,
              preco_cm2_100, preco_cm2_500, preco_cm2_1000,
              preco_m2_100, preco_m2_500, preco_m2_1000,
              largura_min_cm, altura_min_cm, largura_max_cm, altura_max_cm
         FROM produtos WHERE id = ?`, [id_produto]
    );
    if (!prod || !prod.aceita_orcamento) return res.status(400).json({ erro: 'Produto não aceita orçamento.' });

    // valida limites
    if (prod.largura_min_cm && largura_cm < prod.largura_min_cm)  return res.status(400).json({ erro: 'Largura abaixo do mínimo.' });
    if (prod.altura_min_cm  && altura_cm  < prod.altura_min_cm)   return res.status(400).json({ erro: 'Altura abaixo do mínimo.' });
    if (prod.largura_max_cm && largura_cm > prod.largura_max_cm)  return res.status(400).json({ erro: 'Largura acima do máximo.' });
    if (prod.altura_max_cm  && altura_cm  > prod.altura_max_cm)   return res.status(400).json({ erro: 'Altura acima do máximo.' });
    if (quantidade < 100) return res.status(400).json({ erro: 'Quantidade mínima é 100.' });

    const area_cm2 = Number(largura_cm) * Number(altura_cm);
    const area_m2 = area_cm2 / 10000;

    let preco_unit = null;
    if (prod.modo_precificacao === 'AREA') {
      if (prod.preco_unidade === 'CM2') {
        if (quantidade >= 1000)      preco_unit = Number(prod.preco_cm2_1000);
        else if (quantidade >= 500)  preco_unit = Number(prod.preco_cm2_500);
        else                         preco_unit = Number(prod.preco_cm2_100);
      } else {
        if (quantidade >= 1000)      preco_unit = Number(prod.preco_m2_1000);
        else if (quantidade >= 500)  preco_unit = Number(prod.preco_m2_500);
        else                         preco_unit = Number(prod.preco_m2_100);
      }
    }

    if (!preco_unit) return res.status(422).json({ erro: 'Tabela de preços não configurada.' });

    const total = Number((preco_unit * (prod.preco_unidade === 'CM2' ? area_cm2 : area_m2) * quantidade).toFixed(2));

    res.json({
      ok: true,
      preco_mode: prod.preco_unidade === 'CM2' ? 'AREA_CM2' : 'AREA_M2',
      tier_aplicado: quantidade >= 1000 ? '1000+' : (quantidade >= 500 ? '500-999' : '100-499'),
      preco_unit,
      quantidade,
      total,
      area_cm2,
      area_m2
    });
  } catch (err) {
    console.error('[SIMULAR][POST] Err:', err);
    res.status(500).json({ erro: 'Erro ao simular orçamento.' });
  }
});


/* ===========================================
   UPLOAD DE ARTES DOS PEDIDOS
   =========================================== */

// Cria pasta uploads/artes se não existir
const artesDir = path.join(__dirname, 'uploads', 'artes');
ensureDir(artesDir);

// Storage para salvar a arte com nome único
const storageArtes = multer.diskStorage({
  destination: (req, file, cb) => cb(null, artesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pedido_${req.params.id}_${Date.now()}${ext}`);
  }
});

const uploadArte = multer({ storage: storageArtes });

// Servir as artes estaticamente
app.use('/uploads/artes', express.static(artesDir));

/**
 * POST /api/vendas/:id/arte
 * Upload da arte vinculada a um pedido
 * Body: multipart/form-data { arquivo }
 */
app.post('/api/vendas/:id/arte', uploadArte.single('arquivo'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo não enviado.' });
    }

    const relativePath = `uploads/artes/${req.file.filename}`;
    const url = `${req.protocol}://${req.headers.host}/${relativePath}`;

    await db.promise().query(
      'UPDATE vendas SET arte_pedido = ? WHERE id_pedido = ?',
      [relativePath, id]
    );

    res.json({ success: true, url });
  } catch (err) {
    console.error('[ARTE][UPLOAD] Err:', err);
    res.status(500).json({ erro: 'Erro ao salvar arte do pedido.' });
  }
});




const ip = '0.0.0.0'; // Permite conexões externas

app.listen(port, '0.0.0.0', () => {
  console.log('Servidor rodando');
});
