const STORAGE_KEY_PREFIX = 'postulaciones-hg-user-';
const CURRENT_USER_KEY = 'postulaciones-hg-current-user';
const USERS_KEY = 'postulaciones-hg-users';
const THEME_STORAGE_KEY = 'postulaciones-hg-theme';
const MODE_STORAGE_KEY = 'postulaciones-hg-mode';
const PREFS_KEY_PREFIX = 'postulaciones-hg-prefs-';

const initialApplications = [];

const form = document.getElementById('application-form');
const applicationsList = document.getElementById('applications-list');
const emptyState = document.getElementById('empty-state');
const totalApplications = document.getElementById('total-applications');
const themeButtons = document.querySelectorAll('.theme-option');
const modeToggle = document.getElementById('mode-toggle');
const logoutButton = document.getElementById('logout-button');
const currentUserName = document.getElementById('current-user-name');
const currentUserEmail = document.getElementById('current-user-email');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const linkedinImportButton = document.getElementById('linkedin-import-button');

// Pantalla de cuenta
const authScreen = document.getElementById('auth-screen');
const authTabs = document.querySelectorAll('.auth-tab');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const registerError = document.getElementById('register-error');
const loginError = document.getElementById('login-error');

// Subir archivo
const fileInput = document.getElementById('cv');
const fileDrop = document.getElementById('file-drop');
const fileChosen = document.getElementById('file-chosen');
const fileChosenName = document.getElementById('file-chosen-name');
const fileChosenSize = document.getElementById('file-chosen-size');
const fileRemove = document.getElementById('file-remove');

/* ======================= Cuentas ======================= */

function getUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Devuelve el email de la sesión activa solo si la cuenta existe
function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_USER_KEY) || '';
  return email && getUsers()[email] ? email : '';
}

function setCurrentUser(email) {
  if (!email) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, email);
}

function getUserStorageKey(user) {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(user.trim().toLowerCase())}`;
}

function showAuthError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearAuthErrors() {
  registerError.hidden = true;
  loginError.hidden = true;
}

function switchAuthTab(tab) {
  const isRegister = tab === 'register';

  authTabs.forEach((button) => {
    const active = button.dataset.authTab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  registerForm.classList.toggle('hidden', !isRegister);
  loginForm.classList.toggle('hidden', isRegister);
  authTitle.textContent = isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  authSubtitle.textContent = isRegister
    ? 'Guarda y organiza tus postulaciones en un solo lugar.'
    : 'Ingresa para ver tus postulaciones.';
  clearAuthErrors();
}

async function handleRegister(event) {
  event.preventDefault();
  clearAuthErrors();

  const name = document.getElementById('register-name').value.trim();
  const email = normalizeEmail(document.getElementById('register-email').value);
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;

  if (!name) {
    showAuthError(registerError, 'Escribe tu nombre.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError(registerError, 'Ingresa un email válido.');
    return;
  }

  if (password.length < 6) {
    showAuthError(registerError, 'La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (password !== password2) {
    showAuthError(registerError, 'Las contraseñas no coinciden.');
    return;
  }

  const users = getUsers();

  if (users[email]) {
    showAuthError(registerError, 'Ya existe una cuenta con ese email. Inicia sesión.');
    return;
  }

  const salt = crypto.randomUUID();
  users[email] = {
    name,
    email,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };

  saveUsers(users);
  setCurrentUser(email);
  registerForm.reset();
  loadUserPrefs();
  renderAll();
  requestNotificationPermission();
  checkReminders();
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthErrors();

  const email = normalizeEmail(document.getElementById('login-email').value);
  const password = document.getElementById('login-password').value;
  const user = getUsers()[email];

  if (!user) {
    showAuthError(loginError, 'No encontramos una cuenta con ese email.');
    return;
  }

  const hash = await hashPassword(password, user.salt);

  if (hash !== user.passwordHash) {
    showAuthError(loginError, 'Contraseña incorrecta.');
    return;
  }

  setCurrentUser(email);
  loginForm.reset();
  loadUserPrefs();
  renderAll();
  requestNotificationPermission();
  checkReminders();
}

function handleLogout() {
  prefsLocked = true;
  setCurrentUser('');
  clearChosenFile();
  form.reset();
  switchAuthTab('login');
  renderAll();
}

function renderAuth() {
  const email = getCurrentUser();
  const hasUser = Boolean(email);

  authScreen.hidden = hasUser;
  document.body.classList.toggle('auth-locked', !hasUser);

  if (hasUser) {
    const user = getUsers()[email];
    currentUserName.textContent = user.name;
    currentUserEmail.textContent = user.email;
  } else {
    currentUserName.textContent = 'Usuario';
    currentUserEmail.textContent = '';
  }
}

function renderAll() {
  renderAuth();
  renderApplications();
}

/* ======================= Postulaciones ======================= */

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

/* ======================= Tema y modo ======================= */

function applyTheme(theme) {
  document.body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === theme;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  saveUserPrefs();
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'blue';
  applyTheme(savedTheme);
}

function applyMode(mode) {
  document.body.dataset.mode = mode;

  const isDark = mode === 'dark';
  modeToggle.querySelector('.mode-icon').textContent = isDark ? '☀️' : '🌙';
  modeToggle.querySelector('.mode-text').textContent = isDark ? 'Claro' : 'Oscuro';
  modeToggle.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');

  localStorage.setItem(MODE_STORAGE_KEY, mode);
  saveUserPrefs();
}

function initializeMode() {
  const saved = localStorage.getItem(MODE_STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyMode(saved || (prefersDark ? 'dark' : 'light'));
}

/* ======================= Preferencias por usuario ======================= */

let prefsLocked = true;

function getPrefsKey(user) {
  return `${PREFS_KEY_PREFIX}${encodeURIComponent(user.trim().toLowerCase())}`;
}

function saveUserPrefs() {
  const user = getCurrentUser();

  if (prefsLocked || !user) {
    return;
  }

  localStorage.setItem(
    getPrefsKey(user),
    JSON.stringify({ theme: document.body.dataset.theme, mode: document.body.dataset.mode })
  );
}

function loadUserPrefs() {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  prefsLocked = true;

  try {
    const prefs = JSON.parse(localStorage.getItem(getPrefsKey(user)));

    if (prefs && prefs.theme) applyTheme(prefs.theme);
    if (prefs && prefs.mode) applyMode(prefs.mode);
  } catch (error) {
    console.error('Error leyendo preferencias:', error);
  }

  prefsLocked = false;
  saveUserPrefs();
}

/* ======================= Render del listado ======================= */

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

/* ======================= Subir archivo ======================= */

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderChosenFile() {
  const file = fileInput.files && fileInput.files[0];

  if (!file) {
    fileChosen.classList.add('hidden');
    return;
  }

  fileChosenName.textContent = file.name;
  fileChosenSize.textContent = formatFileSize(file.size);
  fileChosen.classList.remove('hidden');
}

function clearChosenFile() {
  fileInput.value = '';
  renderChosenFile();
}

['dragenter', 'dragover'].forEach((eventName) => {
  fileDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    fileDrop.classList.add('is-dragging');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  fileDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    fileDrop.classList.remove('is-dragging');
  });
});

fileDrop.addEventListener('drop', (event) => {
  const files = event.dataTransfer && event.dataTransfer.files;

  if (files && files.length > 0) {
    fileInput.files = files;
    renderChosenFile();
  }
});

fileInput.addEventListener('change', renderChosenFile);
fileRemove.addEventListener('click', clearChosenFile);
form.addEventListener('reset', () => {
  // El reset limpia el input después de este evento
  setTimeout(renderChosenFile, 0);
});

/* ======================= Acciones ======================= */

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!getCurrentUser()) {
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

  try {
    saveApplications(applications);
  } catch (error) {
    showToast('No se pudo guardar: el archivo adjunto es demasiado grande para el almacenamiento del navegador.', 'error');
    return;
  }

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

/* ======================= Ventanas y avisos ======================= */

const toastContainer = document.getElementById('toast-container');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const editDialog = document.getElementById('edit-dialog');
const editForm = document.getElementById('edit-form');
const linkedinDialog = document.getElementById('linkedin-dialog');
const linkedinForm = document.getElementById('linkedin-form');
const linkedinText = document.getElementById('linkedin-text');
const linkedinCompany = document.getElementById('linkedin-company');
const linkedinRole = document.getElementById('linkedin-role');
const linkedinStatus = document.getElementById('linkedin-status');
const linkedinConfirm = document.getElementById('linkedin-confirm');
const linkedinPaste = document.getElementById('linkedin-paste');

let editingId = null;

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(message) {
  showToast(`⏰ ${message}`, 'info');

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Recordatorio de postulación', { body: message });
  }
}

function openConfirm({ title, message, confirmText = 'Confirmar' }) {
  return new Promise((resolve) => {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOk.textContent = confirmText;
    confirmDialog.returnValue = '';

    confirmDialog.addEventListener(
      'close',
      () => resolve(confirmDialog.returnValue === 'ok'),
      { once: true }
    );

    confirmDialog.showModal();
  });
}

// Cerrar con los botones "Cancelar"/✕ y al hacer clic fuera de la ventana
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-close]')) {
      dialog.close();
    }
  });
});

/* ======================= Eliminar y editar ======================= */

async function deleteApplication(applicationId) {
  const application = getApplications().find((item) => item.id === applicationId);

  if (!application) {
    return;
  }

  const confirmed = await openConfirm({
    title: 'Eliminar postulación',
    message: `¿Seguro que quieres eliminar la postulación a ${application.company} (${application.role})? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar'
  });

  if (!confirmed) {
    return;
  }

  saveApplications(getApplications().filter((item) => item.id !== applicationId));
  renderApplications();
  showToast('Postulación eliminada', 'success');
}

function editApplication(applicationId) {
  const application = getApplications().find((item) => item.id === applicationId);

  if (!application) {
    return;
  }

  editingId = applicationId;
  document.getElementById('edit-company').value = application.company;
  document.getElementById('edit-role').value = application.role;
  document.getElementById('edit-date').value = application.date;
  document.getElementById('edit-status').value = application.status;
  document.getElementById('edit-reminder').value = application.reminder || '';
  document.getElementById('edit-notes').value = application.notes || '';
  editDialog.showModal();
}

editForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const company = document.getElementById('edit-company').value.trim();
  const role = document.getElementById('edit-role').value.trim();
  const date = document.getElementById('edit-date').value;
  const status = document.getElementById('edit-status').value;
  const reminder = document.getElementById('edit-reminder').value;
  const notes = document.getElementById('edit-notes').value.trim();

  if (!company || !role || !date) {
    return;
  }

  const updatedApplications = getApplications().map((item) =>
    item.id === editingId
      ? {
          ...item,
          company,
          role,
          date,
          status,
          notes,
          reminder,
          // Si cambió el recordatorio, vuelve a avisar
          notified: reminder === item.reminder ? item.notified : false
        }
      : item
  );

  saveApplications(updatedApplications);
  editingId = null;
  editDialog.close();
  renderApplications();
  checkReminders();
  showToast('Cambios guardados', 'success');
});

/* ======================= Importar desde LinkedIn ======================= */

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function parseLinkedInText(raw) {
  const text = raw.trim();
  let company = '';
  let role = '';

  if (!text) {
    return { company, role };
  }

  // 1) Enlace de LinkedIn: .../jobs/view/rol-at-empresa-123456789
  const urlMatch = text.match(/linkedin\.com\/jobs\/view\/([^/?#\s]+)/i);

  if (urlMatch) {
    let slug = urlMatch[1];

    try {
      slug = decodeURIComponent(slug);
    } catch (error) {
      // se usa el texto tal cual
    }

    slug = slug.replace(/-\d{6,}$/, '');
    const atIndex = slug.lastIndexOf('-at-');

    if (atIndex > 0) {
      role = titleCase(slug.slice(0, atIndex));
      company = titleCase(slug.slice(atIndex + 4));
    } else if (!/^\d+$/.test(slug)) {
      role = titleCase(slug);
    }

    return { company, role };
  }

  // 2) Datos con etiqueta ("Empresa: ...", "Puesto: ...")
  const companyLabel = text.match(/^\s*(?:empresa|company|compañía|organización)\s*[:\-]\s*(.+)$/im);
  const roleLabel = text.match(/^\s*(?:rol|puesto|cargo|title|job title|posición)\s*[:\-]\s*(.+)$/im);

  if (companyLabel) company = companyLabel[1].trim();
  if (roleLabel) role = roleLabel[1].trim();

  if (company && role) {
    return { company, role };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // 3) "Rol en/at Empresa" en una sola línea
  if (!role && !company && lines.length > 0) {
    const inline = lines[0].match(/^(.{3,80}?)\s+(?:at|en|@)\s+(.{2,60}?)(?:\s*[|·\-–].*)?$/i);

    if (inline) {
      role = inline[1].trim();
      company = inline[2].trim();
      return { company, role };
    }
  }

  // 4) Formato copiado de LinkedIn: 1ª línea = rol, 2ª línea = "Empresa · Ciudad"
  if (!role && !company && lines.length >= 2 && lines[0].length <= 90) {
    role = lines[0];
    company = lines[1].split(/\s+[·•|]\s+/)[0].trim();
  }

  return { company, role };
}

function updateLinkedInPreview() {
  const { company, role } = parseLinkedInText(linkedinText.value);

  linkedinCompany.value = company;
  linkedinRole.value = role;
  updateLinkedInState();
}

function updateLinkedInState() {
  const hasCompany = Boolean(linkedinCompany.value.trim());
  const hasRole = Boolean(linkedinRole.value.trim());
  const hasAny = hasCompany || hasRole;

  linkedinConfirm.disabled = !(hasCompany || hasRole);
  linkedinStatus.classList.toggle('found', hasCompany && hasRole);

  if (hasCompany && hasRole) {
    linkedinStatus.textContent = 'Listo ✓';
  } else if (hasAny) {
    linkedinStatus.textContent = 'Datos parciales';
  } else {
    linkedinStatus.textContent = linkedinText.value.trim()
      ? 'No se detectó nada, complétalo a mano'
      : 'Esperando datos…';
  }
}

function importFromLinkedIn() {
  linkedinForm.reset();
  updateLinkedInState();
  linkedinDialog.showModal();
  linkedinText.focus();
}

linkedinText.addEventListener('input', updateLinkedInPreview);
linkedinCompany.addEventListener('input', updateLinkedInState);
linkedinRole.addEventListener('input', updateLinkedInState);

linkedinPaste.addEventListener('click', async () => {
  try {
    linkedinText.value = await navigator.clipboard.readText();
    updateLinkedInPreview();
  } catch (error) {
    showToast('No se pudo leer el portapapeles. Pega el texto manualmente.', 'error');
  }
});

linkedinForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const company = linkedinCompany.value.trim();
  const role = linkedinRole.value.trim();

  if (!company && !role) {
    return;
  }

  if (company) document.getElementById('company').value = company;
  if (role) document.getElementById('role').value = role;

  linkedinDialog.close();
  showToast('Datos importados al formulario', 'success');

  const dateField = document.getElementById('date');
  dateField.scrollIntoView({ behavior: 'smooth', block: 'center' });
  dateField.focus({ preventScroll: true });
});

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

/* ======================= Eventos ======================= */

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

authTabs.forEach((button) => {
  button.addEventListener('click', () => switchAuthTab(button.dataset.authTab));
});

registerForm.addEventListener('submit', handleRegister);
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);

modeToggle.addEventListener('click', () => {
  applyMode(document.body.dataset.mode === 'dark' ? 'light' : 'dark');
});

searchInput.addEventListener('input', renderApplications);
statusFilter.addEventListener('change', renderApplications);
linkedinImportButton.addEventListener('click', importFromLinkedIn);

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.theme);
  });
});

/* ======================= Inicio ======================= */

initializeTheme();
initializeMode();
loadUserPrefs();
switchAuthTab(Object.keys(getUsers()).length > 0 ? 'login' : 'register');
renderAll();
checkReminders();
setInterval(checkReminders, 60000);
