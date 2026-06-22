// ============================
// VARIABLES DU JEU
// ============================

let score        = 0;
let totalGagne   = 0;
let nbClics      = 0;
let ptsParClic   = 1;
let ptParSec     = 0;
let rotation     = 0;


// ============================
// BOOST ×5
// ============================

let boostActive     = false;
let boostMultiplier = 1;
let boostTimeLeft   = 0;
let boostInterval   = null;

const BOOST_DURATION   = 10;
const BOOST_MULTIPLIER = 5;


// ============================
// BALLON DORÉ — physique
// ============================

let goldenBallActive = false;
let gbSpawnTimer     = null;
let gbExpireTimer    = null;
let gbAnimFrame      = null;
let gbX = 0, gbY = 0;
let gbVx = 0, gbVy = 0;

const GB_DURATION  = 8;
const GB_SPEED     = 4.5;
const GB_MIN_DELAY = 20000;
const GB_MAX_DELAY = 40000;


// ============================
// PALIERS (milestones)
// ============================

const MILESTONES = [
  { threshold:         10_000, icon: '🔥', label: '10 000 pts'       },
  { threshold:        100_000, icon: '⚡', label: '100 000 pts'      },
  { threshold:      1_000_000, icon: '👑', label: '1 000 000 pts'    },
  { threshold:     10_000_000, icon: '🏆', label: '10 000 000 pts'   },
  { threshold:    100_000_000, icon: '🌟', label: '100 000 000 pts'  },
  { threshold:  1_000_000_000, icon: '🚀', label: '1 milliard de pts'},
];

const triggeredMilestones = new Set();
let passiveCheckTick = 0;


// ============================
// UPGRADES
// ============================

const UPGRADES = {
  ramasseur: { baseCost: 15,   owned: 0, type: 'bps', value: 1,   unique: false },
  coach:     { baseCost: 100,  owned: 0, type: 'bps', value: 5,   unique: false },
  gants:     { baseCost: 80,   owned: 0, type: 'cpc', value: 2,   unique: true  },
  equipe:    { baseCost: 500,  owned: 0, type: 'bps', value: 25,  unique: false },
  frappe:    { baseCost: 400,  owned: 0, type: 'cpc', value: 3,   unique: true  },
  stade:     { baseCost: 2000, owned: 0, type: 'bps', value: 100, unique: false },
};


// ============================
// CLIC SUR LE BALLON
// ============================

function handleClick(event) {
  const pts = ptsParClic * boostMultiplier;
  score      += pts;
  totalGagne += pts;
  nbClics++;

  rotation = (rotation + 15) % 360;
  document.getElementById('ball').style.transform = `rotate(${rotation}deg)`;

  spawnSpark(event, '+' + pts);
  updateUI();
  checkBadges();
  checkMilestones();
}


// ============================
// SPARK
// ============================

function spawnSpark(event, texte) {
  const el = document.createElement('span');
  el.className = 'spark' + (boostActive ? ' boost' : '');
  el.textContent = texte;
  el.style.left = (event.clientX - 14) + 'px';
  el.style.top  = (event.clientY - 14) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 660);
}


// ============================
// ACHAT
// ============================

function buy(nom) {
  const upg  = UPGRADES[nom];
  const cost = calculerCout(nom);

  // Déjà acheté (unique) → rien
  if (upg.unique && upg.owned >= 1) return;

  // Pas assez de points → tremblement
  if (score < cost) {
    animShake(nom);
    return;
  }

  score -= cost;
  upg.owned++;

  if (upg.type === 'bps')      ptParSec   += upg.value;
  else if (upg.type === 'cpc') ptsParClic *= upg.value;

  animBuy(nom);
  updateUI();
  checkBadges();
  checkMilestones();
}

function animBuy(nom) {
  const card    = document.getElementById('upg-' + nom);
  const countEl = document.getElementById('count-' + nom);

  card.classList.remove('buying');
  void card.offsetWidth;
  card.classList.add('buying');

  countEl.classList.remove('popping');
  void countEl.offsetWidth;
  countEl.classList.add('popping');
}

function animShake(nom) {
  const card = document.getElementById('upg-' + nom);
  card.classList.remove('shaking');
  void card.offsetWidth;
  card.classList.add('shaking');
}

function calculerCout(nom) {
  const upg = UPGRADES[nom];
  return upg.unique
    ? upg.baseCost
    : Math.ceil(upg.baseCost * Math.pow(1.15, upg.owned));
}


// ============================
// PRODUCTION PASSIVE
// ============================

setInterval(function () {
  if (ptParSec > 0) {
    const gain = (ptParSec * boostMultiplier) / 10;
    score      += gain;
    totalGagne += gain;
    updateUI();

    // Vérifier les paliers ~toutes les secondes
    passiveCheckTick++;
    if (passiveCheckTick >= 10) {
      passiveCheckTick = 0;
      checkMilestones();
    }
  }
}, 100);


// ============================
// BOOST ×5 (10 secondes)
// ============================

function activateBoost() {
  if (boostActive) clearInterval(boostInterval);

  boostActive     = true;
  boostMultiplier = BOOST_MULTIPLIER;
  boostTimeLeft   = BOOST_DURATION;

  document.getElementById('boost-bar').classList.remove('hidden');
  updateBoostUI();

  boostInterval = setInterval(() => {
    boostTimeLeft -= 0.1;
    if (boostTimeLeft <= 0) endBoost();
    else updateBoostUI();
  }, 100);
}

function updateBoostUI() {
  const pct = Math.max(0, boostTimeLeft / BOOST_DURATION) * 100;
  document.getElementById('boost-fill').style.width  = pct + '%';
  document.getElementById('boost-timer').textContent = Math.ceil(boostTimeLeft) + 's';
}

function endBoost() {
  clearInterval(boostInterval);
  boostActive     = false;
  boostMultiplier = 1;
  document.getElementById('boost-bar').classList.add('hidden');
}


// ============================
// BALLON DORÉ — spawn & physique
// ============================

function scheduleGoldenBall() {
  const delay = GB_MIN_DELAY + Math.random() * (GB_MAX_DELAY - GB_MIN_DELAY);
  gbSpawnTimer = setTimeout(spawnGoldenBall, delay);
}

function spawnGoldenBall() {
  if (goldenBallActive) return;
  goldenBallActive = true;

  const gb     = document.getElementById('golden-ball');
  const margin = 100;

  gbX = margin + Math.random() * (window.innerWidth  - 2 * margin);
  gbY = margin + Math.random() * (window.innerHeight - 2 * margin);

  const speed = GB_SPEED + Math.random() * 2;
  const angle = Math.random() * 2 * Math.PI;
  gbVx = Math.cos(angle) * speed;
  gbVy = Math.sin(angle) * speed;

  gb.style.left = gbX + 'px';
  gb.style.top  = gbY + 'px';
  gb.classList.add('active');

  const ring = document.getElementById('ring-fg');
  ring.classList.remove('draining');
  void ring.offsetWidth;
  ring.classList.add('draining');

  moveGoldenBall();

  gbExpireTimer = setTimeout(() => {
    hideGoldenBall();
    scheduleGoldenBall();
  }, GB_DURATION * 1000);
}

function moveGoldenBall() {
  if (!goldenBallActive) return;

  gbX += gbVx;
  gbY += gbVy;

  const size = 96;
  const minX = 0, minY = 52;
  const maxX = window.innerWidth  - size;
  const maxY = window.innerHeight - size - 20;

  let bounced = false;

  if (gbX < minX) { gbX = minX; gbVx =  Math.abs(gbVx); bounced = true; }
  if (gbX > maxX) { gbX = maxX; gbVx = -Math.abs(gbVx); bounced = true; }
  if (gbY < minY) { gbY = minY; gbVy =  Math.abs(gbVy); bounced = true; }
  if (gbY > maxY) { gbY = maxY; gbVy = -Math.abs(gbVy); bounced = true; }

  const gb = document.getElementById('golden-ball');
  gb.style.left = gbX + 'px';
  gb.style.top  = gbY + 'px';

  if (bounced) squishGoldenBall();

  gbAnimFrame = requestAnimationFrame(moveGoldenBall);
}

function squishGoldenBall() {
  const gbBall = document.querySelector('#golden-ball .gb-ball');
  gbBall.classList.remove('squish');
  void gbBall.offsetWidth;
  gbBall.classList.add('squish');
}

function hideGoldenBall() {
  goldenBallActive = false;
  if (gbAnimFrame) { cancelAnimationFrame(gbAnimFrame); gbAnimFrame = null; }
  const gb = document.getElementById('golden-ball');
  gb.classList.remove('active');
  document.getElementById('ring-fg').classList.remove('draining');
}

function clickGoldenBall(event) {
  if (!goldenBallActive) return;
  event.stopPropagation();

  clearTimeout(gbExpireTimer);
  hideGoldenBall();
  activateBoost();
  scheduleGoldenBall();

  spawnSpark(event, '⚡ BOOST ×' + BOOST_MULTIPLIER + ' !');
}


// ============================
// PALIERS — animations
// ============================

function checkMilestones() {
  for (const m of MILESTONES) {
    if (totalGagne >= m.threshold && !triggeredMilestones.has(m.threshold)) {
      triggeredMilestones.add(m.threshold);
      triggerMilestone(m);
      break; // un seul palier à la fois
    }
  }
}

let milestoneTimeout = null;

function triggerMilestone(m) {
  // Flash écran
  const flash = document.getElementById('flash');
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');

  // Popup
  document.getElementById('milestone-icon').textContent = m.icon;
  document.getElementById('milestone-val').textContent  = m.label;
  const popup = document.getElementById('milestone-popup');
  popup.classList.add('show');

  // Confettis
  spawnConfetti();

  // Auto-dismiss après 3.5s
  clearTimeout(milestoneTimeout);
  milestoneTimeout = setTimeout(() => popup.classList.remove('show'), 3500);
}

function spawnConfetti() {
  const colors = ['#F9C200', '#FFFFFF', '#4A8FE7', '#F97316', '#A855F7', '#22C55E', '#EC4899'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const p   = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = (Math.random() * 100) + 'vw';

      const size = 5 + Math.random() * 9;
      const dur  = 1.4 + Math.random() * 1.0;
      const dx   = (Math.random() - 0.5) * 220;
      const rot  = Math.random() > 0.5 ? '2px' : '50%'; // rectangle ou rond

      p.style.setProperty('--size',  size + 'px');
      p.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
      p.style.setProperty('--dur',   dur + 's');
      p.style.setProperty('--dx',    dx + 'px');
      p.style.borderRadius = rot;

      document.body.appendChild(p);
      setTimeout(() => p.remove(), (dur + 0.15) * 1000);
    }, i * 22);
  }
}


// ============================
// MISE À JOUR DE L'INTERFACE
// ============================

function updateUI() {
  document.getElementById('score').textContent = formater(score);
  document.getElementById('bps').textContent   = formater(ptParSec);

  document.getElementById('stat-clic').textContent  = boostActive
    ? (ptsParClic * boostMultiplier) + 'x ⚡'
    : ptsParClic + 'x';
  document.getElementById('stat-total').textContent = formater(totalGagne);
  document.getElementById('stat-clics').textContent = formater(nbClics);

  for (const nom in UPGRADES) {
    const upg        = UPGRADES[nom];
    const cost       = calculerCout(nom);
    const card       = document.getElementById('upg-' + nom);
    const dejaAchete = upg.unique && upg.owned >= 1;

    card.classList.toggle('locked', dejaAchete || score < cost);

    const costEl = document.getElementById('cost-' + nom);
    costEl.textContent = dejaAchete ? '✓ Acheté' : formater(cost) + ' pts';
    costEl.style.color = dejaAchete ? 'rgba(220,232,248,0.3)' : '#F9C200';

    const countEl = document.getElementById('count-' + nom);
    countEl.textContent = upg.owned > 0 ? upg.owned : '—';
    countEl.classList.toggle('has-items', upg.owned > 0);
  }
}


// ============================
// SUCCÈS
// ============================

function checkBadges() {
  debloquer('badge-1', '🏐 Premier point !', totalGagne >= 1);
  debloquer('badge-2', '💯 100 points',       totalGagne >= 100);
  debloquer('badge-3', '🔥 1 000 points',     totalGagne >= 1000);
  debloquer('badge-4', '👑 10 000 points',    totalGagne >= 10000);
}

function debloquer(id, label, condition) {
  if (!condition) return;
  const el = document.getElementById(id);
  if (!el.classList.contains('done')) {
    el.classList.add('done');
    el.textContent = label;
  }
}


// ============================
// FORMATER
// ============================

function formater(n) {
  n = Math.floor(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'G';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}


// ============================
// DÉMARRAGE
// ============================

updateUI();
scheduleGoldenBall();
