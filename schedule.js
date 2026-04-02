// schedule.js - Smart Schedule Core Logic

const CURRICULUM = {
  primary: [
    { type: 'math', name: 'Matematik', topics: ['Doğal Sayılar', 'Kesirler', 'Geometri', 'Zaman Ölçme'] },
    { type: 'science', name: 'Fen Bilimleri', topics: ['Kuvvet', 'Maddenin Halleri', 'Gezegenimizi Tanıyalım'] },
    { type: 'language', name: 'Türkçe', topics: ['Okuma Anlama', 'Sözcükte Anlam', 'Yazım Kuralları'] }
  ],
  highschool: [
    { type: 'math', name: 'Matematik', topics: ['Türev', 'İntegral', 'Trigonometri', 'Fonksiyonlar', 'Logaritma'] },
    { type: 'science', name: 'Fizik', topics: ['Mekanik', 'Elektrik', 'Manyetizma', 'Dalga Mekaniği'] },
    { type: 'science', name: 'Kimya', topics: ['Organik Kimya', 'Gazlar', 'Modern Atom Teorisi'] },
    { type: 'language', name: 'Türkçe / Edebiyat', topics: ['Paragraf', 'Cümle Anlamı', 'Divan Edebiyatı', 'Tanzimat'] }
  ]
};

const TEMPLATES = [
  {
    id: 't1',
    title: 'Üniversite Hazırlık - Yoğun (SAY)',
    hours: 32,
    tags: ['12. Sınıf', 'Mezun', 'SAY', 'Yoğun'],
    events: [
      { day: 1, hour: 9, duration: 2, title: 'Matematik', topic: 'Türev', type: 'math' },
      { day: 1, hour: 11, duration: 2, title: 'Fizik', topic: 'Mekanik', type: 'science' },
      { day: 2, hour: 10, duration: 2, title: 'Kimya', topic: 'Organik Kimya', type: 'science' },
      { day: 3, hour: 15, duration: 2, title: 'Matematik', topic: 'İntegral', type: 'math' }
    ]
  },
  {
    id: 't2',
    title: 'Düzenli Okul Tekrarı (EA)',
    hours: 15,
    tags: ['10. Sınıf', '11. Sınıf', 'EA', 'Orta'],
    events: [
      { day: 2, hour: 16, duration: 2, title: 'Matematik', topic: 'Trigonometri', type: 'math' },
      { day: 4, hour: 17, duration: 2, title: 'Türkçe', topic: 'Paragraf', type: 'language' }
    ]
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Dynamic Modals
  injectModals();

  // Elements
  const bodyArea = document.getElementById('bodyArea');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const scheduleEmpty = document.getElementById('scheduleEmpty');
  const calendarWrapper = document.getElementById('calendarWrapper');
  const calendarGrid = document.getElementById('calendarGrid');
  const btnSelectTemplate = document.getElementById('btnSelectTemplate');

  const drawerOverlay = document.getElementById('drawerOverlay');
  const templateDrawer = document.getElementById('templateDrawer');

  // State
  let userLevel = '';
  let isHighSchoolCategory = false;
  let events = []; // Array of { id, day, hour, duration, title, topic, type, aiNote }
  let draggedEventId = null;

  // New Event State
  let selectedCellDay = null;
  let selectedCellHour = null;
  let selectedCurriculumType = 'math';
  let selectedCurriculumTitle = 'Matematik';

  // Auth Listener
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            userLevel = doc.data().level || '';
            applyThemeBasedOnLevel(userLevel);
            // Load custom schedule if exists
            const scheduleDoc = await db.collection('users').doc(user.uid).collection('data').doc('schedule').get();
            if (scheduleDoc.exists && scheduleDoc.data().events) {
              events = scheduleDoc.data().events;
            }
            renderUI();
          }
        } catch (e) { console.error("Firebase fetch error", e); renderUI(); }
      } else {
        // Logged out
        calendarWrapper.style.display = 'none';
        scheduleEmpty.style.display = 'flex';
        analyzeBtn.style.display = 'none';
      }
    });
  } else {
    // Fallback for dev without firebase
    applyThemeBasedOnLevel('12. Sınıf');
    renderUI();
  }

  function applyThemeBasedOnLevel(level) {
    const hsLevels = ['9', '10', '11', '12', 'mezun', 'lise'];
    isHighSchoolCategory = hsLevels.some(l => level.toLowerCase().includes(l));

    if (isHighSchoolCategory) {
      bodyArea.classList.add('theme-highschool');
      bodyArea.classList.remove('theme-primary');
      if (btnSelectTemplate) btnSelectTemplate.style.display = 'inline-block';
    } else {
      bodyArea.classList.add('theme-primary');
      bodyArea.classList.remove('theme-highschool');
      if (btnSelectTemplate) btnSelectTemplate.style.display = 'none';
    }
  }

  function renderUI() {
    if (events.length === 0) {
      calendarWrapper.style.display = 'none';
      scheduleEmpty.style.display = 'flex';
      analyzeBtn.style.display = 'none';
    } else {
      scheduleEmpty.style.display = 'none';
      calendarWrapper.style.display = 'block';
      analyzeBtn.style.display = 'flex';
      drawGrid();
      renderEvents();
    }
  }

  // --- Grid & Calendar Logic ---
  function drawGrid() {
    calendarGrid.innerHTML = '';
    const days = ['Saat', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    // Header
    days.forEach(day => {
      const div = document.createElement('div');
      div.className = 'cal-header';
      div.textContent = day;
      calendarGrid.appendChild(div);
    });

    // Body
    for (let h = 8; h <= 23; h++) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'cal-time';
      timeDiv.textContent = `${h.toString().padStart(2, '0')}:00`;
      calendarGrid.appendChild(timeDiv);

      for (let d = 1; d <= 7; d++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.dataset.day = d;
        cell.dataset.hour = h;

        // Grid Placement via CSS inline (Row: h-7+1, Col: d+1)
        cell.style.gridColumn = d + 1;
        cell.style.gridRow = (h - 7) + 1;

        // Interactions
        cell.addEventListener('click', () => openAddEventModal(d, h));

        // Drag over
        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          cell.classList.add('drag-over');
        });
        cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('drag-over');
          if (draggedEventId) {
            moveEvent(draggedEventId, d, h);
          }
        });

        calendarGrid.appendChild(cell);
      }
    }
  }

  function renderEvents() {
    // Clean old events
    document.querySelectorAll('.cal-event').forEach(el => el.remove());

    events.forEach(ev => {
      // Find row and col
      const col = ev.day + 1;
      const startRow = (ev.hour - 7) + 1;
      const endRow = startRow + (ev.duration || 1);

      const el = document.createElement('div');
      el.className = `cal-event ${ev.type || 'math'}`;
      el.style.gridColumn = col;
      el.style.gridRow = `${startRow} / ${endRow}`;
      el.draggable = true;

      let html = `<div class="event-title">${ev.title}</div><div class="event-topic">${ev.topic}</div>`;
      if (ev.aiNote) {
        html += `<div class="event-ai-icon" title="Yapay Zeka Notu: ${ev.aiNote}">✨</div>`;
      }
      el.innerHTML = html;

      // Drag
      el.addEventListener('dragstart', (e) => {
        draggedEventId = ev.id;
        setTimeout(() => el.style.opacity = '0.5', 0);
      });
      el.addEventListener('dragend', () => {
        draggedEventId = null;
        el.style.opacity = '1';
      });

      // Delete on right click
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm('Aktiviteyi silmek istiyor musunuz?')) {
          events = events.filter(x => x.id !== ev.id);
          saveEvents();
          renderUI();
        }
      });

      calendarGrid.appendChild(el);
    });
  }

  function moveEvent(id, newDay, newHour) {
    const ev = events.find(x => x.id === id);
    if (ev) {
      ev.day = parseInt(newDay);
      ev.hour = parseInt(newHour);
      saveEvents();
      renderEvents();
    }
  }

  function saveEvents() {
    if (window.firebase && firebase.auth && firebase.auth().currentUser && db) {
      const uid = firebase.auth().currentUser.uid;
      db.collection('users').doc(uid).collection('data').doc('schedule').set({
        events: events,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  // --- Add Event Flow ---
  function openAddEventModal(day, hour) {
    selectedCellDay = day;
    selectedCellHour = hour;
    document.getElementById('eventTopicInput').value = '';
    document.getElementById('autocompleteList').style.display = 'none';
    document.getElementById('addEventModal').classList.add('active');
  }

  function injectModals() {
    const modalHTML = `
      <div class="auth-modal" id="addEventModal">
        <div class="auth-modal-overlay" id="addEventOverlay"></div>
        <div class="auth-modal-card">
          <button class="auth-modal-x" id="addEventClose">×</button>
          <h3 style="margin-bottom:16px; color:var(--text);">Ders/Konu Ekle</h3>
          <div style="margin-bottom:12px; position:relative;">
             <label style="display:block; margin-bottom:4px; font-size:0.85rem; color:var(--text-muted)">Ders veya Konu Ara</label>
             <input type="text" id="eventTopicInput" placeholder="Örn: Paragraf..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg); color:var(--text);" autocomplete="off" />
             <div id="autocompleteList" style="display:none; position:absolute; left:0; right:0; top:100%; z-index:10; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); max-height:150px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.2);"></div>
          </div>
          <div style="margin-bottom:16px;">
             <label style="display:block; margin-bottom:4px; font-size:0.85rem; color:var(--text-muted)">Süre (Saat)</label>
             <input type="number" id="eventDuration" min="1" max="4" value="1" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg); color:var(--text);" />
          </div>
          <button class="btn-primary" id="btnSaveEvent" style="width:100%; padding:12px;">Takvime Ekle</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Binders
    document.getElementById('addEventClose').addEventListener('click', () => {
      document.getElementById('addEventModal').classList.remove('active');
    });
    document.getElementById('addEventOverlay').addEventListener('click', () => {
      document.getElementById('addEventModal').classList.remove('active');
    });

    const topicInput = document.getElementById('eventTopicInput');
    const autoList = document.getElementById('autocompleteList');

    topicInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      autoList.innerHTML = '';
      if (!val) { autoList.style.display = 'none'; return; }

      const curr = isHighSchoolCategory ? CURRICULUM.highschool : CURRICULUM.primary;
      let matches = [];
      curr.forEach(subject => {
        subject.topics.forEach(topic => {
          if (topic.toLowerCase().includes(val) || subject.name.toLowerCase().includes(val)) {
            matches.push({ subject, topic });
          }
        });
      });

      if (matches.length > 0) {
        matches.slice(0, 5).forEach(m => {
          const div = document.createElement('div');
          div.style.padding = '10px';
          div.style.borderBottom = '1px solid var(--border2)';
          div.style.cursor = 'pointer';
          div.innerHTML = `<strong>${m.subject.name}</strong> - ${m.topic}`;
          div.addEventListener('click', () => {
            topicInput.value = m.topic;
            selectedCurriculumTitle = m.subject.name;
            selectedCurriculumType = m.subject.type;
            autoList.style.display = 'none';
          });
          autoList.appendChild(div);
        });
        autoList.style.display = 'block';
      } else {
        autoList.style.display = 'none';
      }
    });

    document.getElementById('btnSaveEvent').addEventListener('click', () => {
      const topic = topicInput.value || 'Serbest Çalışma';
      const duration = parseInt(document.getElementById('eventDuration').value) || 1;

      events.push({
        id: 'ev_' + Date.now(),
        day: selectedCellDay,
        hour: selectedCellHour,
        duration: duration,
        title: selectedCurriculumTitle,
        topic: topic,
        type: selectedCurriculumType
      });

      saveEvents();
      document.getElementById('addEventModal').classList.remove('active');
      renderUI();
    });
  }

  // --- Start Flows ---
  document.getElementById('btnCreateBlank').addEventListener('click', () => {
    scheduleEmpty.style.display = 'none';
    calendarWrapper.style.display = 'block';
    analyzeBtn.style.display = 'flex';
    if (calendarGrid.children.length === 0) drawGrid();
  });

  // Template Logic
  if (btnSelectTemplate) {
    btnSelectTemplate.addEventListener('click', () => {
      drawerOverlay.classList.add('active');
      templateDrawer.classList.add('active');
      renderTemplates();
    });
  }

  document.getElementById('closeTemplateDrawer').addEventListener('click', () => {
    drawerOverlay.classList.remove('active');
    templateDrawer.classList.remove('active');
  });

  function renderTemplates() {
    const list = document.getElementById('templateList');
    list.innerHTML = '';
    TEMPLATES.forEach(t => {
      const tags = t.tags.map(tag => `<span class="template-badge">${tag}</span>`).join('');
      const div = document.createElement('div');
      div.className = 'template-card';
      div.innerHTML = `
        <h4 style="color:var(--text); margin-top:0;">${t.title} <span>${t.hours} Saat</span></h4>
        <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">${tags}</div>
        <button class="btn-primary" style="width:100%; padding:8px;" data-tid="${t.id}">Takvime Uygula</button>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tid = e.target.getAttribute('data-tid');
        applyTemplate(tid);
      });
    });
  }

  function applyTemplate(id) {
    const t = TEMPLATES.find(x => x.id === id);
    if (t) {
      // Map new ids
      const newEvents = t.events.map(ev => ({ ...ev, id: 'ev_' + Math.random().toString(36).substr(2, 9) }));
      events = [...events, ...newEvents];
      saveEvents();

      drawerOverlay.classList.remove('active');
      templateDrawer.classList.remove('active');
      renderUI();
    }
  }

  // --- AI Integrations (Gemini) ---
  const GEMINI_KEY = window.localStorage ? localStorage.getItem('eduai_gemini_key') || 'AIzaSyAdwKVmcGfrW9bmvVVbIbF64sc6pscMVxQ' : 'AIzaSyAdwKVmcGfrW9bmvVVbIbF64sc6pscMVxQ';

  async function callGemini(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const req = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.7 }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error("API Hatası: " + res.status);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  // Analyze Setup
  const analyzeContent = document.getElementById('analyzeContent');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      drawerOverlay.classList.add('active');
      analyzeDrawer.classList.add('active');
      analyzeContent.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Analiz ediliyor... Lütfen bekleyin ⏳</div>';

      try {
        const eventsStr = JSON.stringify(events.map(e => ({ day: e.day, hour: e.hour, duration: e.duration, title: e.title, topic: e.topic })));
        const prompt = `Kullanıcı seviyesi: ${userLevel}. Şu anki çalışma programı: ${eventsStr}. 
        Görev: Bu programı MEB müfredat dengesi, ders yükü dağılımı ve genel çalışma stratejisi açısından analiz et. Öğrenciyi motive edici bir dille, eksik veya fazla kısımları Markdown kullanarak raporla. Lütfen kısa ve öz ol (Maksimum 3-4 paragraf veya madde).`;

        const responseText = await callGemini(prompt);
        // Çok basit Markdown renderer
        const formatText = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
        analyzeContent.innerHTML = formatText;
      } catch (err) {
        analyzeContent.innerHTML = '<div style="color:var(--danger); padding:20px;">Analiz sırasında bir hata oluştu.</div>';
      }
    });
  }

  document.getElementById('closeAnalyzeDrawer').addEventListener('click', () => {
    drawerOverlay.classList.remove('active');
    analyzeDrawer.classList.remove('active');
  });

  // AI Planner Wizard Setup
  const btnAiPlan = document.getElementById('btnAiPlan');
  if (btnAiPlan) {
    btnAiPlan.addEventListener('click', async () => {
      const hours = prompt("Yapay Zeka çalışma asistanına hoş geldin ✨\nHaftalık toplam kaç saat çalışmak istiyorsun?", "20");
      if (!hours || isNaN(parseInt(hours))) return;

      scheduleEmpty.innerHTML = '<h3>Yapay Zeka Programınızı Hazırlıyor... ✨</h3><p>Lütfen bekleyin, uygun müfredat analiz ediliyor.</p>';

      try {
        const promptText = `Görev: ${userLevel} seviyesindeki bir öğrenci için haftada toplam ${hours} saatlik bir çalışma programı oluştur. MEB müfredatına uygun ve dengeli olsun.
        Kurallar:
        - Yanıt SADECE geçerli bir JSON formatında olmalı, hiçbir ek yazı veya markdown (\`\`\`json vs) kullanma. Mümkün olduğunca pür text dön.
        - JSON formati: [{"day": 1, "hour": 9, "duration": 2, "title": "Matematik", "topic": "Türev", "type": "math", "aiNote": "Zor konu!"}].
        - "day" 1 (Pzt) ile 7 (Pzr) arasıdır. "hour" 8 ile 23 arasıdır. "duration" saat cinsindendir (1 veya 2 vb).
        - Çakışan saatler olmasın.
        - SADECE valid JSON dizisi dön.`;

        const responseText = await callGemini(promptText);
        const cleanJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedEvents = JSON.parse(cleanJSON);

        const newEvents = generatedEvents.map(ev => ({ ...ev, id: 'ev_' + Math.random().toString(36).substr(2, 9) }));
        events = [...events, ...newEvents];
        saveEvents();

        renderUI();
      } catch (err) {
        console.error(err);
        alert("Yapay Zeka planlamasında hata oluştu. Lütfen tekrar deneyin.");
        window.location.reload();
      }
    });
  }
});
