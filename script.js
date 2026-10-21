const STORAGE_KEY_PREFIX = 'postulaciones-hg-user-';
const CURRENT_USER_KEY = 'postulaciones-hg-current-user';
const THEME_STORAGE_KEY = 'postulaciones-hg-theme';

const initialApplications = [
  {
    id: crypto.randomUUID(),
    company: 'Mercado Libre',
    role: 'Frontend Developer',
    date: '2026-10-05',
    status: 'En proceso',
    notes: 'Se realizó entrevista técnica. Pendiente respuesta del equipo.',
    reminder: '',
    notified: false,
    attachmentName: '',
    attachmentData: ''
  },
  {
    id: crypto.randomUUID(),
    company: 'Globant',
    role: 'QA Analyst',
    date: '2026-10-12',
    status: 'Enviado',
    notes: 'CV enviado y seguimiento pendiente.',
    reminder: '',
    notified: false,
    attachmentName: '',
    attachmentData: ''
  }
];

const form = document.getElementById('application-form');
const applicationsList = document.getElementById('applications-list');
const emptyState = document.getElementById('empty-state');
const totalApplications = document.getElementById('total-applications');
const themeButtons = document.querySelectorAll('.theme-option');
const loginForm = document.getElementById('login-form');
const userNameInput = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-button');
const currentUserBox = document.getElementById('current-user-box');
const currentUserName = document.getElementById('current-user-name');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const linkedinImportButton = document.getElementById('linkedin-import-button');

function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY) || '';
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, user);
}

function getUserStorageKey(user) {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(user.trim().toLowerCase())}`;
}

function getApplications() {
  const user = getCurrentUser();

  if (!user) {
    return [];
  }

  const storageKey = getUserStorageKey(user);
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    localStorage.setItem(storageKey, JSON.stringify(initialApplications));
    return [...initialApplications];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...initialApplications];
  } catch (error) {
    console.error('Error leyendo postulaciones:', error);
    return [...initialApplications];
  }
}

function saveApplications(applications) {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  localStorage.setItem(getUserStorageKey(user), JSON.stringify(applications));
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';

  const date = new Date(dateString + 'T00:00:00');

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatDateTime(dateString) {
  if (!dateString) return 'Sin recordatorio';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Sin recordatorio';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === theme;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'blue';
  applyTheme(savedTheme);
}

function renderAuth() {
  const user = getCurrentUser();
  const hasUser = Boolean(user);

  loginForm.classList.toggle('hidden', hasUser);
  logoutButton.classList.toggle('hidden', !hasUser);
  currentUserBox.classList.toggle('hidden', !hasUser);

  if (hasUser) {
    currentUserName.textContent = user;
    form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach((element) => {
      if (element.id !== 'cv') {
        element.disabled = false;
      }
    });
  } else {
    currentUserName.textContent = 'Usuario';
    form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach((element) => {
      if (element.id !== 'cv') {
        element.disabled = true;
      }
    });
  }
}

function renderApplications() {
  const applications = getApplications();
  const query = searchInput.value.trim().toLowerCase();
  const statusValue = statusFilter.value;

  const filteredApplications = applications.filter((application) => {
    const matchesSearch =
      !query ||
      `${application.company} ${application.role}`.toLowerCase().includes(query);

    const matchesStatus =
      statusValue === 'all' || application.status === statusValue;

    return matchesSearch && matchesStatus;
  });

  totalApplications.textContent = String(applications.length);

  if (filteredApplications.length === 0) {
    emptyState.hidden = false;
    applicationsList.innerHTML = '';
    return;
  }

  emptyState.hidden = true;

  applicationsList.innerHTML = filteredApplications
    .map(
      (application) => `
        <li class="application-item" data-id="${application.id}">
          <div class="application-top">
            <div>
              <div class="company-name">${escapeHtml(application.company)}</div>
            </div>
            <span class="status-badge" data-status="${escapeHtml(application.status)}">
              ${escapeHtml(application.status)}
            </span>
          </div>

          <div class="meta">
            <div class="meta-item">
              <span>Rol:</span>
              <strong>${escapeHtml(application.role)}</strong>
            </div>
            <div class="meta-item">
              <span>Fecha:</span>
              <strong>${formatDate(application.date)}</strong>
            </div>
          </div>

          ${
            application.notes
              ? `<p class="notes">${escapeHtml(application.notes)}</p>`
              : '<p class="notes">Sin notas de seguimiento.</p>'
          }

          ${
            application.reminder
              ? `<div class="reminder-tag">⏰ ${escapeHtml(formatDateTime(application.reminder))}</div>`
              : ''
          }

          ${
            application.attachmentData
              ? `<a class="attachment-link" href="${application.attachmentData}" download="${escapeHtml(application.attachmentName || 'cv-adjunto')}">📎 Ver archivo adjunto</a>`
              : '<span class="muted-text">Sin archivo adjunto</span>'
          }

          <div class="item-actions">
            <div class="item-status">
              <label for="status-${application.id}">Estado</label>
              <select id="status-${application.id}" data-action="update-status" data-id="${application.id}">
                <option value="Enviado" ${application.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                <option value="En proceso" ${application.status === 'En proceso' ? 'selected' : ''}>En proceso</option>
                <option value="Rechazado" ${application.status === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
                <option value="Oferta" ${application.status === 'Oferta' ? 'selected' : ''}>Oferta</option>
              </select>
            </div>

            <div class="card-actions">
              <button class="action-button" type="button" data-action="edit" data-id="${application.id}">
                Editar
              </button>
              <button class="delete-button" type="button" data-action="delete" data-id="${application.id}">
                Eliminar
              </button>
            </div>
          </div>
        </li>
      `
    )
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!getCurrentUser()) {
    alert('Primero inicia sesión para guardar postulaciones.');
    return;
  }

  const formData = new FormData(form);
  const selectedFile = formData.get('cv');

  let attachmentName = '';
  let attachmentData = '';

  if (selectedFile && selectedFile.size > 0) {
    attachmentName = selectedFile.name;
    attachmentData = await fileToBase64(selectedFile);
  }

  const newApplication = {
    id: crypto.randomUUID(),
    company: formData.get('company').toString().trim(),
    role: formData.get('role').toString().trim(),
    date: formData.get('date').toString(),
    status: formData.get('status').toString(),
    reminder: formData.get('reminder').toString(),
    notes: formData.get('notes').toString().trim(),
    attachmentName,
    attachmentData,
    notified: false
  };

  if (!newApplication.company || !newApplication.role || !newApplication.date) {
    return;
  }

  const applications = getApplications();
  applications.unshift(newApplication);
  saveApplications(applications);
  form.reset();
  renderApplications();
  checkReminders();
}

function updateStatus(applicationId, newStatus) {
  const applications = getApplications();
  const updatedApplications = applications.map((application) =>
    application.id === applicationId ? { ...application, status: newStatus } : application
  );

  saveApplications(updatedApplications);
  renderApplications();
}

function deleteApplication(applicationId) {
  const applications = getApplications().filter((application) => application.id !== applicationId);
  saveApplications(applications);
  renderApplications();
}

function editApplication(applicationId) {
  const applications = getApplications();
  const application = applications.find((item) => item.id === applicationId);

  if (!application) {
    return;
  }

  const newCompany = prompt('Editar empresa:', application.company);

  if (newCompany === null) {
    return;
  }

  const newRole = prompt('Editar rol:', application.role);

  if (newRole === null) {
    return;
  }

  const updatedApplications = applications.map((item) =>
    item.id === applicationId
      ? {
          ...item,
          company: newCompany.trim() || item.company,
          role: newRole.trim() || item.role
        }
      : item
  );

  saveApplications(updatedApplications);
  renderApplications();
}

function parseLinkedInText(text) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  let company = '';
  let role = '';

  const companyMatch = normalizedText.match(/(?:at|@|en)\s+([A-Z][A-Za-z0-9&.\-\s]{2,60})(?:\s+[|–-]|\s*$)/i);
  const roleMatch = normalizedText.match(/(?:Role|Rol|Title|Puesto|Cargo|Posición|Trabajo)\s*[:\-]*\s*([A-Za-z0-9 /+&.-]{2,60})/i);

  if (companyMatch) {
    company = companyMatch[1].trim();
  }

  if (roleMatch) {
    role = roleMatch[1].trim();
  }

  if (!company) {
    const firstLine = normalizedText.split(/\s*[-|–]\s*/)[0];
    company = firstLine.length > 0 ? firstLine : 'Empresa';
  }

  if (!role) {
    const fallbackRole = normalizedText.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})/);
    role = fallbackRole ? fallbackRole[1].trim() : 'Rol';
  }

  return { company, role };
}

function importFromLinkedIn() {
  const text = window.prompt(
    'Pegá aquí el texto o descripción del anuncio de LinkedIn para importar la empresa y el rol:'
  );

  if (!text) {
    return;
  }

  const { company, role } = parseLinkedInText(text);
  document.getElementById('company').value = company;
  document.getElementById('role').value = role;
}

function showNotification(message) {
  if ('Notification' in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Recordatorio de postulación', { body: message });
      }
    });
  }

  alert(message);
}

function checkReminders() {
  const applications = getApplications();
  let changed = false;

  applications.forEach((application) => {
    if (!application.reminder || application.notified) {
      return;
    }

    const reminderDate = new Date(application.reminder);
    const now = new Date();

    if (!Number.isNaN(reminderDate.getTime()) && reminderDate <= now) {
      application.notified = true;
      changed = true;
      showNotification(`Recordatorio: ${application.company} - ${application.role}`);
    }
  });

  if (changed) {
    saveApplications(applications);
  }
}

form.addEventListener('submit', handleFormSubmit);

applicationsList.addEventListener('change', (event) => {
  const target = event.target;

  if (target.matches('[data-action="update-status"]')) {
    updateStatus(target.dataset.id, target.value);
  }
});

applicationsList.addEventListener('click', (event) => {
  const target = event.target;

  if (target.matches('[data-action="delete"]')) {
    deleteApplication(target.dataset.id);
    return;
  }

  if (target.matches('[data-action="edit"]')) {
    editApplication(target.dataset.id);
  }
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = userNameInput.value.trim();

  if (!username) {
    return;
  }

  setCurrentUser(username);
  renderAuth();
  renderApplications();
  checkReminders();
  loginForm.reset();
});

logoutButton.addEventListener('click', () => {
  setCurrentUser('');
  renderAuth();
  renderApplications();
});

searchInput.addEventListener('input', renderApplications);
statusFilter.addEventListener('change', renderApplications);
linkedinImportButton.addEventListener('click', importFromLinkedIn);

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.theme);
  });
});

initializeTheme();
renderAuth();
renderApplications();
checkReminders();
setInterval(checkReminders, 60000);
