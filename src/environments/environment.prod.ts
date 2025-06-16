import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  apiUrl: 'https://backend.haretable.com.br' // Coloque o IP do seu PC aqui!
};
