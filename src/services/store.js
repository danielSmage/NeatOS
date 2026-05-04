const Store = require('electron-store');

const schema = {
  history: {
    type: 'array',
    default: []
  },
  rules: {
    type: 'object',
    default: {
      Capturas: ['screenshot', 'print', 'captura'],
      Financeiro: ['invoice', 'boleto', 'fatura', 'recibo'],
      Instaladores: ['setup', 'install', 'installer', 'update']
    }
  },
  theme: {
    type: 'string',
    default: 'dark'
  },
  autoStart: {
    type: 'boolean',
    default: false
  },
  watchFolders: {
    type: 'array',
    default: []
  }
};

const store = new Store({ schema });

module.exports = store;
