const STORAGE_KEY = 'postulaciones-hg';

const initialApplications = [
  {
    id: crypto.randomUUID(),
    company: 'Mercado Libre',
    role: 'Frontend Developer',
    date: '2026-10-05',
    status: 'En proceso',
    notes: 'Se realizó entrevista técnica. Pendiente respuesta del equipo.'
  },
  {
    id: crypto.randomUUID(),
    company: 'Globant',
    role: 'QA Analyst',
    date: '2026-10-12',
    status: 'Enviado',
    notes: 'CV enviado y seguimiento pendiente.'
  }
];

const form = document.getElementById('application-form');
const applicationsList = document.getElementById('applications-list');
const emptyState = document.getElementById('empty-state');
const totalApplications = document.getElementById('total-applications');

function getApplications() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialApplications));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
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

function renderApplications() {
  const applications = getApplications();

  totalApplications.textContent = String(applications.length);

  if (applications.length === 0) {
    emptyState.hidden = false;
    applicationsList.innerHTML = '';
    return;
  }

  emptyState.hidden = true;

  applicationsList.innerHTML = applications
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

            <button class="delete-button" type="button" data-action="delete" data-id="${application.id}">
              Eliminar
            </button>
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const newApplication = {
    id: crypto.randomUUID(),
    company: formData.get('company').toString().trim(),
    role: formData.get('role').toString().trim(),
    date: formData.get('date').toString(),
    status: formData.get('status').toString(),
    notes: formData.get('notes').toString().trim()
  };

  if (!newApplication.company || !newApplication.role || !newApplication.date) {
    return;
  }

  const applications = getApplications();
  applications.unshift(newApplication);
  saveApplications(applications);
  form.reset();
  renderApplications();
});

applicationsList.addEventListener('change', (event) => {
  const target = event.target;

  if (target.matches('[data-action="update-status"]')) {
    const { id } = target.dataset;
    const newStatus = target.value;
    const applications = getApplications();
    const updatedApplications = applications.map((application) =>
      application.id === id ? { ...application, status: newStatus } : application
    );

    saveApplications(updatedApplications);
    renderApplications();
  }
});

applicationsList.addEventListener('click', (event) => {
  const target = event.target;

  if (!target.matches('[data-action="delete"]')) {
    return;
  }

  const { id } = target.dataset;
  const applications = getApplications().filter((application) => application.id !== id);
  saveApplications(applications);
  renderApplications();
});

renderApplications();

