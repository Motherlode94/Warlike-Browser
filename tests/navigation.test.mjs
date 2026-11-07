import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Browser starts on a local dashboard instead of a blocked DuckDuckGo iframe',()=>{
 const source=read('script/renderer.js');
 assert.match(source,/const HOMEPAGE = 'warlike:home'/);
 assert.match(source,/isKnownBlocked\(url\)/);
 assert.match(source,/showNotice\(tab,'Affichage intégré indisponible'/);
 assert.match(source,/window\.open\(safe,'_blank','noopener,noreferrer'\)/);
});
test('Desktop boot paths match packaged repository and navigation is sandboxed',()=>{
 const pkg=JSON.parse(read('package.json'));
 const main=read('script/main.js');
 assert.equal(pkg.main,'script/main.js');
 assert.match(main,/path\.join\(__dirname,'\.\.','index\.html'\)/);
 assert.match(main,/setWindowOpenHandler/);
 assert.match(main,/shell\.openExternal/);
 assert.match(main,/will-navigate/);
});
test('Site content remains an iframe, clearly labeled as limited',()=>{
 assert.match(read('index.html'),/webviews-container/);
 assert.match(read('script/renderer.js'),/allow-forms allow-scripts allow-popups/);
 assert.match(read('css/style.css'),/browser-notice\.active/);
});
