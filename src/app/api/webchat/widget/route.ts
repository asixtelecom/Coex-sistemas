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

// Helper function to determine if a color is light
function isLightColor(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  var brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}
var textColor = isLightColor(pc) ? '#212529' : '#fff';

// Phone mask function
function applyPhoneMask(value) {
  value = value.replace(/\\D/g, '');
  if (value.length <= 11) {
    value = value.replace(/(\\d{2})(\\d)/, '($1) $2');
    value = value.replace(/(\\d)(\\d{4})$/, '$1-$2');
  }
  return value;
}

// Format date/time
function formatTime(dateStr) {
  var d = new Date(dateStr);
  var hours = d.getHours().toString().padStart(2, '0');
  var minutes = d.getMinutes().toString().padStart(2, '0');
  return hours + ':' + minutes;
}

// Get or generate unique visitor ID
function getVisitorId() {
  var storageKey = 'wc-visitor-id-' + t;
  var id = localStorage.getItem(storageKey);
  if (!id) {
    id = 'wc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(storageKey, id);
  }
  return id;
}
var visitorId = getVisitorId();

// Load user data from localStorage
function loadUserData() {
  var storageKey = 'wc-user-data-' + t;
  var saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return { name: '', phone: '', originAddress: '', destinationAddress: '' };
    }
  }
  return { name: '', phone: '', originAddress: '', destinationAddress: '' };
}

// Save user data to localStorage
function saveUserData() {
  var storageKey = 'wc-user-data-' + t;
  localStorage.setItem(storageKey, JSON.stringify(userData));
}

var userData = loadUserData();

var s=document.createElement('style');
s.textContent='.wc-btn{position:fixed;bottom:20px;'+po+':20px;z-index:999999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transition:transform .2s;background:'+pc+'}.wc-btn:hover{transform:scale(1.05)}.wc-btn svg{width:24px;height:24px;color:'+textColor+'}.wc-preview{position:fixed;bottom:90px;'+po+':20px;z-index:999997;display:flex;align-items:flex-end;gap:12px;animation:wcs .3s ease-out}.wc-preview-bubble{background:#fff;padding:12px 16px;border-radius:16px;border-bottom-left-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:260px}.wc-preview-title{font-weight:600;font-size:14px;color:#212529;margin-bottom:4px}.wc-preview-text{font-size:13px;color:#495057;margin:0}.wc-preview-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:'+pc+';display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:'+textColor+';flex-shrink:0}.wc-preview-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}.wc-window{position:fixed;bottom:90px;'+po+':20px;z-index:999998;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:none;flex-direction:column;background:#fff;animation:wcs .3s ease-out}.wc-window.open{display:flex}@keyframes wcs{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.wc-hdr{padding:16px;color:'+textColor+';display:flex;align-items:center;gap:12px;background:'+pc+'}.wc-ha{width:40px;height:40px;border-radius:50%;object-fit:cover;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:'+textColor+'}.wc-hi{flex:1}.wc-hn{font-weight:600;font-size:14px}.wc-hs{font-size:11px;opacity:.8}.wc-x{background:none;border:none;color:'+textColor+';cursor:pointer;padding:4px;opacity:.7;font-size:24px}.wc-x:hover{opacity:1}.wc-msgs{flex:1;overflow-y:auto;padding:16px;background:#f8f9fa;display:flex;flex-direction:column;gap:8px}.wc-msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.4;word-wrap:break-word}.wc-msg.bot,.wc-msg.agent{align-self:flex-start;background:#e9ecef;color:#212529;border-bottom-left-radius:4px}.wc-msg.user{align-self:flex-end;background:'+pc+';color:'+textColor+';border-bottom-right-radius:4px}.wc-msg-t{font-size:10px;opacity:.6;margin-top:4px}.wc-inp{padding:12px 16px;border-top:1px solid #e9ecef;display:flex;gap:8px;background:#fff}.wc-i{flex:1;border:1px solid #dee2e6;border-radius:24px;padding:8px 16px;font-size:13px;outline:none;background:#f8f9fa}.wc-i:focus{border-color:'+pc+'}.wc-snd{width:36px;height:36px;border-radius:50%;border:none;background:'+pc+';color:'+textColor+';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}.wc-snd:hover{opacity:.9}.wc-snd svg{width:16px;height:16px}.hidden{display:none!important}';
document.head.appendChild(s);

// Create preview bubble
var preview=document.createElement('div');
preview.className='wc-preview';
preview.id='wc-preview';
var previewAvatar=document.createElement('div');
previewAvatar.className='wc-preview-avatar';
if(au){var img=document.createElement('img');img.src=au;previewAvatar.appendChild(img);}
else{previewAvatar.textContent=cn?cn.charAt(0):'C';}
var previewBubble=document.createElement('div');
previewBubble.className='wc-preview-bubble';
var previewTitle=document.createElement('div');
previewTitle.className='wc-preview-title';
previewTitle.textContent=cn||'Chat';
var previewText=document.createElement('div');
previewText.className='wc-preview-text';
previewText.textContent=wt;
previewBubble.appendChild(previewTitle);
previewBubble.appendChild(previewText);
preview.appendChild(previewAvatar);
preview.appendChild(previewBubble);
document.body.appendChild(preview);

var btn=document.createElement('button');
btn.className='wc-btn';
btn.setAttribute('aria-label','Open chat');
btn.innerHTML='<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>';
document.body.appendChild(btn);

var win=document.createElement('div');
win.className='wc-window';
var hd=document.createElement('div');hd.className='wc-hdr';
var ha=document.createElement('div');ha.className='wc-ha';
if(au){var hi=document.createElement('img');hi.className='wc-ha';hi.src=au;hd.appendChild(hi)}
else{ha.textContent=cn?cn.charAt(0):'C';hd.appendChild(ha);}
var hii=document.createElement('div');hii.className='wc-hi';
var hn=document.createElement('div');hn.className='wc-hn';hn.textContent=cn||'Chat';
var hs=document.createElement('div');hs.className='wc-hs';hs.textContent='Online';
hii.appendChild(hn);hii.appendChild(hs);hd.appendChild(hii);
var cx=document.createElement('button');cx.className='wc-x';cx.textContent='×';
cx.onclick=function(){win.classList.remove('open');btn.style.display='flex';preview.classList.remove('hidden')};
hd.appendChild(cx);win.appendChild(hd);
var ms=document.createElement('div');ms.className='wc-msgs';ms.id='wc-msgs';
var ip=document.createElement('div');ip.className='wc-inp';
var inp=document.createElement('input');inp.className='wc-i';inp.id='wc-i';inp.placeholder='Digite seu nome...';
var snd=document.createElement('button');snd.className='wc-snd';snd.id='wc-snd';
snd.innerHTML='<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>';

// Form flow state
var currentStep = 0;
var userData = {
  name: '',
  phone: '',
  originAddress: '',
  destinationAddress: ''
};
var questions = [
  { key: 'name', question: 'Qual é o seu nome?', placeholder: 'Digite seu nome...' },
  { key: 'phone', question: 'Qual o seu telefone para contato imediato?', placeholder: '(00) 0000-0000' },
  { key: 'originAddress', question: 'Qual o endereço de origem?', placeholder: 'Digite o endereço de origem...' },
  { key: 'destinationAddress', question: 'Qual o endereço de destino?', placeholder: 'Digite o endereço de destino...' }
];

// Message state
var lastMessageTime = null;
var messagesLoaded = false;
var pollInterval = null;

function addMessage(text, type, time) {
  var mb = document.createElement('div');
  mb.className = 'wc-msg ' + type;
  var contentDiv = document.createElement('div');
  contentDiv.textContent = text;
  mb.appendChild(contentDiv);
  var dt = document.createElement('div');
  dt.className = 'wc-msg-t';
  dt.textContent = time ? formatTime(time) : 'Agora';
  mb.appendChild(dt);
  ms.appendChild(mb);
  ms.scrollTop = ms.scrollHeight;
}

function addBotMessage(text, time) {
  addMessage(text, 'bot', time);
}

function addUserMessage(text, time) {
  addMessage(text, 'user', time);
}

function addAgentMessage(text, time) {
  addMessage(text, 'agent', time);
}

function clearMessages() {
  ms.innerHTML = '';
}

function loadMessages() {
  var url = o + '/api/webchat/messages/' + encodeURIComponent(visitorId) + '?token=' + encodeURIComponent(t);
  if (lastMessageTime) {
    url += '&since=' + encodeURIComponent(lastMessageTime);
  }
  
  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.messages && data.messages.length > 0) {
        if (!messagesLoaded) {
          // First load - show all messages
          clearMessages();
          data.messages.forEach(function(msg) {
            if (msg.sender_type === 'agent') {
              addAgentMessage(msg.content_text, msg.created_at);
            } else if (msg.sender_type === 'contact') {
              addUserMessage(msg.content_text, msg.created_at);
            } else {
              addBotMessage(msg.content_text, msg.created_at);
            }
            lastMessageTime = msg.created_at;
          });
          
          // If we have messages, the form is already completed
          if (data.messages.length > 0) {
            currentStep = -1;
            inp.placeholder = 'Digite sua mensagem...';
          }
        } else {
          // Just add new messages
          data.messages.forEach(function(msg) {
            if (msg.sender_type === 'agent') {
              addAgentMessage(msg.content_text, msg.created_at);
            }
            lastMessageTime = msg.created_at;
          });
        }
        messagesLoaded = true;
      } else if (!messagesLoaded) {
        // No messages yet - show welcome flow
        addBotMessage(wt + (ws ? '<div style="margin-top:4px;font-size:12px;opacity:.7">' + ws + '</div>' : ''));
      }
    })
    .catch(function(err) {
      console.error('Failed to load messages', err);
    });
}

function sendFinalData() {
  var finalMessage = 'Dados do cliente:\\n\\n' +
    'Nome: ' + userData.name + '\\n' +
    'Telefone: ' + userData.phone + '\\n' +
    'Endereço de Origem: ' + userData.originAddress + '\\n' +
    'Endereço de Destino: ' + userData.destinationAddress;
  
  fetch(o+'/api/webchat/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:t,text:finalMessage,sender_name:userData.name || 'Cliente',visitor_id:visitorId,phone:userData.phone})
  }).catch(function(){});
  
  addBotMessage('Aguarde, já estamos te chamando!');
  inp.placeholder = 'Digite sua mensagem...';
  currentStep = -1; // End of flow
  
  // Load messages to show the conversation
  setTimeout(loadMessages, 500);
}

// Keep track of the event listener to remove it
var phoneMaskListener = null;

function handleNextStep() {
  var v = inp.value.trim();
  if (!v) return;
  
  if (currentStep >= 0 && currentStep < questions.length) {
    userData[questions[currentStep].key] = v;
    saveUserData();
    addUserMessage(v);
    inp.value = '';
    
    // Send each step message to server - always send phone if available
    fetch(o+'/api/webchat/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        token:t,
        text:v,
        sender_name:userData.name || 'Cliente',
        visitor_id:visitorId,
        phone:userData.phone // Always include phone if we have it!
      })
    }).catch(function(e){
      console.error('Failed to send message', e);
    });
    
    if (currentStep < questions.length - 1) {
      currentStep++;
      addBotMessage(questions[currentStep].question);
      inp.placeholder = questions[currentStep].placeholder;
      
      // Remove previous listener if any
      if (phoneMaskListener) {
        inp.removeEventListener('input', phoneMaskListener);
        phoneMaskListener = null;
      }
      
      if (questions[currentStep].key === 'phone') {
        phoneMaskListener = function(e) {
          e.target.value = applyPhoneMask(e.target.value);
        };
        inp.addEventListener('input', phoneMaskListener);
      }
    } else {
      sendFinalData();
    }
  } else {
    addUserMessage(v);
    inp.value = '';
    fetch(o+'/api/webchat/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:t,text:v,sender_name:userData.name || 'Cliente',visitor_id:visitorId,phone:userData.phone})
    }).catch(function(){});
  }
}

snd.onclick = handleNextStep;
inp.onkeydown = function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleNextStep();
  }
};

ip.appendChild(inp);
ip.appendChild(snd);
win.appendChild(ip);
document.body.appendChild(win);

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
    }
  } else {
    // Stop polling when closing
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }
};

preview.onclick = function() {
  preview.classList.add('hidden');
  win.classList.add('open');
  btn.style.display = 'none';
  setTimeout(function() { inp.focus(); }, 100);
  // Load messages when opening
  loadMessages();
  // Start polling
  if (!pollInterval) {
    pollInterval = setInterval(loadMessages, 3000);
  }
};

// Start the flow after a brief delay only if no messages yet
setTimeout(function() {
  loadMessages();
  // If no messages after load, check if user already has data
  setTimeout(function() {
    if (!messagesLoaded) {
      if (userData.name && userData.phone) {
        // User already provided data - skip form
        currentStep = -1;
        inp.placeholder = 'Digite sua mensagem...';
      } else if (currentStep === 0) {
        addBotMessage(questions[0].question);
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
