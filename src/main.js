import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './utils/supabase.js';
import { auth } from './utils/auth.js';
import './styles/main.css';
import { storage } from './utils/storage.js';
import { getNextDrawDates, getNextDraw, fetchLatestDraw } from './utils/lotteryApi.js';
import { checkCombo, formatCheckResults } from './components/checker.js';
import { renderStats, renderGridVisualization } from './components/stats.js';
import { generateByMode } from './utils/generator.js';
import { renderPersonalHistory, exportToCSV } from './components/history.js';
import { renderComboAnalysis } from './components/analysisDisplay.js';

console.log('[Supabase] Client chargé:', supabase ? 'OK' : 'null');

const AUTH_USER_KEY = 'supabase_user_id';

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initialisation de l\'application...');
  try {
    await storage.ensureDrawsLoaded();
    initTabs();
    initDarkMode();
    initAuth();
    initChecker();
    initGenerator();
    initHistory();
    initAdmin();
    updateDataInfo();
    renderAllStats();
    renderNextDrawNotification();
    console.log('Application initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
});

// Étape 2 : Auth simple (bouton + modal, user.id en localStorage)
function initAuth() {
  if (!supabase) return;
  const authBtn = document.getElementById('authBtn');
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const authError = document.getElementById('authError');
  const authModalClose = document.getElementById('authModalClose');
  const authModalTitle = document.getElementById('authModalTitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleLabel = document.getElementById('authToggleLabel');
  const authToggleMode = document.getElementById('authToggleMode');

  let authMode = 'signin'; // 'signin' | 'signup'

  function setAuthModalMode(mode) {
    authMode = mode;
    if (authModalTitle) authModalTitle.textContent = mode === 'signup' ? 'Sign up' : 'Sign in';
    if (authSubmitBtn) authSubmitBtn.textContent = mode === 'signup' ? 'Sign up' : 'Sign in';
    if (authToggleLabel) authToggleLabel.textContent = mode === 'signup' ? 'Already have an account? ' : "Don't have an account? ";
    if (authToggleMode) authToggleMode.textContent = mode === 'signup' ? 'Sign in' : 'Sign up';
  }

  function updateAuthButton() {
    const userId = localStorage.getItem(AUTH_USER_KEY);
    authBtn.textContent = userId ? 'Sign out' : 'Sign in';
  }

  async function loadCombosFromSupabase(userId) {
    if (!supabase || !userId) return;
    try {
      const { data: rows, error } = await supabase
        .from('personal_combos')
        .select('id, numbers, stars, date')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const combos = (rows || []).map(r => ({ id: r.id, numbers: r.numbers, stars: r.stars, date: r.date }));
      storage.setPersonalCombos(combos);
    } catch (e) {
      console.warn('Chargement combos Supabase:', e?.message || e);
    }
  }

  async function restoreSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      localStorage.setItem(AUTH_USER_KEY, session.user.id);
      await loadCombosFromSupabase(session.user.id);
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    updateAuthButton();
  }

  restoreSession();
  updateTabVisibility();
  updateAdminVisibility();

  // Garder le bouton synchronisé avec la session Supabase (ex. refresh token, autre onglet)
  auth.onAuthStateChange((session) => {
    if (session?.user?.id) {
      localStorage.setItem(AUTH_USER_KEY, session.user.id);
      loadCombosFromSupabase(session.user.id).then(() => {
        updateAuthButton();
        updateTabVisibility();
        updateAdminVisibility();
        renderHistory();
      });
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
      updateAuthButton();
      updateTabVisibility();
      updateAdminVisibility();
      renderHistory();
    }
  });

  authBtn.addEventListener('click', async () => {
    if (localStorage.getItem(AUTH_USER_KEY)) {
      await supabase.auth.signOut();
      localStorage.removeItem(AUTH_USER_KEY);
      storage.setPersonalCombos([]);
      renderHistory();
      updateTabVisibility();
      updateAdminVisibility();
      const firstTab = document.querySelector('.tab-btn[data-tab="checker"]');
      if (firstTab) firstTab.click();
      updateAuthButton();
      return;
    }
    setAuthModalMode('signin');
    authModal.hidden = false;
    if (authError) authError.textContent = '';
  });

  authToggleMode?.addEventListener('click', () => setAuthModalMode(authMode === 'signup' ? 'signin' : 'signup'));

  authModalClose?.addEventListener('click', () => { authModal.hidden = true; });
  authModal?.querySelector('.auth-modal-backdrop')?.addEventListener('click', () => { authModal.hidden = true; });

  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';
    const email = document.getElementById('authEmail')?.value?.trim();
    const password = document.getElementById('authPassword')?.value;
    if (!email || !password) return;

    if (authMode === 'signup') {
      const { data, error } = await auth.signUp(email, password);
      if (error) {
        if (authError) authError.textContent = error.message || 'Sign up failed';
        return;
      }
      if (data?.user) {
        if (data.session) {
          localStorage.setItem(AUTH_USER_KEY, data.user.id);
          await loadCombosFromSupabase(data.user.id);
          updateAuthButton();
          updateTabVisibility();
          updateAdminVisibility();
          renderHistory();
          authModal.hidden = true;
          authForm.reset();
        } else {
          if (authError) authError.textContent = 'Check your email to confirm your account.';
          authForm.reset();
        }
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (authError) authError.textContent = error.message || 'Sign in failed';
      return;
    }
    if (data?.user?.id) {
      localStorage.setItem(AUTH_USER_KEY, data.user.id);
      await loadCombosFromSupabase(data.user.id);
      updateAuthButton();
      updateTabVisibility();
      updateAdminVisibility();
      renderHistory();
    }
    authModal.hidden = true;
    authForm.reset();
  });
}

// Admin : visibilité du bouton et import CSV
function updateAdminVisibility() {
  const adminBtn = document.getElementById('adminBtn');
  if (!adminBtn) return;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail) {
    adminBtn.style.display = 'none';
    return;
  }
  supabase?.auth.getSession().then(({ data: { session } }) => {
    const userEmail = (session?.user?.email || '').toLowerCase().trim();
    const envEmail = (adminEmail || '').toLowerCase().trim();
    const isAdmin = userEmail && envEmail && userEmail === envEmail;
    adminBtn.style.display = isAdmin ? '' : 'none';
  });
}

function initAdmin() {
  const adminBtn = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminModal');
  const adminModalClose = document.getElementById('adminModalClose');
  const adminCsvInput = document.getElementById('adminCsvInput');
  const adminCsvFile = document.getElementById('adminCsvFile');
  const adminImportBtn = document.getElementById('adminImportBtn');
  const adminImportStatus = document.getElementById('adminImportStatus');

  if (!adminBtn || !adminModal) return;

  adminBtn.addEventListener('click', () => {
    adminModal.hidden = false;
    adminCsvInput.value = '';
    adminCsvFile.value = '';
    if (adminImportStatus) adminImportStatus.textContent = '';
  });

  adminModalClose?.addEventListener('click', () => { adminModal.hidden = true; });
  adminModal?.querySelector('.auth-modal-backdrop')?.addEventListener('click', () => { adminModal.hidden = true; });

  adminCsvFile?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (adminCsvInput) adminCsvInput.value = text;
    e.target.value = '';
  });

  adminImportBtn?.addEventListener('click', async () => {
    const csv = (adminCsvInput?.value || '').trim();
    if (!csv) {
      if (adminImportStatus) adminImportStatus.textContent = 'Collez ou sélectionnez un fichier CSV.';
      return;
    }
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      if (adminImportStatus) adminImportStatus.textContent = 'Connectez-vous d\'abord.';
      return;
    }
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    const token = refreshed?.access_token || session.access_token;

    if (adminImportStatus) adminImportStatus.textContent = 'Import en cours...';
    adminImportBtn.disabled = true;

    const baseUrl = SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
    const url = `${baseUrl}/functions/v1/admin-import-csv`;
    const anonKey = SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const adminSecret = import.meta.env.VITE_ADMIN_IMPORT_SECRET || '';
    const useSecretAuth = !!adminSecret;
    const bodyPayload = useSecretAuth ? { csv, adminSecret } : { csv };
    const bearer = useSecretAuth ? anonKey : token;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearer}`,
          'apikey': anonKey
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = [data?.error, data?.detail].filter(Boolean).join(' — ') || `Erreur ${res.status}`;
        if (adminImportStatus) adminImportStatus.textContent = errMsg;
        return;
      }
      if (adminImportStatus) adminImportStatus.textContent = `OK : ${data?.added ?? 0} ajoutés, ${data?.duplicates ?? 0} doublons ignorés.`;
      storage.invalidateDrawsCache();
      storage.ensureDrawsLoaded().then(() => {
        updateDataInfo();
        renderAllStats();
        renderNextDrawNotification();
      });
    } catch (e) {
      if (adminImportStatus) adminImportStatus.textContent = e?.message || 'Erreur réseau';
    } finally {
      adminImportBtn.disabled = false;
    }
  });
}

// Visibilité des onglets selon la connexion (Historique, Stats = connecté uniquement)
function updateTabVisibility() {
  const userId = localStorage.getItem(AUTH_USER_KEY);
  const historyTab = document.querySelector('.tab-btn[data-tab="history"]');
  const statsTab = document.querySelector('.tab-btn[data-tab="stats"]');
  const showAuthTabs = !!userId;
  [historyTab, statsTab].forEach(btn => {
    if (btn) btn.style.display = showAuthTabs ? '' : 'none';
  });
  // Si on est sur un onglet masqué, basculer vers checker
  if (!showAuthTabs) {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && (activeTab.dataset.tab === 'history' || activeTab.dataset.tab === 'stats')) {
      const checkerTab = document.querySelector('.tab-btn[data-tab="checker"]');
      if (checkerTab) checkerTab.click();
    }
  }
}

// Gestion des onglets
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Désactiver tous les onglets
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Activer l'onglet sélectionné
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');

      // Recharger selon l'onglet
      if (targetTab === 'stats') {
        renderAllStats();
      } else if (targetTab === 'history') {
        renderHistory();
      } else if (targetTab === 'calendar') {
        renderCalendar();
      }
    });
  });
}

// Dark mode
function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = '☀️';
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    toggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// Vérification de combo
function initChecker() {
  const form = document.getElementById('checkerForm');
  const resultsDiv = document.getElementById('checkerResults');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const numberInputs = form.querySelectorAll('.number-input');
    const starInputs = form.querySelectorAll('.star-input');
    const numbers = Array.from(numberInputs).map(input => parseInt(input.value, 10));
    const stars = Array.from(starInputs).map(input => parseInt(input.value, 10));

    // Validation
    if (numbers.some(n => isNaN(n) || n < 1 || n > 50)) {
      resultsDiv.innerHTML = '<div class="status-message error">Veuillez entrer des numéros valides (1-50).</div>';
      return;
    }
    if (stars.some(s => isNaN(s) || s < 1 || s > 12)) {
      resultsDiv.innerHTML = '<div class="status-message error">Veuillez entrer des étoiles valides (1-12).</div>';
      return;
    }

    const combo = { numbers, stars };
    const results = checkCombo(combo);
    resultsDiv.innerHTML = formatCheckResults(results, combo);

    // Visualisation de grille
    const gridHtml = renderGridVisualization(combo);
    resultsDiv.innerHTML += gridHtml;

    const userId = localStorage.getItem(AUTH_USER_KEY);
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-secondary save-combo-btn';
    if (userId) {
      saveBtn.dataset.numbers = numbers.join(',');
      saveBtn.dataset.stars = stars.join(',');
      saveBtn.textContent = '💾 Sauvegarder cette combo';
    } else {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Connectez-vous pour sauvegarder';
    }
    resultsDiv.appendChild(saveBtn);
  });
}

// Générateur (3 modes : aléatoire, optimisé, extrême)
function initGenerator() {
  const generateBtn = document.getElementById('generateBtn');
  const comboDiv = document.getElementById('generatedCombo');
  const resultsDiv = document.getElementById('generatorResults');

  generateBtn.addEventListener('click', () => {
    const modeInput = document.querySelector('input[name="generatorMode"]:checked');
    const mode = modeInput ? modeInput.value : 'optimized';

    // Animation de chargement
    generateBtn.disabled = true;
    generateBtn.classList.add('generating');
    comboDiv.innerHTML = '<div class="combo-loading">⏳ Génération...</div>';
    resultsDiv.innerHTML = '';

    // Laisser le navigateur afficher l'état de chargement avant le calcul
    requestAnimationFrame(() => {
      setTimeout(() => {
        const draws = storage.getHistory();
        const personalCombos = storage.getPersonalCombos();
        const result = generateByMode(mode, draws, personalCombos);

        generateBtn.disabled = false;
        generateBtn.classList.remove('generating');

        // Afficher la combo (boules grises + étoiles dorées) + bouton sauvegarder
        const nums = result.combo.numbers;
        const stars = result.combo.stars;
        const userId = localStorage.getItem(AUTH_USER_KEY);
        let html = '<div class="combo-display">';
        nums.forEach(num => { html += `<div class="combo-number">${num}</div>`; });
        stars.forEach(star => { html += `<div class="combo-star">${star}</div>`; });
        html += '</div>';
        if (userId) {
          html += `<button type="button" class="btn-secondary save-combo-btn" data-numbers="${nums.join(',')}" data-stars="${stars.join(',')}">💾 Sauvegarder cette combo</button>`;
        } else {
          html += `<button type="button" class="btn-secondary save-combo-btn" disabled>Connectez-vous pour sauvegarder</button>`;
        }
        comboDiv.innerHTML = html;

        // Analyse complète (nouveau design) + grille
        let resultsHtml = '<div class="results">';
        resultsHtml += renderComboAnalysis(result.combo, result.banalityScore);
        resultsHtml += renderGridVisualization(result.combo);
        resultsHtml += '</div>';
        resultsDiv.innerHTML = resultsHtml;
      }, 150);
    });
  });
}

// Historique personnel
function initHistory() {
  const exportBtn = document.getElementById('exportBtn');

  // Export CSV
  exportBtn.addEventListener('click', () => {
    const csv = exportToCSV();
    if (!csv) {
      alert('Aucune combinaison à exporter.');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `combo-check-combos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Gestion de la suppression
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.getAttribute('data-id');
      if (confirm('Supprimer cette combinaison ?')) {
        await storage.deletePersonalCombo(id);
        renderHistory();
      }
    }
    // Gestion du bouton "Sauvegarder cette combo" (Générer / Vérifier)
    if (e.target.classList.contains('save-combo-btn')) {
      const btn = e.target;
      if (btn.disabled) return;
      const numbers = btn.dataset.numbers?.split(',').map(n => parseInt(n.trim(), 10));
      const stars = btn.dataset.stars?.split(',').map(s => parseInt(s.trim(), 10));
      if (numbers?.length === 5 && stars?.length === 2) {
        const saved = await storage.addPersonalCombo({ numbers, stars });
        if (saved) {
          btn.textContent = '✓ Sauvegardé !';
          btn.disabled = true;
          renderHistory();
        }
      }
    }
  });

  renderHistory();
}

function renderHistory() {
  const savedDiv = document.getElementById('savedCombos');
  const exportBtn = document.getElementById('exportBtn');
  const userId = localStorage.getItem(AUTH_USER_KEY);

  if (exportBtn) exportBtn.disabled = !userId;

  if (!savedDiv) return;
  if (!userId) {
    savedDiv.innerHTML = '<p class="info-text">Connectez-vous pour sauvegarder des combos et voir votre historique.</p>';
    return;
  }
  savedDiv.innerHTML = renderPersonalHistory();
}

// Mise à jour des infos de données
function updateDataInfo() {
  const infoDiv = document.getElementById('dataInfo');
  if (!infoDiv) return;
  const draws = storage.getHistory();
  
  if (draws.length > 0) {
    // Tri chronologique (pas en chaîne : DD/MM/YYYY trié en string donnerait un mauvais ordre)
    const parseDate = (d) => new Date(d.split('/').reverse().join('-'));
    const sorted = draws.slice().sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const firstDate = sorted[0].date;
    const lastDate = sorted[sorted.length - 1].date;

    const firstYear = parseDate(firstDate).getFullYear();
    const lastYear = parseDate(lastDate).getFullYear();
    const yearsCovered = lastYear - firstYear + 1;
    
    infoDiv.innerHTML = `
      <div class="data-info">
        <p><strong>📊 ${draws.length} tirages chargés</strong></p>
        <p><strong>Période :</strong> Du ${firstDate} au ${lastDate}</p>
        <p><strong>Couverture :</strong> ${yearsCovered} année${yearsCovered > 1 ? 's' : ''} (${firstYear} - ${lastYear})</p>
        <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-secondary);">
          💡 Les données sont mises à jour automatiquement.
        </p>
      </div>
    `;
  } else {
    infoDiv.innerHTML = '';
  }
}

// Notification prochain tirage (home)
function renderNextDrawNotification() {
  const div = document.getElementById('nextDrawNotification');
  if (!div) return;
  const next = getNextDraw();
  const draws = storage.getHistory();
  const parseDate = (d) => new Date(d.split('/').reverse().join('-'));
  const lastDraw = draws.length > 0
    ? draws.slice().sort((a, b) => parseDate(a.date) - parseDate(b.date)).pop()
    : null;
  let html = '';
  if (next) {
    html += `<p><strong>Prochain tirage :</strong> ${next.label}</p>`;
  }
  if (lastDraw) {
    html += `<p><strong>Dernier tirage :</strong> ${lastDraw.date} — ${lastDraw.numbers.join(' - ')} + ${lastDraw.stars.join(' - ')}</p>`;
  } else {
    fetchLatestDraw().then(draw => {
      if (draw) {
        div.insertAdjacentHTML('beforeend', `<p><strong>Dernier tirage :</strong> ${draw.date} — ${draw.numbers.join(' - ')} + ${draw.stars.join(' - ')}</p>`);
      }
    });
  }
  if (html) div.innerHTML = html;
}

// Rendu du calendrier
function renderCalendar() {
  const div = document.getElementById('calendarContent');
  if (!div) return;
  const dates = getNextDrawDates(8);
  let html = '<div class="calendar-list">';
  html += '<p><strong>Prochains tirages (mardi et vendredi)</strong></p>';
  html += '<ul>';
  dates.forEach(({ label }) => {
    html += `<li>${label}</li>`;
  });
  html += '</ul>';
  const draws = storage.getHistory();
  const parseDateCal = (d) => new Date(d.split('/').reverse().join('-'));
  const lastDraw = draws.length > 0
    ? draws.slice().sort((a, b) => parseDateCal(a.date) - parseDateCal(b.date)).pop()
    : null;
  if (lastDraw) {
    html += `<p style="margin-top: 15px;"><strong>Dernier tirage :</strong> ${lastDraw.date} — ${lastDraw.numbers.join(' - ')} + ${lastDraw.stars.join(' - ')}</p>`;
  }
  html += '</div>';
  div.innerHTML = html;
  if (!lastDraw) {
    fetchLatestDraw().then(draw => {
      if (draw) {
        const extra = `<p style="margin-top: 15px;"><strong>Dernier tirage :</strong> ${draw.date} — ${draw.numbers.join(' - ')} + ${draw.stars.join(' - ')}</p>`;
        div.insertAdjacentHTML('beforeend', extra);
      }
    });
  }
}

// Rendu des statistiques
function renderAllStats() {
  const statsDiv = document.getElementById('statsContent');
  if (statsDiv) {
    statsDiv.innerHTML = renderStats();
  }
}
