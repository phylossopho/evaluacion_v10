// ==========================================
// 0. DETECCIÓN DE BRAVE Y ADAPTACIÓN (TEMPRANO)
// ==========================================
(function() {
    // Detectar Brave lo antes posible
    const isBrave = navigator.brave ? true : false;
    const isBlocking = isBrave || navigator.userAgent.includes('Brave');
    
    if (isBlocking) {
        console.log('🛡️ Brave detectado');
        document.documentElement.classList.add('brave-browser');
        
        // Mostrar el aviso (si existe en el DOM)
        const warning = document.getElementById('braveWarning');
        if (warning) {
            warning.style.display = 'block';
        }
    }
})();

// ==========================================
// 1. ESTADO GLOBAL Y SEGUIMIENTO DE TIEMPOS
// ==========================================
let allSubjects = [];
let selectedSubject = null;
let selectedTopics = new Set();
let quizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let bestStreak = 0;
let currentStreak = 0;

let topicMetrics = new Map();

let totalTimeSeconds = 0;
let timerInterval = null;
let questionStartTime = 0;

// CONTROL DE REPOSO POR TIEMPO
let restTriggerTimeout = null;
let restCountdownInterval = null;
let hasRestBeenTriggered = false;

// ==========================================
// 2. REFERENCIAS DOM Y NAVEGACIÓN
// ==========================================
const views = {
  start: document.getElementById('startScreen'),
  topic: document.getElementById('topicScreen'),
  quiz: document.getElementById('quizScreen'),
  rest: document.getElementById('restScreen'),
  result: document.getElementById('resultScreen')
};

function switchView(activeViewKey) {
  Object.keys(views).forEach(key => {
    if (views[key]) {
      if (key === activeViewKey) {
        views[key].classList.remove('hidden');
      } else {
        views[key].classList.add('hidden');
      }
    }
  });
}

// ==========================================
// 3. REPRODUCCIÓN DE SONIDO (Acelerado a 3/4)
// ==========================================
function playCorrectSound() {
  const audioEl = document.getElementById('correctSound');
  if (audioEl) {
    audioEl.currentTime = 0;
    audioEl.playbackRate = 1.33;
    audioEl.play().catch(() => {
      playSyntheticSuccessSound();
    });
  } else {
    playSyntheticSuccessSound();
  }
}

function playSyntheticSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.0375);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.075);
  } catch (e) {
    // Ignorar si el navegador bloquea audio autoejecutado
  }
}

// ==========================================
// 4. TEMA CLARO / OSCURO
// ==========================================
function updateThemeUI(theme) {
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  if (!themeIcon || !themeText) return;

  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Modo Claro';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Modo Oscuro';
  }
}

function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeUI(next);
    });
  }
}

// ==========================================
// 5. LECTURA DE ARCHIVO JSON LOCAL (VERSIÓN BRAVE)
// ==========================================
function helperExtractText(val) {
  if (val === null || val === undefined) return '';
  let str = '';
  
  if (typeof val === 'string' || typeof val === 'number') {
    str = String(val).trim();
  } else if (typeof val === 'object') {
    if (val.tipo && val.numero) str = `${val.tipo} ${val.numero}`.trim();
    else if (val.numero) str = `Bloque ${val.numero}`.trim();
    else str = (val.nombre || val.titulo || val.texto || val.bloque || val.tema || val.opcion || '').trim();
  } else {
    str = String(val).trim();
  }

  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function initFileSelector() {
  const container = document.getElementById('subjectList');
  if (!container) return;

  // Detectar Brave
  const isBrave = navigator.brave || navigator.userAgent.includes('Brave');
  
  container.innerHTML = `
    <div style="text-align: center; margin: 15px 0;">
      <div style="position: relative; width: 100%; max-width: 320px; margin: 0 auto;">
        <input type="file" id="jsonFileInput" accept=".json" multiple 
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                      opacity: 0; cursor: pointer; z-index: 2; min-height: 50px;
                      touch-action: manipulation;">
        <button id="uploadBtn" class="primary-btn" style="width: 100%; pointer-events: none;" type="button">
          📂 Cargar archivo de evaluación (.json)
        </button>
      </div>
      ${isBrave ? `
        <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 0.9rem; border: 1px solid #ffc107;">
          💡 Si el botón no funciona, desactiva los "Escudos" de Brave para este sitio.
        </div>
      ` : ''}
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 10px;">
        Selecciona tu archivo JSON local.
      </p>
    </div>
    <div id="loadedSubjectsContainer"></div>
  `;

  const fileInput = document.getElementById('jsonFileInput');
  
  // Múltiples eventos para Brave y otros navegadores
  fileInput.addEventListener('change', handleFileSelect);
  fileInput.addEventListener('input', handleFileSelect);
  
  // Para Brave, también capturar click
  fileInput.addEventListener('click', function(e) {
    console.log('Input file clickeado');
  });

  function handleFileSelect(e) {
    const files = Array.from(this.files || []).filter(f => f.name.endsWith('.json'));
    console.log('Archivos seleccionados:', files.length);
    
    if (files.length === 0) {
      this.value = '';
      return;
    }

    allSubjects = [];
    const promises = files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          data._displayName = data.materia || data.titulo || file.name.replace(/\.json$/i, '');
          resolve(data);
        } catch (err) {
          console.error('Error al parsear JSON:', err);
          resolve(null);
        }
      };
      reader.onerror = function() {
        console.error('Error al leer archivo');
        resolve(null);
      };
      reader.readAsText(file);
    }));

    Promise.all(promises).then(results => {
      const validResults = results.filter(Boolean);
      if (validResults.length > 0) {
        allSubjects = validResults;
        renderSubjects();
        this.value = '';
      } else {
        alert('No se pudieron cargar los archivos. Verifica que sean JSON válidos.');
      }
    });
  }
}

function renderSubjects() {
  const container = document.getElementById('loadedSubjectsContainer');
  const startBtn = document.getElementById('startBtn');
  container.innerHTML = '';
  startBtn.disabled = true;

  allSubjects.forEach(sub => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.style.cssText = 'width: 100%; margin-bottom: 8px; justify-content: center;';
    btn.textContent = sub._displayName;

    btn.addEventListener('click', () => {
      document.querySelectorAll('#loadedSubjectsContainer .answer-btn').forEach(b => b.style.borderColor = 'var(--border-color)');
      btn.style.borderColor = 'var(--primary-btn)';
      selectedSubject = sub;
      startBtn.disabled = false;
    });

    container.appendChild(btn);
  });
}

// ==========================================
// 6. CONFIGURACIÓN DE TEMAS Y BLOQUES
// ==========================================
function extractBlocksAndTopics(subject) {
  const blockMap = new Map();
  const rawQuestions = subject.preguntas || subject.reactivos || (Array.isArray(subject) ? subject : []);
  const allFlatQuestions = [];

  rawQuestions.forEach(q => {
    let blockName = q.bloque ? helperExtractText(q.bloque) : 'Bloque General';
    let topicName = q.tema ? helperExtractText(q.tema) : 'Tema General';

    if (!blockMap.has(blockName)) blockMap.set(blockName, new Set());
    blockMap.get(blockName).add(topicName);

    q._extractedBlock = blockName;
    q._extractedTopic = topicName;
    allFlatQuestions.push(q);
  });

  return { blockMap, allFlatQuestions };
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (!selectedSubject) return;
  switchView('topic');
  renderTopics();
});

function renderTopics() {
  const topicList = document.getElementById('topicList');
  const topicStartBtn = document.getElementById('topicStartBtn');
  topicList.innerHTML = '';
  selectedTopics.clear();
  topicStartBtn.disabled = true;

  const { blockMap } = extractBlocksAndTopics(selectedSubject);

  blockMap.forEach((topicsSet, blockName) => {
    const blockCard = document.createElement('div');
    blockCard.className = 'block-card';

    const blockHeader = document.createElement('div');
    blockHeader.className = 'block-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'block-title-group';

    const blockCheckbox = document.createElement('input');
    blockCheckbox.type = 'checkbox';

    const titleText = document.createElement('h3');
    titleText.textContent = blockName;

    titleGroup.appendChild(blockCheckbox);
    titleGroup.appendChild(titleText);

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'block-select-btn';
    selectAllBtn.textContent = 'Seleccionar bloque';

    blockHeader.appendChild(titleGroup);
    blockHeader.appendChild(selectAllBtn);
    blockCard.appendChild(blockHeader);

    const grid = document.createElement('div');
    grid.className = 'topics-grid';

    const topicCheckboxes = [];

    topicsSet.forEach(topicName => {
      const topicCard = document.createElement('label');
      topicCard.className = 'topic-card';

      const key = `${blockName}|${topicName}`;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = key;

      topicCheckboxes.push(cb);

      cb.addEventListener('change', (e) => {
        if (e.target.checked) selectedTopics.add(key);
        else selectedTopics.delete(key);

        blockCheckbox.checked = topicCheckboxes.every(c => c.checked);
        topicStartBtn.disabled = selectedTopics.size === 0;
        updateTopicCount();
      });

      const span = document.createElement('span');
      span.textContent = topicName;

      topicCard.appendChild(cb);
      topicCard.appendChild(span);
      grid.appendChild(topicCard);
    });

    const toggleBlock = (force) => {
      const state = force !== undefined ? force : !blockCheckbox.checked;
      blockCheckbox.checked = state;
      topicCheckboxes.forEach(cb => {
        cb.checked = state;
        if (state) selectedTopics.add(cb.value);
        else selectedTopics.delete(cb.value);
      });
      topicStartBtn.disabled = selectedTopics.size === 0;
      updateTopicCount();
    };

    blockCheckbox.addEventListener('change', (e) => toggleBlock(e.target.checked));
    selectAllBtn.addEventListener('click', () => toggleBlock());

    blockCard.appendChild(grid);
    topicList.appendChild(blockCard);
  });
}

function updateTopicCount() {
  const count = selectedTopics.size;
  document.getElementById('topicCount').textContent = count === 0 ? 'Selecciona al menos un tema' : `${count} tema(s) seleccionado(s)`;
}

document.getElementById('backToSubject').addEventListener('click', () => switchView('start'));
document.getElementById('topicStartBtn').addEventListener('click', startQuiz);

// ==========================================
// 7. MOTOR DE EVALUACIÓN Y REPOSO VISUAL
// ==========================================
function startQuiz() {
  const { allFlatQuestions } = extractBlocksAndTopics(selectedSubject);
  const available = allFlatQuestions.filter(q => selectedTopics.has(`${q._extractedBlock}|${q._extractedTopic}`));

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const countSelect = document.getElementById('questionCount');
  const maxQuestions = countSelect ? parseInt(countSelect.value, 10) : 10;
  quizQuestions = shuffled.slice(0, maxQuestions);

  if (quizQuestions.length === 0) return;

  currentQuestionIndex = 0;
  score = 0;
  bestStreak = 0;
  currentStreak = 0;
  totalTimeSeconds = 0;
  hasRestBeenTriggered = false;
  topicMetrics.clear();

  switchView('quiz');
  startTimer();
  showQuestion();

  clearTimeout(restTriggerTimeout);
  restTriggerTimeout = setTimeout(() => {
    if (!hasRestBeenTriggered && currentQuestionIndex < quizQuestions.length) {
      hasRestBeenTriggered = true;
      triggerRestScreen();
    }
  }, 600000);
}

function extractExactFourOptions(q) {
  let correctText = helperExtractText(q.respuesta_correcta || q.correcta);
  let incorrects = [];
  let correctOption = null;

  if (Array.isArray(q.respuestas_incorrectas)) {
    q.respuestas_incorrectas.forEach(opt => incorrects.push({ texto: helperExtractText(opt), correcta: false }));
  } else {
    Object.keys(q).forEach(k => {
      const lk = k.toLowerCase();
      if (lk.includes('opcion') || ['a','b','c','d'].includes(lk)) {
        const text = helperExtractText(q[k]);
        if (text) {
          const isCorrect = (text === correctText);
          const item = { texto: text, correcta: isCorrect };
          if (isCorrect && !correctOption) correctOption = item;
          else incorrects.push(item);
        }
      }
    });
  }

  if (!correctOption && correctText) correctOption = { texto: correctText, correcta: true };

  incorrects = incorrects.filter(i => i.texto !== correctOption?.texto);
  const selectedIncorrects = [...incorrects].sort(() => Math.random() - 0.5).slice(0, 3);
  const finalFour = correctOption ? [correctOption, ...selectedIncorrects] : selectedIncorrects;

  return finalFour.sort(() => Math.random() - 0.5);
}

function showQuestion() {
  const q = quizQuestions[currentQuestionIndex];
  const qTextEl = document.getElementById('questionText');
  const answersEl = document.getElementById('answers');

  qTextEl.classList.remove('fade-out');
  answersEl.classList.remove('fade-out');

  document.getElementById('progressText').textContent = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;
  document.getElementById('progressBar').style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

  document.getElementById('blockBadge').textContent = q._extractedBlock || selectedSubject._displayName;
  document.getElementById('topicBadge').textContent = q._extractedTopic ? ` · ${q._extractedTopic}` : '';
  qTextEl.textContent = q.pregunta || q.reactivo || q.texto;

  answersEl.innerHTML = '';
  const options = extractExactFourOptions(q);

  questionStartTime = Date.now();

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';

    const textSpan = document.createElement('span');
    textSpan.textContent = opt.texto;
    btn.appendChild(textSpan);

    btn.addEventListener('click', () => handleAnswer(opt, q, btn));
    answersEl.appendChild(btn);
  });
}

function handleAnswer(selectedOpt, q, btn) {
  const allBtns = document.querySelectorAll('#answers button');
  allBtns.forEach(b => b.disabled = true);

  const elapsedTimeSeconds = (Date.now() - questionStartTime) / 1000;
  const isCorrect = selectedOpt.correcta === true;

  const topicKey = `${q._extractedBlock}|${q._extractedTopic}`;
  if (!topicMetrics.has(topicKey)) {
    topicMetrics.set(topicKey, { 
      errors: 0, 
      maxTime: 0, 
      totalTime: 0, 
      count: 0 
    });
  }

  const currentMetric = topicMetrics.get(topicKey);
  currentMetric.maxTime = Math.max(currentMetric.maxTime, elapsedTimeSeconds);
  currentMetric.totalTime = (currentMetric.totalTime || 0) + elapsedTimeSeconds;
  currentMetric.count = (currentMetric.count || 0) + 1;

  if (isCorrect) {
    score++;
    currentStreak++;
    if (currentStreak > bestStreak) bestStreak = currentStreak;

    playCorrectSound();

    btn.classList.add('selected-fire');
    const fireSpan = document.createElement('span');
    fireSpan.className = 'fire-icon-large';
    fireSpan.textContent = '🔥';
    btn.appendChild(fireSpan);
  } else {
    currentStreak = 0;
    currentMetric.errors += 1;
  }

  setTimeout(() => {
    advanceToNextQuestion();
  }, isCorrect ? 135 : 30);
}

function advanceToNextQuestion() {
  const qTextEl = document.getElementById('questionText');
  const answersEl = document.getElementById('answers');

  qTextEl.classList.add('fade-out');
  answersEl.classList.add('fade-out');

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
      showQuestion();
    } else {
      finishQuiz();
    }
  }, 75);
}

// ==========================================
// PANTALLA DE REPOSO VISUAL (1 MINUTO)
// ==========================================
function triggerRestScreen() {
  switchView('rest');

  let timeLeft = 60; 

  const timerEl = document.getElementById('restTimer');
  const skipBtn = document.getElementById('skipRestBtn');

  if (timerEl) timerEl.textContent = timeLeft;

  if (skipBtn) {
    skipBtn.disabled = true;
    skipBtn.textContent = `Espera (${timeLeft}s)`;
  }

  clearInterval(restCountdownInterval);
  restCountdownInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = timeLeft;

    if (skipBtn && timeLeft > 0) {
      skipBtn.textContent = `Espera (${timeLeft}s)`;
    }

    if (timeLeft <= 0) {
      clearInterval(restCountdownInterval);
      if (skipBtn) {
        skipBtn.disabled = false;
        skipBtn.textContent = 'Continuar';
      }
    }
  }, 1000);
}

function exitRestScreen() {
  const skipBtn = document.getElementById('skipRestBtn');
  if (skipBtn && skipBtn.disabled) return;

  clearInterval(restCountdownInterval);
  switchView('quiz');
}

document.getElementById('skipRestBtn').addEventListener('click', exitRestScreen);

// ==========================================
// 8. RESULTADOS Y CONSEJO DE ESCRITURA
// ==========================================
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    totalTimeSeconds++;
  }, 1000);
}

function finishQuiz() {
  clearInterval(timerInterval);
  clearTimeout(restTriggerTimeout);

  const m = Math.floor(totalTimeSeconds / 60).toString().padStart(2, '0');
  const s = (totalTimeSeconds % 60).toString().padStart(2, '0');
  document.getElementById('totalTime').textContent = `${m}:${s}`;

  document.getElementById('bestStreak').textContent = `🔥 ${bestStreak}`;

  const percentage = (score / quizQuestions.length) * 100;
  let motivationalBadge = '💪 ¡Sigue practicando!';
  if (percentage >= 90) motivationalBadge = '🌟 ¡Impresionante!';
  else if (percentage >= 70) motivationalBadge = '🚀 ¡Gran esfuerzo!';
  document.getElementById('medalValue').textContent = motivationalBadge;

  const studyList = document.getElementById('studyList');
  const handwritingTip = document.getElementById('handwritingTip');
  studyList.innerHTML = '';

  let hasTopicsToReview = false;

  topicMetrics.forEach((metric, key) => {
    const [block, topic] = key.split('|');
    const avgTime = metric.totalTime ? metric.totalTime / metric.count : 0;
    
    // CRITERIOS: errores O tiempo promedio > 8 segundos
    if (metric.errors > 0 || avgTime > 8) {
      hasTopicsToReview = true;
      let reason = '';
      if (metric.errors > 0) {
        reason = '⏰ Revisa este tema, tuviste algunos errores';
      } else if (avgTime > 8) {
        reason = '🧠 Tómate tu tiempo para reflexionar, pero sigue practicando';
      }
      appendStudyCard(studyList, `${block} · ${topic}`, '📝', reason);
    }
  });

  if (!hasTopicsToReview) {
    if (handwritingTip) handwritingTip.classList.add('hidden');
    studyList.innerHTML = `
      <div class="study-card-item" style="border-color: #28a745;">
        <div class="study-card-title">🎉 ¡Excelente Trabajo!</div>
        <div class="study-card-status" style="color: #28a745;">
          ✅ Has respondido correctamente. ¡Dominas el tema!
        </div>
      </div>`;
  } else {
    if (handwritingTip) handwritingTip.classList.remove('hidden');
  }

  console.log('📊 Estadísticas por tema:');
  topicMetrics.forEach((metric, key) => {
    const avg = metric.totalTime ? (metric.totalTime / metric.count).toFixed(1) : 0;
    console.log(`  ${key}: ${metric.count} preg, ${metric.errors} errores, promedio ${avg}s`);
  });

  switchView('result');
}

function appendStudyCard(container, titleText, icon, text) {
  const card = document.createElement('div');
  card.className = 'study-card-item';

  const title = document.createElement('div');
  title.className = 'study-card-title';
  title.textContent = titleText;

  const status = document.createElement('div');
  status.className = 'study-card-status';
  status.innerHTML = `<span>${icon}</span><span>${text}</span>`;

  card.appendChild(title);
  card.appendChild(status);
  container.appendChild(card);
}

document.getElementById('restartBtn').addEventListener('click', () => {
  clearTimeout(restTriggerTimeout);
  clearInterval(restCountdownInterval);
  switchView('start');
  initFileSelector();
});

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initFileSelector();
});
