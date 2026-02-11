import './styles/main.css';
import { parseFile, parseCSV } from './utils/dataParser.js';
import { storage } from './utils/storage.js';
import { checkCombo, formatCheckResults } from './components/checker.js';
import { renderStats, renderGridVisualization } from './components/stats.js';
import { generateByMode } from './utils/generator.js';
import { renderPersonalHistory, exportToCSV } from './components/history.js';
import { renderComboAnalysis } from './components/analysisDisplay.js';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialisation de l\'application...');
  try {
    initTabs();
    initDarkMode();
    initImport();
    initChecker();
    initGenerator();
    initHistory();
    updateDataInfo();
    renderAllStats();
    console.log('Application initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
});

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

      // Recharger les stats si nécessaire
      if (targetTab === 'stats') {
        renderAllStats();
      } else if (targetTab === 'history') {
        renderHistory();
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

// Applique les tirages importés (fusion, dédoublonnage, sauvegarde, UI)
function applyImportedDraws(allNewDraws, totalImported, totalErrors, statusDiv) {
  const existing = storage.getHistory();
  if (totalImported === 0) {
    statusDiv.innerHTML = `<div class="status-message error">
      Aucune donnée valide trouvée.<br>
      ${totalErrors > 0 ? `Total d'erreurs: ${totalErrors}<br>` : ''}
      Vérifiez le format du CSV.
    </div>`;
    statusDiv.style.display = 'block';
    return;
  }
  const combined = [...existing, ...allNewDraws];
  const unique = combined.filter((draw, index, self) =>
    index === self.findIndex(d =>
      d.date === draw.date &&
      JSON.stringify(d.numbers) === JSON.stringify(draw.numbers)
    )
  );
  const newUnique = unique.length - existing.length;
  storage.saveHistory(unique);
  console.log('Données sauvegardées:', unique.length, 'tirages (dont', newUnique, 'nouveaux)');
  statusDiv.innerHTML = `<div class="status-message success">
    ✅ ${totalImported} tirages importés avec succès !<br>
    ${newUnique > 0 ? `<strong>${newUnique} nouveaux tirages ajoutés</strong><br>` : ''}
    Total en base: ${unique.length} tirages
    ${totalErrors > 0 ? `<br>⚠️ ${totalErrors} lignes ignorées (format invalide ou doublons)` : ''}
  </div>`;
  statusDiv.style.display = 'block';
  updateDataInfo();
  renderAllStats();
  setTimeout(() => {
    const statsTab = document.querySelector('[data-tab="stats"]');
    if (statsTab) statsTab.click();
  }, 1500);
}

// Import de fichiers
function initImport() {
  const fileInput = document.getElementById('csvFileInput');
  const statusDiv = document.getElementById('importStatus');
  const pasteInput = document.getElementById('csvPasteInput');
  const pasteBtn = document.getElementById('csvPasteBtn');

  if (!fileInput || !statusDiv) {
    console.error('Éléments d\'import introuvables');
    return;
  }


  // Import par collage (alternative mobile)
  if (pasteBtn && pasteInput) {
    pasteBtn.addEventListener('click', () => {
      const text = (pasteInput.value || '').trim();
      if (!text) {
        statusDiv.innerHTML = '<div class="status-message error">Collez d’abord le contenu du fichier CSV dans la zone ci‑dessus.</div>';
        statusDiv.style.display = 'block';
        return;
      }
      statusDiv.innerHTML = '<div class="status-message info">⏳ Traitement du CSV collé...</div>';
      statusDiv.style.display = 'block';
      try {
        const result = parseCSV(text);
        applyImportedDraws(result.draws, result.valid, result.errors, statusDiv);
        pasteInput.value = '';
      } catch (error) {
        console.error('Erreur import par collage:', error);
        statusDiv.innerHTML = `<div class="status-message error">
          Erreur lors de l'import du CSV collé.<br>
          ${error.message || 'Erreur inconnue'}
        </div>`;
      }
    });
  }

  // Afficher le nom du fichier sélectionné
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    const fileNameDiv = document.getElementById('fileName');
    
    if (files.length === 0) {
      console.log('Aucun fichier sélectionné');
      if (fileNameDiv) fileNameDiv.textContent = '';
      statusDiv.style.display = 'none';
      return;
    }

    if (fileNameDiv) {
      if (files.length === 1) {
        fileNameDiv.textContent = `📄 ${files[0].name} (${(files[0].size / 1024).toFixed(2)} Ko)`;
      } else {
        fileNameDiv.textContent = `📄 ${files.length} fichiers sélectionnés (${files.map(f => f.name).join(', ')})`;
      }
      fileNameDiv.style.display = 'block';
    }
    
    statusDiv.innerHTML = `<div class="status-message info">⏳ Traitement de ${files.length} fichier(s) en cours...</div>`;
    statusDiv.style.display = 'block';

    try {
      let totalImported = 0;
      let totalErrors = 0;
      let allNewDraws = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Traitement du fichier ${i + 1}/${files.length}:`, file.name);
        statusDiv.innerHTML = `<div class="status-message info">⏳ Traitement du fichier ${i + 1}/${files.length}: ${file.name}...</div>`;
        const result = await parseFile(file);
        console.log('Résultat du parsing:', result);
        if (result.valid > 0) {
          allNewDraws.push(...result.draws);
          totalImported += result.valid;
          totalErrors += result.errors;
        } else {
          totalErrors += result.total;
        }
      }

      applyImportedDraws(allNewDraws, totalImported, totalErrors, statusDiv);
      fileInput.value = '';
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      statusDiv.innerHTML = `<div class="status-message error">
        Erreur lors de l'import des fichiers.<br>
        ${error.message || 'Erreur inconnue'}<br>
        Vérifiez la console pour plus de détails.
      </div>`;
    }
  });
}

// Vérification de combo
function initChecker() {
  const form = document.getElementById('checkerForm');
  const resultsDiv = document.getElementById('checkerResults');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:initChecker',message:'checker init',data:{formExists:!!form,resultsDivExists:!!resultsDiv},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // #region agent log
    const numberInputs = form.querySelectorAll('.number-input');
    const starInputs = form.querySelectorAll('.star-input');
    const numbers = Array.from(numberInputs).map(input => parseInt(input.value));
    const stars = Array.from(starInputs).map(input => parseInt(input.value));
    const draws = storage.getHistory();
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:checker:submit',message:'before checkCombo',data:{numbers,stars,drawsCount:draws.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:checker:afterCheck',message:'checkCombo result',data:{hasError:!!results.error,errorMsg:results.error||null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    resultsDiv.innerHTML = formatCheckResults(results, combo);

    // Visualisation de grille
    const gridHtml = renderGridVisualization(combo);
    resultsDiv.innerHTML += gridHtml;

    // Bouton sauvegarder (uniquement après vérification réussie)
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-secondary save-combo-btn';
    saveBtn.dataset.numbers = numbers.join(',');
    saveBtn.dataset.stars = stars.join(',');
    saveBtn.textContent = '💾 Sauvegarder cette combo';
    resultsDiv.appendChild(saveBtn);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:checker:afterAppend',message:'save btn appended',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
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
        const result = generateByMode(mode, draws);

        generateBtn.disabled = false;
        generateBtn.classList.remove('generating');

        // Afficher la combo (boules grises + étoiles dorées) + bouton sauvegarder
        const nums = result.combo.numbers;
        const stars = result.combo.stars;
        let html = '<div class="combo-display">';
        nums.forEach(num => { html += `<div class="combo-number">${num}</div>`; });
        stars.forEach(star => { html += `<div class="combo-star">${star}</div>`; });
        html += '</div>';
        html += `<button type="button" class="btn-secondary save-combo-btn" data-numbers="${nums.join(',')}" data-stars="${stars.join(',')}">💾 Sauvegarder cette combo</button>`;
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
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = parseInt(e.target.getAttribute('data-id'));
      if (confirm('Supprimer cette combinaison ?')) {
        storage.deletePersonalCombo(id);
        renderHistory();
      }
    }
    // Gestion du bouton "Sauvegarder cette combo" (Générer / Vérifier)
    if (e.target.classList.contains('save-combo-btn')) {
      const btn = e.target;
      const numbers = btn.dataset.numbers?.split(',').map(n => parseInt(n.trim()));
      const stars = btn.dataset.stars?.split(',').map(s => parseInt(s.trim()));
      if (numbers?.length === 5 && stars?.length === 2) {
        storage.addPersonalCombo({ numbers, stars });
        btn.textContent = '✓ Sauvegardé !';
        btn.disabled = true;
        renderHistory();
      }
    }
  });

  renderHistory();
}

function renderHistory() {
  const savedDiv = document.getElementById('savedCombos');
  if (savedDiv) {
    savedDiv.innerHTML = renderPersonalHistory();
  }
}

// Mise à jour des infos de données
function updateDataInfo() {
  const infoDiv = document.getElementById('dataInfo');
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
          💡 Vous pouvez importer d'autres fichiers pour compléter l'historique. Les données seront ajoutées automatiquement.
        </p>
      </div>
    `;
  } else {
    infoDiv.innerHTML = '';
  }
}

// Rendu des statistiques
function renderAllStats() {
  const statsDiv = document.getElementById('statsContent');
  if (statsDiv) {
    statsDiv.innerHTML = renderStats();
  }
}
