// The browser chrome receives only a validated new-tab notification.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('browserAPI',{
  version:'0.2.1',name:'WarLike Browser',nativeTabs: true,
  onNewTab(callback){
    if(typeof callback!=='function')return ()=>{};
    const listener=(_event,url)=>{if(typeof url==='string')callback(url)};
    ipcRenderer.on('browser:new-tab',listener);
    return ()=>ipcRenderer.removeListener('browser:new-tab',listener);
  }
});
