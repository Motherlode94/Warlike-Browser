// preload.js — pont sécurisé entre main et renderer
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  version: '0.1.0',
  name: 'Warlike Browser',
  nativeTabs: true
});
