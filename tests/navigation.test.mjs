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

test('google.fr and regional Google domains use fallback on Pages, native browsing on Electron',()=>{
 const source=read('script/renderer.js');
 assert.match(source,/isDesktop = window\.browserAPI\?\.nativeTabs === true/);
 assert.ok(source.includes("document.createElement(isDesktop?'webview':'iframe')"));
 assert.ok(source.includes("!isDesktop&&isKnownBlocked(url)"));
 assert.match(source,/google\\\.\(\?:\[a-z\]/);
 assert.ok(source.includes("did-navigate"));
 assert.ok(read('script/preload.js').includes('nativeTabs: true'));
 assert.ok(read('script/main.js').includes('will-attach-webview'));
});

test('Windows build includes both installer and portable Chromium application',()=>{
 const manifest=JSON.parse(read('package.json'));
 assert.equal(manifest.main,'script/main.js');
 assert.equal(manifest.build.appId,'com.warlike.browser');
 assert.ok(manifest.scripts['dist:win'].includes('electron-builder'));
 assert.ok(manifest.build.win.target.some(t=>t.target==='nsis'));
 assert.ok(manifest.build.win.target.some(t=>t.target==='portable'));
 for(const file of ['index.html','css/**/*','script/**/*'])assert.ok(manifest.build.files.includes(file));
 const workflow=read('.github/workflows/windows.yml');
 assert.ok(workflow.includes('windows-latest'));
 assert.ok(workflow.includes('npm run dist:win'));
 assert.ok(workflow.includes('upload-artifact'));
});
