import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  apiUrl: 'http://192.168.99.103:5000/api',     // para chamadas da API
  assetsUrl: 'http://192.168.99.103:5000'        // para imagens e arquivos estáticos
};



