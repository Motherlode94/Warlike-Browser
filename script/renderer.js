// Chromium tabs in the desktop application; sandboxed frames on the static website.

const tabsContainer = document.getElementById('tabs');
const framesContainer = document.getElementById('webviews-container');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const goBtn = document.getElementById('go-btn');
const newTabBtn = document.getElementById('new-tab-btn');

const HOMEPAGE = 'warlike:home';
const IFRAME_BLOCKED_HOSTS = ['duckduckgo.com','bing.com','youtube.com','facebook.com','instagram.com','github.com'];
const isKnownBlocked = url => {try{const host=new URL(url).hostname.toLowerCase();return /(^|\.)google\.(?:[a-z]{2,3}\.)?[a-z]{2,3}$/.test(host)||IFRAME_BLOCKED_HOSTS.some(domain=>host===domain||host.endsWith('.'+domain))}catch{return false}};
const openExternal = url => { const safe=safeHttpUrl(url);if(safe)window.open(safe,'_blank','noopener,noreferrer'); };
const SEARCH_ENGINE = (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
const safeHttpUrl = (value) => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null; } catch { return null; } };

const isDesktop = window.browserAPI?.nativeTabs === true;
const tabs = [];
let activeTabId = null;
let nextId = 1;

// -------- Création d'onglet --------
function createTab(url = HOMEPAGE) {
  url = url === HOMEPAGE ? HOMEPAGE : safeHttpUrl(url) || HOMEPAGE;
  const id = nextId++;

  // Élément UI
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = id;
  tabEl.innerHTML = `
    <span class="tab-title">Nouvel onglet</span>
    <span class="tab-close" title="Fermer">✕</span>
  `;
  tabsContainer.appendChild(tabEl);

  // Electron uses Chromium's separate guest browsing process; Cloudflare Pages uses limited iframes.
  const iframe = document.createElement(isDesktop?'webview':'iframe');
  iframe.src = 'about:blank';
  iframe.dataset.id = id;
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  if(!isDesktop)iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups allow-downloads allow-pointer-lock');
  else iframe.setAttribute('partition','persist:warlike-browser');
  iframe.setAttribute('allow','autoplay; fullscreen; gamepad');
  iframe.setAttribute('allowfullscreen','');
  iframe.setAttribute('title','Page de navigation');
  framesContainer.appendChild(iframe);
  const notice=document.createElement('section');notice.className='browser-notice';notice.dataset.id=id;notice.hidden=true;framesContainer.appendChild(notice);

  // Objet onglet (avec historique manuel — impossible de lire history cross-origin)
  const tab = {
    id,
    tabEl,
    iframe,
    notice,
    history: [url],
    historyIndex: 0,
    nativeReady: false,
    currentUrl: url
  };

  // --- Clic onglet ---
  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
      closeTab(id);
    } else {
      activateTab(id);
    }
  });

  // --- Chargement ---
  iframe.addEventListener(isDesktop?'did-finish-load':'load', () => {
    // On ne peut pas lire le titre d'un iframe cross-origin,
    // on affiche donc le domaine à la place.
    try {
      if(tab.currentUrl===HOMEPAGE){tabEl.querySelector('.tab-title').textContent='Accueil';return}
      const u = new URL(tab.currentUrl);
      const label = u.hostname.replace(/^www\./, '') || 'Page';
      tabEl.querySelector('.tab-title').textContent = label;
    } catch (_) {
      tabEl.querySelector('.tab-title').textContent = 'Page';
    }
  });

  if(isDesktop){
    const syncNavigation=(location)=>{if(location==='about:blank'){tab.currentUrl=HOMEPAGE;showHome(tab);if(activeTabId===id){urlBar.value='';updateNavButtons()}return}const next=safeHttpUrl(location);if(!next)return;tab.currentUrl=next;
      if(activeTabId===id){urlBar.value=next;updateNavButtons()}
    };
    iframe.addEventListener('dom-ready',()=>{tab.nativeReady=true;if(activeTabId===id)updateNavButtons()});
    iframe.addEventListener('did-start-loading',()=>{if(tab.currentUrl!==HOMEPAGE)hideNotice(tab)});
    iframe.addEventListener('did-stop-loading',()=>{if(activeTabId===id)updateNavButtons()});
    iframe.addEventListener('did-navigate',e=>syncNavigation(e.url));
    iframe.addEventListener('did-navigate-in-page',e=>{if(e.isMainFrame)syncNavigation(e.url)});
    iframe.addEventListener('page-title-updated',e=>{tabEl.querySelector('.tab-title').textContent=String(e.title||'Nouvel onglet').slice(0,70)});
    iframe.addEventListener('did-fail-load',e=>{if(e.isMainFrame!==false&&e.errorCode!==-3){showNotice(tab,'Erreur de navigation',String(e.errorDescription||'Le site est inaccessible.'),tab.currentUrl)}});
  }
  tabs.push(tab);
  loadUrlInTab(tab,url);
  activateTab(id);
  return id;
}

// -------- Activation --------
function activateTab(id) {
  activeTabId = id;
  tabs.forEach(t => {
    t.tabEl.classList.toggle('active', t.id === id);
    t.iframe.classList.toggle('active', t.id === id);
    t.notice.classList.toggle('active', t.id === id);
  });
  const active = getActiveTab();
  if (active) {
    urlBar.value = active.currentUrl===HOMEPAGE?'':active.currentUrl;
    updateNavButtons();
  }
}

// -------- Fermeture --------
function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const tab = tabs[idx];
  tab.tabEl.remove();
  tab.iframe.remove();
  tab.notice.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    createTab();
  } else if (activeTabId === id) {
    const newIdx = Math.max(0, idx - 1);
    activateTab(tabs[newIdx].id);
  }
}

// -------- Utilitaires --------
function getActiveTab() {
  return tabs.find(t => t.id === activeTabId) || null;
}

function updateNavButtons() {
  const tab = getActiveTab();
  if (!tab) return;
  if(isDesktop&&tab.nativeReady){
    try{backBtn.disabled=!tab.iframe.canGoBack();forwardBtn.disabled=!tab.iframe.canGoForward();return}catch{/* guest is not ready yet */}
  }
  backBtn.disabled = tab.historyIndex <= 0;
  forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
}

function hideNotice(tab){tab.notice.replaceChildren();tab.notice.hidden=true;tab.notice.classList.remove('iframe-help');tab.iframe.style.display='';}
function showNotice(tab, heading, detail, url = null) {
 tab.notice.hidden=false;tab.notice.classList.remove('iframe-help');
 tab.iframe.style.display='none';
 tab.notice.replaceChildren();
 const title=document.createElement('h1');title.textContent=heading;
 const text=document.createElement('p');text.textContent=detail;
 tab.notice.append(title,text);
 if(url&&!isDesktop){
  const button=document.createElement('button');button.textContent='Ouvrir dans le navigateur système ↗';
  button.onclick=()=>openExternal(url);tab.notice.append(button);
 }
}
function showHome(tab){showNotice(tab,'WarLike Browser',isDesktop?'Saisis une adresse ou une recherche pour naviguer dans tes onglets Chromium WarLike.':'Saisis une adresse pour ouvrir un site compatible avec l’affichage intégré. Les sites qui refusent les iframes nécessitent la version Windows de WarLike Browser.');}
function loadUrlInTab(tab, url) {
 if(url!==HOMEPAGE)url=safeHttpUrl(url);
 if(!url)return;
 tab.currentUrl=url;
 hideNotice(tab);
 if(url===HOMEPAGE){
  tab.iframe.src='about:blank';
  showHome(tab);
 }else if(!isDesktop&&isKnownBlocked(url)){
  tab.iframe.src='about:blank';
  showNotice(tab,'Affichage intégré indisponible','Ce site limite son affichage dans les fenêtres intégrées. Il peut être ouvert dans un véritable onglet du navigateur système.',url);
 }else{
  if(isDesktop){tab.iframe.src=url;tab.notice.classList.remove('iframe-help')}else tab.iframe.src=url;
  if(isDesktop){if(activeTabId===tab.id)urlBar.value=url;return}
  // A loaded page keeps the entire viewport: no empty notice intercepts input.
 }
 if(activeTabId===tab.id)urlBar.value=url===HOMEPAGE?'':url;
}

// -------- Navigation --------
function navigate(input) {
  const tab = getActiveTab();
  if (!tab) return;

  const query = input.trim();
  if (!query) return;

  let url;
  const looksLikeUrl = /^https?:\/\//i.test(query) || /^(?:localhost|[\w-]+(?:\.[\w-]+)+|\[[0-9a-f:]+\])(?::\d{1,5})?(?:[\/?#].*)?$/i.test(query);
  if (looksLikeUrl) {
    const local=/^(?:localhost|127\.\d+\.\d+\.\d+|\[::1\])(?::|[\/?#]|$)/i.test(query);
    url = /^https?:\/\//i.test(query) ? query : (local?'http://':'https://') + query;
  } else {
    url = SEARCH_ENGINE(query);
  }

  url=safeHttpUrl(url) || SEARCH_ENGINE(query);
  // Coupe l'historique forward et ajoute la nouvelle URL
  tab.history = tab.history.slice(0, tab.historyIndex + 1);
  tab.history.push(url);
  tab.historyIndex = tab.history.length - 1;

  loadUrlInTab(tab, url);
  updateNavButtons();
}

function goBack() {
  const tab = getActiveTab();
  if(!tab)return;
  if(isDesktop&&tab.nativeReady){if(tab.iframe.canGoBack())tab.iframe.goBack();return}
  if(tab.historyIndex<=0)return;
  loadUrlInTab(tab,tab.history[--tab.historyIndex]);
  updateNavButtons();
}

function goForward() {
  const tab = getActiveTab();
  if(!tab)return;
  if(isDesktop&&tab.nativeReady){if(tab.iframe.canGoForward())tab.iframe.goForward();return}
  if(tab.historyIndex>=tab.history.length-1)return;
  loadUrlInTab(tab,tab.history[++tab.historyIndex]);
  updateNavButtons();
}

function reload() {
  const tab = getActiveTab();
  if (!tab) return;
  if(isDesktop&&tab.nativeReady&&tab.currentUrl!==HOMEPAGE){hideNotice(tab);tab.iframe.reload()}else loadUrlInTab(tab,tab.currentUrl);
}

// -------- Écouteurs boutons --------
newTabBtn.addEventListener('click', () => createTab());
backBtn.addEventListener('click', goBack);
forwardBtn.addEventListener('click', goForward);
reloadBtn.addEventListener('click', reload);
goBtn.addEventListener('click', () => navigate(urlBar.value));

urlBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate(urlBar.value);
});

// -------- Raccourcis clavier --------
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  switch (e.key.toLowerCase()) {
    case 't':
      e.preventDefault();
      createTab();
      break;
    case 'w':
      e.preventDefault();
      if (activeTabId !== null) closeTab(activeTabId);
      break;
    case 'l':
      e.preventDefault();
      urlBar.focus();
      urlBar.select();
      break;
    case 'r':
      e.preventDefault();
      reload();
      break;
  }
});

// Only the trusted desktop bridge can request new native tabs.
if(isDesktop)window.browserAPI.onNewTab?.(url=>{const safe=safeHttpUrl(url);if(safe)createTab(safe)});
// -------- Démarrage --------
createTab();
