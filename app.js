// Variables globales
let currentMultiplier = 1.0;
let isGameRunning = false;
let crashPoint = 0;
let gameInterval;
let timerInterval;
let seconds = 0;

// Fonction pour lancer une partie
function startGame() {
  if (isGameRunning) return;
  isGameRunning = true;
  currentMultiplier = 1.0;
  updateMultiplierDisplay();
  generateCrashPoint();
  seconds = 0;
  startTimer();

  gameInterval = setInterval(() => {
    currentMultiplier += 0.01 + currentMultiplier * 0.01;
    updateMultiplierDisplay();

    if (currentMultiplier >= crashPoint) {
      crashGame();
    }
  }, 100);
}

// Génère un point de crash aléatoire
function generateCrashPoint() {
  // Valeur de crash entre 1.0 et 10.0, biaisée vers les petites valeurs
  crashPoint = (Math.random() ** 2) * 10 + 1;
}

// Met à jour le multiplicateur affiché
function updateMultiplierDisplay() {
  const multiplierEl = document.getElementById("currentMultiplier");
  multiplierEl.textContent = `${currentMultiplier.toFixed(2)}x`;
}

// Termine une partie
function crashGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  isGameRunning = false;

  document.getElementById("rocket").textContent = "💥";
  updateHistory(currentMultiplier);

  setTimeout(() => {
    document.getElementById("rocket").textContent = "🚀";
    autoBetIfNeeded();
    startGame();
  }, 3000);
}

// Timer d'affichage
function startTimer() {
  const timerEl = document.getElementById("gameTimer");
  timerInterval = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

// Historique des crashs
function updateHistory(value) {
  const history = document.getElementById("crashHistory");
  const span = document.createElement("span");
  span.textContent = `${value.toFixed(2)}x`;
  span.classList.add(value >= 2 ? "green" : "red");

  history.prepend(span);
  if (history.children.length > 15) {
    history.removeChild(history.lastChild);
  }
}

// Mises et auto-mises
function placeBet(playerId) {
  const amountInput = document.getElementById(`betAmount${playerId}`);
  const cashoutInput = document.getElementById(`cashoutAt${playerId}`);
  const amount = parseFloat(amountInput.value);
  const cashoutAt = parseFloat(cashoutInput.value);

  if (!isGameRunning) return;

  const playerName = `Joueur${playerId}`;
  const playersTable = document.getElementById("playersTable");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${playerName}</td>
    <td>${amount.toFixed(0)} XAF</td>
    <td>${cashoutAt.toFixed(2)}x</td>
    <td id="gain${playerId}">En cours...</td>
  `;
  row.dataset.cashout = cashoutAt;
  row.dataset.amount = amount;
  row.dataset.playerId = playerId;

  playersTable.appendChild(row);
}

// Auto mise au début de chaque manche
function autoBetIfNeeded() {
  [1, 2].forEach((id) => {
    const auto = document.getElementById(`autoBet${id}`).checked;
    if (auto) placeBet(id);
  });
}

// Cashout automatique
function checkAutoCashout() {
  const rows = document.querySelectorAll("#playersTable tr");
  rows.forEach((row) => {
    const cashout = parseFloat(row.dataset.cashout);
    const amount = parseFloat(row.dataset.amount);
    const playerId = row.dataset.playerId;
    const autoCash = document.getElementById(`autoCashout${playerId}`).checked;

    const gainCell = row.querySelector(`#gain${playerId}`);

    if (gainCell && gainCell.textContent === "En cours..." && currentMultiplier >= cashout) {
      const gain = amount * cashout;
      gainCell.textContent = `${gain.toFixed(0)} XAF ✅`;
    }
  });
}

// Boucle de vérification de cashout auto
setInterval(() => {
  if (isGameRunning) {
    checkAutoCashout();
  }
}, 100);

// Fonctions de réglage des mises
function changeBet(diff, id) {
  const input = document.getElementById(`betAmount${id}`);
  let val = parseInt(input.value) + diff;
  if (val < 1) val = 1;
  input.value = val;
}
function changeCashout(diff, id) {
  const input = document.getElementById(`cashoutAt${id}`);
  let val = parseFloat(input.value) + diff;
  if (val < 1.01) val = 1.01;
  input.value = val.toFixed(2);
}

// Démarrer le jeu au chargement
window.onload = () => {
  startGame();
};