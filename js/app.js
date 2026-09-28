import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('memo_corsi_theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', isDark ? '#020617' : '#ffffff');
  lucide.createIcons();
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

const initialTheme = localStorage.getItem('memo_corsi_theme') || 'light';
applyTheme(initialTheme);

const DEFAULT_TEMPLATES = [{
  id: 'tpl-1', title: 'Corso Standard con Orari',
  items: [
    { text: 'Inviare convocazione corsisti', daysOffset: -3, hoursOffset: 0 },
    { text: 'Emissione e invio attestati', daysOffset: 2, hoursOffset: 0 }
  ]
}];

let templates = JSON.parse(localStorage.getItem('memo_corsi_templates')) || DEFAULT_TEMPLATES;
let courses = JSON.parse(localStorage.getItem('memo_corsi_courses')) || [];
let editingTemplateId = null;

function syncStorage() {
  localStorage.setItem('memo_corsi_templates', JSON.stringify(templates));
  localStorage.setItem('memo_corsi_courses', JSON.stringify(courses));
  render();
}

function switchTab(tab) {
  const isCourses = tab === 'courses';
  document.getElementById('view-courses').classList.toggle('hidden', !isCourses);
  document.getElementById('view-templates').classList.toggle('hidden', isCourses);
}

function openModal(id) {
  if (id === 'modal-course') {
    populateTemplateSelect();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    document.getElementById('course-datetime').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('flex');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).classList.remove('flex');
  if (id === 'modal-template') editingTemplateId = null;
}

function openTemplateModal(templateId = null) {
  editingTemplateId = templateId;
  const container = document.getElementById('tpl-actions-container');
  container.innerHTML = '';
  if (templateId) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    document.getElementById('tpl-name').value = tpl.title;
    tpl.items.forEach(item => addTemplateActionRow(item.text, item.daysOffset, item.hoursOffset));
  } else {
    document.getElementById('form-template').reset();
    addTemplateActionRow('Inviare convocazione', -3, 0);
  }
  document.getElementById('modal-template').classList.remove('hidden');
  document.getElementById('modal-template').classList.add('flex');
  lucide.createIcons();
}

function addTemplateActionRow(text = '', days = 0, hours = -1) {
  const container = document.getElementById('tpl-actions-container');
  const div = document.createElement('div');
  div.className = "flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 tpl-row";
  div.innerHTML = `
    <input type="text" value="${text}" required class="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
    <input type="number" value="${days}" required class="w-12 text-xs px-1 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
    <input type="number" value="${hours}" required class="w-12 text-xs px-1 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
    <button type="button" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-rose-500 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
  `;
  container.appendChild(div);
  lucide.createIcons();
}

function saveTemplate(e) {
  e.preventDefault();
  const title = document.getElementById('tpl-name').value.trim();
  const rows = document.querySelectorAll('.tpl-row');
  const items = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    if (inputs[0].value.trim()) items.push({ text: inputs[0].value.trim(), daysOffset: parseInt(inputs[1].value)||0, hoursOffset: parseInt(inputs[2].value)||0 });
  });
  if (editingTemplateId) {
    const index = templates.findIndex(t => t.id === editingTemplateId);
    if (index !== -1) templates[index] = { id: editingTemplateId, title, items };
  } else {
    templates.push({ id: 'tpl-' + Date.now(), title, items });
  }
  syncStorage();
  closeModal('modal-template');
}

function deleteTemplate(id) {
  if (confirm("Vuoi davvero eliminare questo modello?")) {
    templates = templates.filter(t => t.id !== id);
    syncStorage();
  }
}

function populateTemplateSelect() {
  const select = document.getElementById('course-template-select');
  select.innerHTML = '<option value="">-- Nessun modello --</option>';
  templates.forEach(t => select.innerHTML += `<option value="${t.id}">${t.title}</option>`);
}

function saveCourse(e) {
  e.preventDefault();
  const name = document.getElementById('course-name').value.trim();
  const courseDateTimeStr = document.getElementById('course-datetime').value;
  const tplId = document.getElementById('course-template-select').value;
  const tasks = [];
  const courseDate = new Date(courseDateTimeStr);

  if (tplId) {
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) {
      tpl.items.forEach(item => {
        const taskDate = new Date(courseDate.getTime());
        taskDate.setDate(taskDate.getDate() + item.daysOffset);
        taskDate.setHours(taskDate.getHours() + item.hoursOffset);
        tasks.push({ id: 'task-' + Math.random().toString(36).substr(2, 9), text: item.text, dateTime: taskDate.toISOString(), completed: false, notified: false });
      });
    }
  }
  tasks.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  courses.unshift({ id: 'course-' + Date.now(), name, dateTime: courseDate.toISOString(), tasks });
  syncStorage();
  closeModal('modal-course');
}

function toggleTask(courseId, taskId) {
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  const task = course.tasks.find(t => t.id === taskId);
  if (task) task.completed = !task.completed;
  syncStorage();
}

function deleteCourse(id) {
  courses = courses.filter(c => c.id !== id);
  syncStorage();
}

async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display === 'granted') alert("Notifiche native attivate!");
  } else {
    if ("Notification" in window) {
      Notification.requestPermission().then(p => { if (p === "granted") alert("Notifiche browser attivate!"); });
    }
  }
}

async function checkDueNotifications() {
  const now = Date.now();
  let changed = false;
  for (const c of courses) {
    for (const t of c.tasks) {
      const taskTime = new Date(t.dateTime).getTime();
      if (!t.completed && taskTime <= now && (now - taskTime) < 7200000 && !t.notified) {
        if (Capacitor.isNativePlatform()) {
          await LocalNotifications.schedule({ notifications: [{ title: `Scadenza: ${c.name}`, body: t.text, id: Math.floor(Math.random() * 1000000) }] });
        } else if (("Notification" in window) && Notification.permission === "granted") {
          new Notification(`Scadenza: ${c.name}`, { body: t.text });
        }
        t.notified = true;
        changed = true;
      }
    }
  }
  if (changed) localStorage.setItem('memo_corsi_courses', JSON.stringify(courses));
}

setInterval(checkDueNotifications, 30000);

function render() {
  const courseContainer = document.getElementById('course-list');
  courseContainer.innerHTML = '';
  if (courses.length === 0) {
    document.getElementById('empty-courses').classList.remove('hidden');
  } else {
    document.getElementById('empty-courses').classList.add('hidden');
    courses.forEach(c => {
      const card = document.createElement('div');
      card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4";
      card.innerHTML = `
        <div class="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <h3 class="font-bold">${c.name}</h3>
          <button onclick="deleteCourse('${c.id}')" class="text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        ${c.tasks.map(t => `
          <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${c.id}', '${t.id}')">
            <span class="text-xs ${t.completed ? 'line-through text-slate-400' : ''}">${t.text}</span>
          </div>
        `).join('')}
      `;
      courseContainer.appendChild(card);
    });
  }

  const tplContainer = document.getElementById('template-list');
  tplContainer.innerHTML = '';
  templates.forEach(t => {
    const card = document.createElement('div');
    card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4";
    card.innerHTML = `
      <div class="flex justify-between items-center font-bold text-sm">
        ${t.title}
        <div>
          <button onclick="openTemplateModal('${t.id}')" class="text-indigo-500 mr-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button onclick="deleteTemplate('${t.id}')" class="text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>
    `;
    tplContainer.appendChild(card);
  });
  lucide.createIcons();
}

render();
checkDueNotifications();

// Esposizione funzioni globali necessarie per l'HTML
window.toggleTheme = toggleTheme;
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.openTemplateModal = openTemplateModal;
window.addTemplateActionRow = addTemplateActionRow;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.saveCourse = saveCourse;
window.toggleTask = toggleTask;
window.deleteCourse = deleteCourse;
window.requestNotificationPermission = requestNotificationPermission;
        
