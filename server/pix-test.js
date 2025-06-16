const express = require('express');

const app = express();
app.use(express.json());

const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-6836621365203261-060316-bee68e8296fad6316e04b9657ff4dc83-2456453806',
    options: {
        timeout: 5000
    }
});

const payment = new Payment(client);

const body = {
	transaction_amount: 30.50,
	description: 'Teste api pix V2',
	payment_method_id: 'pix',
	payer: {
		email: 'danielleonardo@outlook.com'
	},
};

payment.create({ body }).then(console.log).catch(console.log);

const PORT = 3001;
app.listen(PORT, () => console.log(`Servidor de teste rodando na porta ${PORT}`));
