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


const app = express();
const port = process.env.PORT || 2000;


const allowedOrigins = ['http://localhost:4200', 'http://192.168.99.105:5000/api'];

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



const ip = '0.0.0.0'; // Permite conexões externas

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://192.168.99.105:${port}`);
});
