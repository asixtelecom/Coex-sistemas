import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";
  
  // Hardcode origin for reliability
  let origin = "https://coexsistemas.techvoz.com.br";

  let primaryColor = "#2563eb";
  let companyName = "";
  let welcomeTitle = "Olá! Como podemos ajudar?";
  let welcomeSubtitle = "";
  let avatarUrl = "";
  let position = "right";

  if (token) {
    try {
      const { data } = await supabase
        .from("channels")
        .select("config")
        .eq("id", token)
        .eq("type", "webchat")
        .maybeSingle();

      if (data?.config) {
        const cfg = data.config as Record<string, unknown>;
        primaryColor = (cfg.primary_color as string) || primaryColor;
        companyName = (cfg.company_name as string) || "";
        welcomeTitle = (cfg.welcome_title as string) || welcomeTitle;
        welcomeSubtitle = (cfg.welcome_subtitle as string) || "";
        avatarUrl = (cfg.avatar_url as string) || "";
        position = (cfg.position as string) || "right";
      }
    } catch {
      // Use defaults
    }
  }

  const cfg = JSON.stringify({
    origin,
    token,
    primaryColor,
    companyName,
    welcomeTitle,
    welcomeSubtitle,
    avatarUrl,
    position,
  });

  const script = `(function(){var c=${cfg};var o=c.origin,t=c.token,pc=c.primaryColor,cn=c.companyName,wt=c.welcomeTitle,ws=c.welcomeSubtitle,au=c.avatarUrl,po=c.position;

function isLightColor(hex){hex=hex.replace('#','');var r=parseInt(hex.substring(0,2),16);var g=parseInt(hex.substring(2,4),16);var b=parseInt(hex.substring(4,6),16);return(r*299+g*587+b*114)/1000>180}
var textColor=isLightColor(pc)?'#212529':'#fff';

function applyPhoneMask(v){v=v.replace(/\\D/g,'');if(v.length<=11){v=v.replace(/(\\d{2})(\\d)/,'($1) $2');v=v.replace(/(\\d)(\\d{4})$/,'$1-$2')}return v}

function formatTime(ds){var d=new Date(ds);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}

function getVisitorId(){var k='wc-visitor-id-'+t;var id=localStorage.getItem(k);if(!id){id='wc-'+Date.now()+'-'+Math.random().toString(36).substring(2,15);localStorage.setItem(k,id)}return id}
var visitorId=getVisitorId();

function loadUserData(){var k='wc-user-data-'+t;var s=localStorage.getItem(k);if(s){try{return JSON.parse(s)}catch(e){return{name:'',phone:''}}}return{name:'',phone:''}}
function saveUserData(){localStorage.setItem('wc-user-data-'+t,JSON.stringify(userData))}
var userData=loadUserData();

var s=document.createElement('style');
s.textContent=[
'.wc-btn{position:fixed;bottom:20px;'+po+':20px;z-index:999999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transition:transform .2s;background:'+pc+'}',
'.wc-btn:hover{transform:scale(1.05)}',
'.wc-btn svg{width:24px;height:24px;color:'+textColor+'}',
'.wc-preview{position:fixed;bottom:90px;'+po+':20px;z-index:999997;display:flex;align-items:flex-end;gap:12px;animation:wcs .3s ease-out}',
'.wc-preview-bubble{background:#fff;padding:12px 16px;border-radius:16px;border-bottom-left-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:260px}',
'.wc-preview-title{font-weight:600;font-size:14px;color:#212529;margin-bottom:4px}',
'.wc-preview-text{font-size:13px;color:#495057;margin:0}',
'.wc-preview-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:'+pc+';display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:'+textColor+';flex-shrink:0}',
'.wc-preview-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}',
'.wc-window{position:fixed;bottom:90px;'+po+':20px;z-index:999998;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:none;flex-direction:column;background:#fff;animation:wcs .3s ease-out}',
'.wc-window.open{display:flex}',
'@keyframes wcs{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
'.wc-hdr{padding:16px;color:'+textColor+';display:flex;align-items:center;gap:12px;background:'+pc+'}',
'.wc-ha{width:40px;height:40px;border-radius:50%;object-fit:cover;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:'+textColor+'}',
'.wc-hi{flex:1}',
'.wc-hn{font-weight:600;font-size:14px}',
'.wc-hs{font-size:11px;opacity:.8}',
'.wc-x{background:none;border:none;color:'+textColor+';cursor:pointer;padding:4px;opacity:.7;font-size:20px}',
'.wc-x:hover{opacity:1}',
'.wc-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f8f9fa}',
'.wc-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.4;word-wrap:break-word;animation:wcm .2s ease-out}',
'.wc-msg.bot{background:#fff;color:#212529;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,0.06)}',
'.wc-msg.user{background:'+pc+';color:'+textColor+';border-bottom-right-radius:4px;align-self:flex-end}',
'.wc-msg.agent{background:#e8f5e9;color:#1b5e20;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,0.06)}',
'.wc-msg-t{font-size:10px;opacity:.5;margin-top:4px;text-align:right}',
'@keyframes wcm{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
'.wc-inp{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #e9ecef}',
'.wc-i{flex:1;border:1px solid #dee2e6;border-radius:24px;padding:10px 16px;font-size:13px;outline:none;transition:border-color .2s}',
'.wc-i:focus{border-color:'+pc+'}',
'.wc-snd{width:40px;height:40px;border-radius:50%;border:none;background:'+pc+';color:'+textColor+';cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s;flex-shrink:0}',
'.wc-snd:hover{opacity:.85}',
'.wc-snd svg{width:18px;height:18px}',
'.wc-hidden{display:none!important}',
'.wc-svc{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
'.wc-svc-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border:1px solid #e9ecef;border-radius:12px;cursor:pointer;transition:all .2s;text-align:left;font-size:13px;color:#212529}',
'.wc-svc-btn:hover{border-color:'+pc+';background:'+pc+'08;transform:translateX(4px)}',
'.wc-svc-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center}',
'.wc-svc-label{font-weight:500;line-height:1.3}',
'.wc-svc-desc{font-size:11px;color:#6c757d;margin-top:1px}',
'.wc-welcome{text-align:center;padding:8px 0 4px}',
'.wc-welcome-title{font-size:15px;font-weight:600;color:#212529;line-height:1.4}',
'.wc-welcome-sub{font-size:12px;color:#6c757d;margin-top:4px}'
].join('');
document.head.appendChild(s);

// ===== Preview bubble =====
var preview=document.createElement('div');
preview.className='wc-preview';
var pvA=document.createElement('div');
pvA.className='wc-preview-avatar';
if(au){var pvI=document.createElement('img');pvI.src=au;pvA.appendChild(pvI)}else{pvA.textContent=cn?cn.charAt(0):'C'}
var pvB=document.createElement('div');
pvB.className='wc-preview-bubble';
var pvT=document.createElement('div');
pvT.className='wc-preview-title';
pvT.textContent=cn||'Chat';
var pvTx=document.createElement('div');
pvTx.className='wc-preview-text';
pvTx.textContent=wt;
pvB.appendChild(pvT);pvB.appendChild(pvTx);
preview.appendChild(pvA);preview.appendChild(pvB);
document.body.appendChild(preview);

// ===== FAB button =====
var btn=document.createElement('button');
btn.className='wc-btn';
btn.setAttribute('aria-label','Abrir chat');
btn.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
document.body.appendChild(btn);

// ===== Chat window =====
var win=document.createElement('div');
win.className='wc-window';

// Header
var hd=document.createElement('div');hd.className='wc-hdr';
var ha=document.createElement('div');ha.className='wc-ha';
if(au){var hi=document.createElement('img');hi.className='wc-ha';hi.src=au;hd.appendChild(hi)}else{ha.textContent=cn?cn.charAt(0):'C';hd.appendChild(ha)}
var hii=document.createElement('div');hii.className='wc-hi';
var hn=document.createElement('div');hn.className='wc-hn';hn.textContent=cn||'Chat';
var hs=document.createElement('div');hs.className='wc-hs';hs.textContent='Online';
hii.appendChild(hn);hii.appendChild(hs);hd.appendChild(hii);
var cx=document.createElement('button');cx.className='wc-x';cx.textContent='\u00d7';
cx.onclick=function(){win.classList.remove('open');btn.style.display='flex';preview.classList.remove('wc-hidden')};
hd.appendChild(cx);win.appendChild(hd);

// Messages area
var ms=document.createElement('div');ms.className='wc-msgs';ms.id='wc-msgs';

// Input area
var ip=document.createElement('div');ip.className='wc-inp';
var inp=document.createElement('input');inp.className='wc-i';inp.id='wc-i';inp.placeholder='Digite sua mensagem...';
var snd=document.createElement('button');snd.className='wc-snd';snd.id='wc-snd';
snd.innerHTML='<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>';

// ===== State =====
var flowState = 'idle'; // idle | services | name | phone | chat
var selectedService = '';
var lastMessageTime = null;
var messagesLoaded = false;
var pollInterval = null;
var phoneMaskListener = null;

var services = [
  { icon: '\ud83c\udfe0', label: 'Mudan\u00e7as Residenciais', desc: 'Resid\u00eancias, apartamentos e casas' },
  { icon: '\ud83c\udfe2', label: 'Mudan\u00e7as Comerciais', desc: 'Escrit\u00f3rios e empresas' },
  { icon: '\ud83d\ude9b', label: 'Mudan\u00e7as Interestaduais', desc: 'Para qualquer estado do Brasil' },
  { icon: '\ud83d\udce6', label: 'Self Storage', desc: 'Guarda-m\u00f3veis e dep\u00f3sito seguro' },
  { icon: '\ud83d\ude9a', label: 'Transportes de Carga', desc: 'Cargas pesadas e fr\u00e1geis' }
];

// ===== Message helpers =====
function addMessage(text, type, time) {
  var mb = document.createElement('div');
  mb.className = 'wc-msg ' + type;
  var contentDiv = document.createElement('div');
  contentDiv.innerHTML = text;
  mb.appendChild(contentDiv);
  var dt = document.createElement('div');
  dt.className = 'wc-msg-t';
  dt.textContent = time ? formatTime(time) : 'Agora';
  mb.appendChild(dt);
  ms.appendChild(mb);
  ms.scrollTop = ms.scrollHeight;
}
function addBotMessage(t, time) { addMessage(t, 'bot', time); }
function addUserMessage(t, time) { addMessage(t, 'user', time); }
function addAgentMessage(t, time) { addMessage(t, 'agent', time); }
function clearMessages() { ms.innerHTML = ''; }

// ===== Services panel =====
function showServices() {
  flowState = 'services';
  inp.placeholder = 'Selecione um servi\u00e7o...';
  var welcomeName = cn || 'nossa empresa';
  addBotMessage('<div class="wc-welcome"><div class="wc-welcome-title">Ol\u00e1 \ud83d\udc4b Seja muito bem-vindo (a) <br><strong>\u00e0 ' + welcomeName + '</strong></div><div class="wc-welcome-sub">Como podemos lhe ajudar hoje?</div></div><div class="wc-svc" id="wc-svc"></div>');
  var svcContainer = document.getElementById('wc-svc');
  services.forEach(function(svc) {
    var b = document.createElement('button');
    b.className = 'wc-svc-btn';
    b.innerHTML = '<span class="wc-svc-icon">' + svc.icon + '</span><span class="wc-svc-label">' + svc.label + '<span class="wc-svc-desc">' + svc.desc + '</span></span>';
    b.onclick = function() { selectService(svc.label); };
    svcContainer.appendChild(b);
  });
  ms.scrollTop = ms.scrollHeight;
}

function selectService(label) {
  selectedService = label;
  addUserMessage(label);
  // Disable all service buttons
  var btns = document.querySelectorAll('.wc-svc-btn');
  for (var i = 0; i < btns.length; i++) { btns[i].disabled = true; btns[i].style.opacity = '0.5'; btns[i].style.cursor = 'default'; }
  // Send service selection to server
  fetch(o+'/api/webchat/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,text:'Servi\u00e7o selecionado: '+label,sender_name:userData.name||'Cliente',visitor_id:visitorId,phone:userData.phone})}).catch(function(){});
  // Ask for name
  flowState = 'name';
  addBotMessage('Que ótimo! Para continuar, qual \u00e9 o seu nome?');
  inp.placeholder = 'Digite seu nome...';
  inp.focus();
}

// ===== Flow =====
function handleNextStep() {
  var v = inp.value.trim();
  if (!v) return;

  if (flowState === 'name') {
    userData.name = v;
    saveUserData();
    addUserMessage(v);
    inp.value = '';
    fetch(o+'/api/webchat/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,text:v,sender_name:userData.name,visitor_id:visitorId,phone:userData.phone})}).catch(function(){});
    flowState = 'phone';
    addBotMessage('Prazer, ' + v + '! Qual o seu telefone para contato imediato?');
    inp.placeholder = '(00) 0000-0000';
    if (phoneMaskListener) { inp.removeEventListener('input', phoneMaskListener); }
    phoneMaskListener = function(e) { e.target.value = applyPhoneMask(e.target.value); };
    inp.addEventListener('input', phoneMaskListener);
    inp.focus();
  } else if (flowState === 'phone') {
    userData.phone = v;
    saveUserData();
    addUserMessage(v);
    inp.value = '';
    if (phoneMaskListener) { inp.removeEventListener('input', phoneMaskListener); phoneMaskListener = null; }
    // Send contact data to server
    var msg = '\ud83d\udccc Novo cliente pelo webchat\n\n' + selectedService + '\n\nNome: ' + userData.name + '\nTelefone: ' + userData.phone;
    fetch(o+'/api/webchat/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,text:msg,sender_name:userData.name,visitor_id:visitorId,phone:userData.phone})}).catch(function(){});
    addBotMessage('Perfeito, ' + userData.name + '! \ud83d\udcdd <strong>Dados registrados:</strong><br>\ud83d\udccc Servi\u00e7o: ' + selectedService + '<br>\ud83d\udc64 Nome: ' + userData.name + '<br>\ud83d\udcde Telefone: ' + userData.phone + '<br><br>Aguarde, um atendente ir\u00e1 entrar em contato em instantes! \u2728');
    inp.placeholder = 'Digite sua mensagem...';
    flowState = 'chat';
    setTimeout(loadMessages, 500);
  } else if (flowState === 'chat') {
    addUserMessage(v);
    inp.value = '';
    fetch(o+'/api/webchat/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,text:v,sender_name:userData.name,visitor_id:visitorId,phone:userData.phone})}).catch(function(){});
  }
}

snd.onclick = handleNextStep;
inp.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); handleNextStep(); } };

ip.appendChild(inp); ip.appendChild(snd);
win.appendChild(ip);
document.body.appendChild(win);

// Drag functionality - makes the widget draggable with mouse
var dragOffsetX = 0, dragOffsetY = 0;
var dragStartX = 0, dragStartY = 0;
var isDragging = false, wasDragged = false;

function dragStart(e) {
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  isDragging = true;
  wasDragged = false;
  btn.style.transition = 'none';
  preview.style.animation = 'none';
  win.style.animation = 'none';
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
}

document.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  var dx = e.clientX - dragStartX;
  var dy = e.clientY - dragStartY;
  dragOffsetX += dx;
  dragOffsetY += dy;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) wasDragged = true;
  var t = 'translate(' + dragOffsetX + 'px,' + dragOffsetY + 'px)';
  btn.style.transform = t;
  preview.style.transform = t;
  win.style.transform = t;
});

document.addEventListener('mouseup', function() {
  if (!isDragging) return;
  isDragging = false;
  btn.style.transition = '';
  preview.style.animation = '';
  win.style.animation = '';
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

btn.addEventListener('mousedown', dragStart);
preview.addEventListener('mousedown', dragStart);
hd.addEventListener('mousedown', function(e) {
  if (e.target.classList.contains('wc-x')) return;
  dragStart(e);
});

btn.onclick = function() {
  preview.classList.add('hidden');
  win.classList.toggle('open');
  btn.style.display = win.classList.contains('open') ? 'none' : 'flex';
  if (win.classList.contains('open')) {
    setTimeout(function() { inp.focus(); }, 100);
    // Load messages when opening
    loadMessages();
    // Start polling
    if (!pollInterval) {
      pollInterval = setInterval(loadMessages, 3000);
// ===== Load messages =====
function loadMessages() {
  var url = o + '/api/webchat/messages/' + encodeURIComponent(visitorId) + '?token=' + encodeURIComponent(t);
  if (lastMessageTime) { url += '&since=' + encodeURIComponent(lastMessageTime); }
  fetch(url).then(function(r){return r.json()}).then(function(data){
    if (data.messages && data.messages.length > 0) {
      if (!messagesLoaded) {
        clearMessages();
        data.messages.forEach(function(msg){
          if (msg.sender_type==='agent') addAgentMessage(msg.content_text,msg.created_at);
          else if (msg.sender_type==='contact') addUserMessage(msg.content_text,msg.created_at);
          else addBotMessage(msg.content_text,msg.created_at);
          lastMessageTime = msg.created_at;
        });
        flowState = 'chat';
        inp.placeholder = 'Digite sua mensagem...';
      } else {
        data.messages.forEach(function(msg){
          if (msg.sender_type==='agent') addAgentMessage(msg.content_text,msg.created_at);
          lastMessageTime = msg.created_at;
        });
      }
      messagesLoaded = true;
    } else if (!messagesLoaded && flowState === 'idle') {
      showServices();
    }
  }).catch(function(e){console.error('Failed to load messages',e)});
}

// ===== Open/close =====
function openChat() {
  preview.classList.add('wc-hidden');
  win.classList.add('open');
  btn.style.display = 'none';
  setTimeout(function(){inp.focus()},100);
  loadMessages();
  if (!pollInterval) pollInterval = setInterval(loadMessages, 3000);
}
function closeChat() {
  win.classList.remove('open');
  btn.style.display = 'flex';
  preview.classList.remove('wc-hidden');
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

// Prevent click handlers from firing after a drag
var origBtnClick = btn.onclick;
btn.onclick = function(e) {
  if (wasDragged) { wasDragged = false; return; }
  origBtnClick && origBtnClick.call(this, e);
};

var origPreviewClick = preview.onclick;
preview.onclick = function(e) {
  if (wasDragged) { wasDragged = false; return; }
  origPreviewClick && origPreviewClick.call(this, e);
};

// Start the flow after a brief delay only if no messages yet
setTimeout(function() {
btn.onclick = function() { if (win.classList.contains('open')) closeChat(); else openChat(); };
preview.onclick = function() { openChat(); };

// ===== Init =====
setTimeout(function(){
  loadMessages();
  setTimeout(function(){
    if (!messagesLoaded) {
      if (userData.name && userData.phone) {
        flowState = 'chat';
        inp.placeholder = 'Digite sua mensagem...';
      } else {
        showServices();
      }
    }
  }, 500);
}, 300);
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
