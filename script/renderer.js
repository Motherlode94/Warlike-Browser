// renderer.js — version pure HTML/JS (iframe)
// ⚠ Limitation : certains sites (Google, YouTube, Facebook...) refusent d'être chargés en iframe.

const tabsContainer = document.getElementById('tabs');
const framesContainer = document.getElementById('webviews-container');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const goBtn = document.getElementById('go-btn');
const newTabBtn = document.getElementById('new-tab-btn');

const HOMEPAGE = 'warlike:home';
const IFRAME_BLOCKED_HOSTS = ['duckduckgo.com','google.com','bing.com','youtube.com','facebook.com','instagram.com','github.com'];
const isKnownBlocked = url => {try{const host=new URL(url).hostname.toLowerCase();return IFRAME_BLOCKED_HOSTS.some(domain=>host===domain||host.endsWith('.'+domain))}catch{return false}};
const openExternal = url => { const safe=safeHttpUrl(url);if(safe)window.open(safe,'_blank','noopener,noreferrer'); };
const SEARCH_ENGINE = (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
const safeHttpUrl = (value) => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null; } catch { return null; } };

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

  // Iframe
  const iframe = document.createElement('iframe');
  iframe.src = 'about:blank';
  iframe.dataset.id = id;
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-popups');
  framesContainer.appendChild(iframe);
  const notice=document.createElement('section');notice.className='browser-notice';notice.dataset.id=id;framesContainer.appendChild(notice);

  // Objet onglet (avec historique manuel — impossible de lire history cross-origin)
  const tab = {
    id,
    tabEl,
    iframe,
    notice,
    history: [url],
    historyIndex: 0,
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
  iframe.addEventListener('load', () => {
    // On ne peut pas lire le titre d'un iframe cross-origin,
    // on affiche donc le domaine à la place.
    try {
      const u = new URL(tab.currentUrl);
      const label = u.hostname.replace(/^www\./, '') || 'Page';
      tabEl.querySelector('.tab-title').textContent = label;
    } catch (_) {
      tabEl.querySelector('.tab-title').textContent = 'Page';
    }
  });

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
  backBtn.disabled = tab.historyIndex <= 0;
  forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
}

function showNotice(tab, heading, detail, url = null) {
 tab.iframe.style.display='none';
 tab.notice.replaceChildren();
 const title=document.createElement('h1');title.textContent=heading;
 const text=document.createElement('p');text.textContent=detail;
 tab.notice.append(title,text);
 if(url){
  const button=document.createElement('button');button.textContent='Ouvrir dans le navigateur système ↗';
  button.onclick=()=>openExternal(url);tab.notice.append(button);
 }
}
function loadUrlInTab(tab, url) {
 if(url!==HOMEPAGE)url=safeHttpUrl(url);
 if(!url)return;
 tab.currentUrl=url;
 tab.iframe.style.display='';tab.notice.replaceChildren();
 if(url===HOMEPAGE){
  tab.iframe.src='about:blank';
  showNotice(tab,'WarLike Browser','Bienvenue. Saisis une adresse ou une recherche. Certains sites refusent les pages intégrées ; utilise le bouton d’ouverture externe pour les consulter.');
 }else if(isKnownBlocked(url)){
  tab.iframe.src='about:blank';
  showNotice(tab,'Affichage intégré indisponible','Ce site limite son affichage dans les fenêtres intégrées. Il peut être ouvert dans un véritable onglet du navigateur système.',url);
 }else{
  tab.iframe.src=url;
  const button=document.createElement('button');button.textContent='Ouvrir dans le navigateur système ↗';button.onclick=()=>openExternal(url);
  const info=document.createElement('span');info.textContent='La page reste vide ou refuse de s’ouvrir ?';
  tab.notice.append(info,button);tab.notice.classList.add('iframe-help');
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
  const looksLikeUrl = /^https?:\/\//i.test(query) || /^[\w-]+(\.[\w-]+)+([\/?#].*)?$/i.test(query);
  if (looksLikeUrl) {
    url = /^https?:\/\//i.test(query) ? query : 'https://' + query;
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
  if (!tab || tab.historyIndex <= 0) return;
  tab.historyIndex--;
  loadUrlInTab(tab, tab.history[tab.historyIndex]);
  updateNavButtons();
}

function goForward() {
  const tab = getActiveTab();
  if (!tab || tab.historyIndex >= tab.history.length - 1) return;
  tab.historyIndex++;
  loadUrlInTab(tab, tab.history[tab.historyIndex]);
  updateNavButtons();
}

function reload() {
  const tab = getActiveTab();
  if (!tab) return;
  loadUrlInTab(tab,tab.currentUrl);
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

// -------- Démarrage --------
createTab();
