/* ============================================================
   REOBOTE CONSÓRCIOS — LP CONTRATAÇÃO
   ============================================================ */

/* ── Configuração — preencher antes de publicar ─────────────── */
const CONFIG = {
  WEBHOOK_URL:    'URL_DO_WEBHOOK_AQUI',          // URL do Google Apps Script publicado
  WHATSAPP_GROUP: 'https://chat.whatsapp.com/LINK_DO_GRUPO_AQUI', // Link do grupo
};

/* ── Estado do formulário ───────────────────────────────────── */
const state = {
  step:      1,
  possuiCarro: null, // 'SIM' | 'NÃO' | null
};

/* ── Elementos ──────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const els = {
  step1:         $('step-1'),
  step2:         $('step-2'),
  nome:          $('nome'),
  idade:         $('idade'),
  telefone:      $('telefone'),
  email:         $('email'),
  vSim:          $('v-sim'),
  vNao:          $('v-nao'),
  sobre:         $('sobre'),
  btnNext:       $('btn-next'),
  btnBack:       $('btn-back'),
  submitArea:    $('submit-area'),
  btnSemCarro:   $('btn-sem-carro'),
  btnComCarro:   $('btn-com-carro'),
  progStep1:     document.querySelector('[data-step="1"]'),
  progStep2:     document.querySelector('[data-step="2"]'),
  progFill:      $('prog-line-fill'),
  form:          $('candidacy-form'),
  successSem:    $('success-sem-carro'),
  modalOverlay:  $('modal-overlay'),
  modalClose:    $('modal-close'),
  formProgress:  $('form-progress'),
};

/* ============================================================
   MODAL — abrir / fechar
   ============================================================ */
let _viewContentFired = false;

function openModal() {
  els.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  /* ViewContent dispara na primeira abertura do modal */
  if (!_viewContentFired) {
    _viewContentFired = true;
    _fbq('track', 'ViewContent');
  }
}

function closeModal() {
  els.modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* Fecha clicando no fundo */
els.modalOverlay.addEventListener('click', (e) => {
  if (e.target === els.modalOverlay) closeModal();
});

/* Fecha com ESC */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* Botão X */
els.modalClose.addEventListener('click', closeModal);

/* Todos os CTAs abrem o modal + disparam InitiateCheckout */
document.querySelectorAll('.js-open-modal').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    _fbq('track', 'InitiateCheckout');
    openModal();
  });
});

/* ============================================================
   MÁSCARA DE TELEFONE
   Formata em tempo real: (XX) XXXXX-XXXX
   Valida: exatamente 11 dígitos (DDD + 9 + 8)
   ============================================================ */
els.telefone.addEventListener('input', (e) => {
  let digits = e.target.value.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);

  let masked = '';
  if (digits.length > 0) masked = '(' + digits.slice(0, 2);
  if (digits.length > 2) masked += ') ' + digits.slice(2, 7);
  if (digits.length > 7) masked += '-' + digits.slice(7, 11);

  e.target.value = masked;
});

/* Previne colar texto não numérico */
els.telefone.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
  const fakeEvent = { target: { value: text } };
  els.telefone.value = text;
  els.telefone.dispatchEvent(new Event('input'));
});

/* ── Validação de telefone ──────────────────────────────────── */
function phoneDigits(val) {
  return val.replace(/\D/g, '');
}

/* ============================================================
   VALIDAÇÃO — Step 1
   ============================================================ */
function validateStep1() {
  let valid = true;

  const nome = els.nome.value.trim();
  const idade = parseInt(els.idade.value, 10);
  const tel = phoneDigits(els.telefone.value);
  const email = els.email.value.trim();

  // Nome
  if (nome.length < 3) {
    setError('err-nome', 'Informe seu nome completo.');
    els.nome.classList.add('error');
    valid = false;
  } else {
    clearError('err-nome');
    els.nome.classList.remove('error');
  }

  // Idade
  if (!els.idade.value || isNaN(idade) || idade < 18 || idade > 70) {
    setError('err-idade', 'Informe uma idade válida (18–70).');
    els.idade.classList.add('error');
    valid = false;
  } else {
    clearError('err-idade');
    els.idade.classList.remove('error');
  }

  // Telefone — exatamente 11 dígitos, DDD + 9 + 8
  if (tel.length !== 11 || tel[2] !== '9') {
    setError('err-telefone', 'Informe um WhatsApp válido: (XX) 9XXXX-XXXX.');
    els.telefone.classList.add('error');
    valid = false;
  } else {
    clearError('err-telefone');
    els.telefone.classList.remove('error');
  }

  // E-mail
  const emailRgx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRgx.test(email)) {
    setError('err-email', 'Informe um e-mail válido.');
    els.email.classList.add('error');
    valid = false;
  } else {
    clearError('err-email');
    els.email.classList.remove('error');
  }

  return valid;
}

/* ============================================================
   VALIDAÇÃO — Step 2 (para liberar botão de envio)
   ============================================================ */
function checkStep2Complete() {
  const veiculoOk = state.possuiCarro !== null;
  const sobreOk   = els.sobre.value.trim().length >= 10;
  return veiculoOk && sobreOk;
}

function updateSubmitArea() {
  if (!checkStep2Complete()) {
    els.submitArea.classList.add('hidden');
    return;
  }

  els.submitArea.classList.remove('hidden');

  if (state.possuiCarro === 'SIM') {
    els.btnSemCarro.classList.add('hidden');
    els.btnComCarro.classList.remove('hidden');
  } else {
    els.btnComCarro.classList.add('hidden');
    els.btnSemCarro.classList.remove('hidden');
  }
}

/* ── Veículo — seleção ──────────────────────────────────────── */
els.vSim.addEventListener('click', () => {
  state.possuiCarro = 'SIM';
  els.vSim.classList.add('selected-sim');
  els.vNao.classList.remove('selected-nao');
  clearError('err-veiculo');
  _fbq('trackCustom', 'SelecionouVeiculo', { possui: 'SIM' });
  updateSubmitArea();
});

els.vNao.addEventListener('click', () => {
  state.possuiCarro = 'NÃO';
  els.vNao.classList.add('selected-nao');
  els.vSim.classList.remove('selected-sim');
  clearError('err-veiculo');
  _fbq('trackCustom', 'SelecionouVeiculo', { possui: 'NÃO' });
  updateSubmitArea();
});

/* ── "Sobre" — monitora preenchimento ──────────────────────── */
els.sobre.addEventListener('input', updateSubmitArea);

/* ============================================================
   NAVEGAÇÃO ENTRE STEPS
   ============================================================ */
els.btnNext.addEventListener('click', () => {
  if (!validateStep1()) return;
  _fbq('trackCustom', 'PassouEtapa1');
  goToStep(2);
});

els.btnBack.addEventListener('click', () => {
  goToStep(1);
});

function goToStep(n) {
  state.step = n;

  /* Oculta todos os steps */
  els.step1.classList.remove('active');
  els.step2.classList.remove('active');

  /* Mostra o step alvo */
  (n === 1 ? els.step1 : els.step2).classList.add('active');

  /* Atualiza barra de progresso */
  if (n === 2) {
    els.progStep1.classList.add('done');
    els.progStep1.classList.remove('active');
    els.progStep2.classList.add('active');
    els.progFill.style.width = '100%';
  } else {
    els.progStep1.classList.remove('done');
    els.progStep1.classList.add('active');
    els.progStep2.classList.remove('active');
    els.progFill.style.width = '0%';
  }

  /* Volta ao topo do modal */
  els.modalOverlay.scrollTop = 0;
}

/* ============================================================
   MONTAGEM DO PAYLOAD
   ============================================================ */
function buildPayload() {
  const digits = phoneDigits(els.telefone.value);
  const formatted = `+55 (${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;

  return {
    nome:        els.nome.value.trim(),
    idade:       els.idade.value.trim(),
    telefone:    formatted,
    email:       els.email.value.trim().toLowerCase(),
    possuiCarro: state.possuiCarro,
    sobre:       els.sobre.value.trim(),
  };
}

/* ============================================================
   ENVIO — SEM CARRO → salva na planilha → mensagem de sucesso
   ============================================================ */
els.btnSemCarro.addEventListener('click', async () => {
  if (!validateStep2Fields()) return;

  setLoading(els.btnSemCarro, true);

  try {
    await submitToSheets(buildPayload());
    trackLead();
    showSuccessSemCarro();
  } catch (err) {
    showNetworkError(els.btnSemCarro);
  } finally {
    setLoading(els.btnSemCarro, false);
  }
});

/* ============================================================
   ENVIO — COM CARRO → salva na planilha → abre grupo WhatsApp
   ============================================================ */
els.btnComCarro.addEventListener('click', async () => {
  if (!validateStep2Fields()) return;

  setLoading(els.btnComCarro, true);

  try {
    await submitToSheets(buildPayload());
    trackLead();
    window.open(CONFIG.WHATSAPP_GROUP, '_blank', 'noopener,noreferrer');
  } catch (err) {
    /* Mesmo com erro de rede, redireciona — lead não é perdido na UX */
    trackLead();
    window.open(CONFIG.WHATSAPP_GROUP, '_blank', 'noopener,noreferrer');
  } finally {
    setLoading(els.btnComCarro, false);
  }
});

/* ── Validação antes de enviar (step 2) ─────────────────────── */
function validateStep2Fields() {
  let valid = true;

  if (state.possuiCarro === null) {
    setError('err-veiculo', 'Selecione uma opção acima.');
    valid = false;
  } else {
    clearError('err-veiculo');
  }

  if (els.sobre.value.trim().length < 10) {
    setError('err-sobre', 'Conte um pouco mais sobre você (mínimo 10 caracteres).');
    els.sobre.classList.add('error');
    valid = false;
  } else {
    clearError('err-sobre');
    els.sobre.classList.remove('error');
  }

  return valid;
}

/* ── Fetch para Google Apps Script ──────────────────────────── */
async function submitToSheets(payload) {
  const res = await fetch(CONFIG.WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script exige text/plain para CORS simples
    body:    JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== 'success') throw new Error(json.message || 'Erro no servidor.');
}

/* ── Exibe sucesso sem carro ────────────────────────────────── */
function showSuccessSemCarro() {
  els.form.classList.add('hidden');
  els.formProgress.classList.add('hidden');
  els.successSem.classList.remove('hidden');
  els.modalOverlay.scrollTop = 0;
}

/* ── Erro de rede no botão ──────────────────────────────────── */
function showNetworkError(btn) {
  const txt = btn.querySelector('span') || btn;
  const original = txt.textContent;
  txt.textContent = 'Erro de conexão. Tente novamente.';
  setTimeout(() => { txt.textContent = original; }, 3000);
}

/* ============================================================
   HELPERS DE UI
   ============================================================ */
function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}
function setLoading(btn, on) {
  if (on) {
    btn.classList.add('loading');
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '';
  } else {
    btn.classList.remove('loading');
    if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
  }
}

/* (smooth scroll removido — form agora é modal) */

/* ============================================================
   INTERSECTION OBSERVER — reveal on scroll
   ============================================================ */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* (ViewContent agora dispara em openModal — ver acima) */

/* ============================================================
   META PIXEL — helpers
   ============================================================ */
function trackLead()            { _fbq('track', 'Lead'); }
function _fbq(type, event, obj) { if (typeof fbq !== 'undefined') fbq(type, event, obj); }

/* ── InitiateCheckout — dispara junto com openModal ─────────── */

/* ── ScrollDepth — 50% e 90% ────────────────────────────────── */
const _scrollFired = { 50: false, 90: false };
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  [50, 90].forEach((m) => {
    if (!_scrollFired[m] && pct >= m) {
      _scrollFired[m] = true;
      _fbq('trackCustom', 'ScrollDepth', { percent: m });
    }
  });
}, { passive: true });

/* ── AssistioVideo — play na VSL via postMessage do YouTube ─── */
let _videoPlayed = false;
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://www.youtube.com') return;
  try {
    const data = JSON.parse(e.data);
    if (data.event === 'infoDelivery' && data.info?.playerState === 1 && !_videoPlayed) {
      _videoPlayed = true;
      _fbq('trackCustom', 'AssistioVideo');
    }
  } catch (_) {}
});
