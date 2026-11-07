import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function renderer(desktop=false){
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.style={};this.dataset={};this.attributes={};this.hidden=false;this.value='';this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),remove:name=>this.classes.delete(name),add:name=>this.classes.add(name),contains:name=>this.classes.has(name)};}
  setAttribute(k,v){this.attributes[k]=v} append(...elements){this.children.push(...elements)} appendChild(el){this.children.push(el)} replaceChildren(...els){this.children=els} remove(){this.removed=true} addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)}
  fire(name,data={}){for(const fn of this.handlers[name]||[])fn(data)}
  querySelector(){return this.title??=new Element('span')} focus(){} select(){}
  canGoBack(){return this.back??false} canGoForward(){return this.forward??false} goBack(){this.backCalls=(this.backCalls||0)+1} goForward(){this.forwardCalls=(this.forwardCalls||0)+1} reload(){this.reloadCalls=(this.reloadCalls||0)+1}
 }
 const elements=Object.fromEntries(['tabs','webviews-container','url-bar','back-btn','forward-btn','reload-btn','go-btn','new-tab-btn'].map(id=>[id,new Element(id)])),created=[],opened=[];let newTab;
 const window={open:(...args)=>opened.push(args),...(desktop?{browserAPI:{nativeTabs:true,onNewTab:fn=>{newTab=fn}}}:{})};
 const document={getElementById:id=>elements[id],createElement:tag=>{const e=new Element(tag);created.push(e);return e},addEventListener(){}};
 const context=vm.createContext({window,document,URL,console});vm.runInContext(read('script/renderer.js'),context);
 return {context,elements,created,opened,newTab:url=>newTab(url),run:code=>vm.runInContext(code,context)};
}
test('loaded web pages have no active invisible notice intercepting clicks',()=>{
 const ui=renderer();assert.equal(ui.run('tabs[0].notice.hidden'),false);ui.run("navigate('https://example.com')");assert.equal(ui.run('tabs[0].notice.hidden'),true);assert.equal(ui.run('tabs[0].iframe.style.display'),'');
 const frame=ui.created.find(e=>e.tag==='iframe');assert.ok(frame.attributes.sandbox.includes('allow-same-origin'));assert.ok(frame.attributes.sandbox.includes('allow-pointer-lock'));assert.equal(ui.opened.length,0);
 ui.run("navigate('https://google.fr')");assert.equal(ui.run('tabs[0].notice.hidden'),false);ui.run("navigate('https://example.org')");assert.equal(ui.run('tabs[0].notice.hidden'),true);
});
test('desktop Google navigation stays in a native tab and popups use the bridge',()=>{
 const ui=renderer(true);ui.run("navigate('https://google.fr')");assert.equal(ui.run('tabs[0].notice.hidden'),true);assert.equal(ui.created.find(e=>e.tag==='webview').src,'https://google.fr/');ui.newTab('https://example.org');assert.equal(ui.run('tabs.length'),2);ui.newTab('file:///private');assert.equal(ui.run('tabs.length'),2);assert.equal(ui.opened.length,0);
});
test('desktop Back and Forward follow Chromium without appending a new history entry',()=>{
 const ui=renderer(true);ui.run("navigate('https://example.com')");const frame=ui.created.find(e=>e.tag==='webview');frame.back=true;frame.forward=true;frame.fire('dom-ready');assert.equal(ui.elements['back-btn'].disabled,false);
 ui.run('goBack();goForward()');assert.equal(frame.backCalls,1);assert.equal(frame.forwardCalls,1);const count=ui.run('tabs[0].history.length');frame.fire('did-navigate',{url:'https://example.org/redirect'});assert.equal(ui.run('tabs[0].history.length'),count);assert.equal(ui.elements['url-bar'].value,'https://example.org/redirect');frame.fire('did-navigate',{url:'about:blank'});assert.equal(ui.run('tabs[0].currentUrl'),'warlike:home');assert.equal(ui.run('tabs[0].notice.hidden'),false);
});
test('local development addresses with ports are navigated rather than searched',()=>{
 const ui=renderer();for(const url of ['localhost:8000','127.0.0.1:4173/test','[::1]:8080']){ui.run('navigate('+JSON.stringify(url)+')');assert.equal(ui.run('getActiveTab().currentUrl'),new URL('http://'+url).href)}
});
test('main process routes allowed guest popups into WarLike and rejects privileged URLs',()=>{
 const host=new EventEmitter(),messages=[];host.setWindowOpenHandler=fn=>{host.open=fn};host.send=(...args)=>messages.push(args);const windows=[];
 class BrowserWindow{constructor(options){this.options=options;this.webContents=host;windows.push(this)} loadFile(){} static getAllWindows(){return windows}}
 const app={whenReady:()=>({then:fn=>fn()}),on(){},quit(){}};
 vm.runInNewContext(read('script/main.js'),{require:name=>name==='electron'?{app,BrowserWindow}:name==='path'?{join:(...p)=>p.join('/')}:null,__dirname:'/app/script',URL,process:{platform:'linux'}});
 const guest=new EventEmitter();guest.setWindowOpenHandler=fn=>{guest.open=fn};host.emit('did-attach-webview',{},guest);guest.open({url:'https://example.com'});assert.equal(messages[0][0],'browser:new-tab');assert.equal(messages[0][1],'https://example.com/');guest.open({url:'file:///private'});assert.equal(messages.length,1);
 let prevented=false;guest.emit('will-navigate',{preventDefault(){prevented=true}},'javascript:alert(1)');assert.equal(prevented,true);
 const prefs={preload:'untrusted.js',nodeIntegration:true};host.emit('will-attach-webview',{preventDefault(){throw Error('should allow HTTPS')}},prefs,{src:'https://example.com'});assert.equal(prefs.preload,undefined);assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.sandbox,true);
});
