import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  apiUrl: 'http://192.168.99.100:5000/api' // Coloque o IP do seu PC aqui!
};
