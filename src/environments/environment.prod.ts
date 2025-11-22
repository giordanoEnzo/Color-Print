import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  apiUrl: 'https://backend.haretable.com.br/api',      // para chamadas da API
  assetsUrl: 'https://backend.haretable.com.br'        // para imagens e arquivos estáticos
};