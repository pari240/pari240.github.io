// === app.js - Jeu JetX Cartoon PAR complet, ~350 lignes ===

// CONSTANTES
const XAF_TO_PAR = 1/234;       // Conversion 1 PAR = 234 XAF
const MIN_FAKE_BET_XAF = 200;
const MAX_FAKE_BET_XAF = 1234;
const ROUND_WAIT_MS = 4000;     // Attente avant lancement manche (4s)
const ROUND_DURATION_MS = 12000;// Durée manche active (12s)
const MAX_MULTIPLIER = 50;      // Multiplicateur max possible
const FAKE_PLAYERS_COUNT = 200;  // Nombre faux joueurs

// ETAT GLOBAL
let state = {
  balance: 100,      // Solde joueur en PAR (initial)
  bet: 0,             // Mise actuelle en PAR
  multiplier: 1,      // Multiplicateur actuel
  roundPhase: 'waiting', // waiting, running, ended
  cashedOut: false,   // Le joueur a cashout cette manche ?
  fakePlayers: [],    // Liste des faux joueurs {name, bet, cashoutAt, cashedOut, gain}
  chatMessages: [],   // Messages chat {user, text}
  roundStartTime: 0,  // Timestamp début manche active
  animationFrameId: null, // ID requestAnimationFrame
};

// DOM ELEMENTS
const balanceEl = document.querySelector('.balance .amount');
const multiplierEl = document.querySelector('.multiplier');
const betInput = document.getElementById('bet-input');
const betButton = document.getElementById('bet-button');
const cashoutButton = document.getElementById('cashout-button');
const playersTableBody = document.querySelector('#players-table tbody');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');
const chatMessagesContainer = document.getElementById('chat-messages');
const statusEl = document.querySelector('.status');

// UTILS

function xafToPar(xaf){
  return +(xaf * XAF_TO_PAR).toFixed(2);
}

function randomUserName(){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters.charAt(Math.floor(Math.random()*letters.length)) + '***' + (Math.floor(Math.random()*900)+100);
}

function saveState(){
  localStorage.setItem('jetx_balance', state.balance);
  localStorage.setItem('jetx_chat', JSON.stringify(state.chatMessages));
}

function loadState(){
  const bal = parseFloat(localStorage.getItem('jetx_balance'));
  if(!isNaN(bal)) state.balance = bal;

  const chatRaw = localStorage.getItem('jetx_chat');
  if(chatRaw){
    try{
      state.chatMessages = JSON.parse(chatRaw);
    }catch{
      state.chatMessages = [];
    }
  }
}

// GENERER LES FAUX JOUEURS

function generateFakePlayers(){
  let arr = [];
  for(let i=0; i<FAKE_PLAYERS_COUNT; i++){
    const name = randomUserName();
    const betXaf = MIN_FAKE_BET_XAF + Math.random()*(MAX_FAKE_BET_XAF - MIN_FAKE_BET_XAF);
    const bet = xafToPar(betXaf);
    const cashoutAt = +(1.1 + Math.random()*4).toFixed(2); // cashout entre 1.1x et 5.1x env.
    arr.push({
      name,
      bet,
      cashoutAt,
      cashedOut:false,
      gain:0,
    });
  }
  return arr;
}

// MISE A JOUR UI

function updateUI(){
  // Solde
  balanceEl.textContent = state.balance.toFixed(2) + ' PAR';
  // Multiplicateur
  multiplierEl.textContent = state.multiplier.toFixed(2) + '×';

  // Boutons
  betInput.disabled = (state.roundPhase !== 'waiting');
  betButton.disabled = (state.roundPhase !== 'waiting') || state.bet > state.balance || state.bet <= 0;
  cashoutButton.disabled = (state.roundPhase !== 'running') || state.cashedOut || state.bet <= 0;

  // Statut
  if(state.roundPhase === 'waiting') statusEl.textContent = 'Placez votre mise...';
  else if(state.roundPhase === 'running') statusEl.textContent = 'Manche en cours ! Cashout possible.';
  else statusEl.textContent = 'Manche terminée. Nouvelle manche dans quelques secondes...';

  // Tableau joueurs
  playersTableBody.innerHTML = '';

  // Faux joueurs
  state.fakePlayers.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.bet.toFixed(2)}</td>
      <td>${p.cashedOut ? p.cashoutAt.toFixed(2) + '×' : '—'}</td>
      <td>${p.cashedOut ? p.gain.toFixed(2) : '—'}</td>
    `;
    playersTableBody.appendChild(tr);
  });

  // Joueur
  if(state.bet > 0){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>Vous</strong></td>
      <td><strong>${state.bet.toFixed(2)}</strong></td>
      <td><strong>${state.cashedOut ? state.multiplier.toFixed(2) + '×' : '—'}</strong></td>
      <td><strong>${state.cashedOut ? (state.bet * state.multiplier).toFixed(2) : '—'}</strong></td>
    `;
    playersTableBody.appendChild(tr);
  }

  renderChat();
}

// CHAT

function renderChat(){
  chatMessagesContainer.innerHTML = '';
  state.chatMessages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('chat-message');
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    chatMessagesContainer.appendChild(div);
  });
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function sendMessage(){
  const text = chatInput.value.trim();
  if(text.length === 0) return;
  state.chatMessages.push({user:'Vous', text});
  chatInput.value = '';
  renderChat();
  saveState();
}

// LOGIQUE DU JEU

function startWaitingPhase(){
  state.roundPhase = 'waiting';
  state.multiplier = 1;
  state.cashedOut = false;
  state.bet = 0;
  state.fakePlayers = generateFakePlayers();
  updateUI();
  saveState();

  setTimeout(() => {
    startRunningPhase();
  }, ROUND_WAIT_MS);
}

function startRunningPhase(){
  if(state.bet === 0){
    alert('Pas de mise placée, manche annulée.');
    startWaitingPhase();
    return;
  }

  state.roundPhase = 'running';
  state.roundStartTime = performance.now();
  state.cashedOut = false;
  updateUI();

  // lancer l'animation multiplicateur
  animateMultiplier();
}

function animateMultiplier(){
  function step(timestamp){
    if(state.roundPhase !== 'running'){
      cancelAnimationFrame(state.animationFrameId);
      return;
    }
    const elapsed = timestamp - state.roundStartTime;
    if(elapsed >= ROUND_DURATION_MS){
      state.multiplier = MAX_MULTIPLIER;
      cashoutFakes();
      endRound();
      return;
    }
    // Calcul multiplicateur exponentiel style JetX
    const progress = elapsed / ROUND_DURATION_MS;
    state.multiplier = 1 + (progress*progress)*(MAX_MULTIPLIER-1);

    // Faux joueurs cashout
    cashoutFakes();

    updateUI();

    state.animationFrameId = requestAnimationFrame(step);
  }
  state.animationFrameId = requestAnimationFrame(step);
}

function cashoutFakes(){
  state.fakePlayers.forEach(p => {
    if(!p.cashedOut && state.multiplier >= p.cashoutAt){
      p.cashedOut = true;
      p.gain = +(p.bet * p.cashoutAt).toFixed(2);
    }
  });
}

function endRound(){
  state.roundPhase = 'ended';
  updateUI();

  if(!state.cashedOut){
    // joueur n'a pas cashout -> perte
    alert(`Manche terminée ! Vous avez perdu votre mise de ${state.bet.toFixed(2)} PAR.`);
  } else {
    const gain = +(state.bet * state.multiplier).toFixed(2);
    alert(`Manche terminée ! Vous avez cashouté avec ${state.multiplier.toFixed(2)}×, gain total: ${gain} PAR.`);
  }

  state.bet = 0;
  saveState();

  // Nouvelle manche après délai
  setTimeout(() => {
    startWaitingPhase();
  }, ROUND_WAIT_MS);
}

// ACTIONS JOUEUR

function placeBet(){
  if(state.roundPhase !== 'waiting'){
    alert('Vous ne pouvez pas miser en cours de manche.');
    return;
  }
  let bet = parseFloat(betInput.value);
  if(isNaN(bet) || bet <= 0){
    alert('Entrez une mise valide en PAR.');
    return;
  }
  if(bet > state.balance){
    alert('Solde insuffisant.');
    return;
  }
  state.bet = bet;
  state.balance -= bet;
  updateUI();
  saveState();
}

function cashout(){
  if(state.roundPhase !== 'running'){
    alert('Manche non commencée.');
    return;
  }
  if(state.cashedOut){
    alert('Vous avez déjà cashouté cette manche.');
    return;
  }
  if(state.bet === 0){
    alert('Vous n\'avez pas misé.');
    return;
  }

  state.cashedOut = true;
  const gain = +(state.bet * state.multiplier).toFixed(2);
  state.balance += gain;
  updateUI();
  saveState();
  alert(`Cashout à ${state.multiplier.toFixed(2)}× ! Vous gagnez ${gain} PAR.`);
}

// ÉVÉNEMENTS

betButton.addEventListener('click', placeBet);
cashoutButton.addEventListener('click', cashout);
chatSendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => { if(e.key === 'Enter') sendMessage(); });

// INIT

loadState();
updateUI();
startWaitingPhase();