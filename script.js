const taskList = document.querySelector('#task-list');
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const startOverlay = document.querySelector('#start-overlay');
const ball = document.querySelector('#ball');
const resultPop = document.querySelector('#result-pop');
const scoreEl = document.querySelector('#score');
const totalScoreEl = document.querySelector('#total-score');
const shotsLeftEl = document.querySelector('#shots-left');
const taskCountEl = document.querySelector('#task-count');
const tasksDoneEl = document.querySelector('#tasks-done');
const queueMessage = document.querySelector('#queue-message');
const gameStatus = document.querySelector('#game-status');
const progressBars = [...document.querySelectorAll('#shot-progress span')];
const court = document.querySelector('#court');
const aimGuide = document.querySelector('#aim-guide');
const hoop = document.querySelector('.backboard');
const ballShop = document.querySelector('#ball-shop');
const shopPointsEl = document.querySelector('#shop-points');
const coinCountEl = document.querySelector('#coin-count');
const questList = document.querySelector('#quest-list');
const questDateEl = document.querySelector('#quest-date');

const initialTasks = [
  { id: 1, title: 'Sketch the landing page flow', done: false },
  { id: 2, title: 'Reply to the three priority emails', done: false },
];
let tasks = JSON.parse(localStorage.getItem('taskshot-tasks') || 'null') || initialTasks;
let score = Number(localStorage.getItem('taskshot-score') || 0);
let rewardPoints = Number(localStorage.getItem('taskshot-points') || 0);
let completed = Number(localStorage.getItem('taskshot-completed') || 0);
let activeTaskId = null;
let shots = 0;
let roundScore = 0;
let busy = false;
let holdingBall = false;
let hoopAim = { x: 50, y: 30 };
let aim = { x: 50, y: 34, dx: 0, dy: 0 };
let equippedBall = localStorage.getItem('taskshot-ball') || 'classic';
const balls = [
  { id: 'classic', name: 'Classic', emoji: '🏀', price: 0, description: 'The original' },
  { id: 'neon', name: 'Neon Lime', emoji: '🏀', price: 80, description: 'Glow mode' },
  { id: 'silver', name: 'Silver', emoji: '🏀', price: 150, description: 'Cold metal' },
  { id: 'violet', name: 'Violet', emoji: '🏀', price: 220, description: 'Purple rain' },
  { id: 'sunset', name: 'Sunset', emoji: '🏀', price: 300, description: 'After-hours heat' },
  { id: 'gold', name: 'Gold', emoji: '🏀', price: 450, description: 'Top shelf shine' },
  { id: 'ice', name: 'Ice Pop', emoji: '🏀', price: 400, description: 'Cool under pressure' },
  { id: 'tiger', name: 'Tiger', emoji: '🏀', price: 550, description: 'Earn your stripes' },
  { id: 'galaxy', name: 'Galaxy', emoji: '🏀', price: 700, description: 'The final unlock' },
];
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
let daily = JSON.parse(localStorage.getItem('taskshot-daily') || 'null') || { date: todayKey, tasks: 0, baskets: 0, swishes: 0, shots: 0, claimed: {} };
if (daily.date !== todayKey) daily = { date: todayKey, tasks: 0, baskets: 0, swishes: 0, shots: 0, claimed: {} };
daily.swishes ??= 0; daily.shots ??= 0;
const dailyQuestPool = [
  { id: 'tasks-two', label: 'Double down', detail: 'Complete 2 tasks', type: 'tasks', target: 2, reward: 35, currency: 'TASK PTS' },
  { id: 'tasks-four', label: 'Deep work', detail: 'Complete 4 tasks', type: 'tasks', target: 4, reward: 70, currency: 'TASK PTS' },
  { id: 'baskets-eight', label: 'Arcade regular', detail: 'Make 8 baskets', type: 'baskets', target: 8, reward: 30, currency: 'GAME PTS' },
  { id: 'swishes-three', label: 'Nothing but net', detail: 'Make 3 swishes', type: 'swishes', target: 3, reward: 45, currency: 'GAME PTS' },
  { id: 'shots-ten', label: 'Keep shooting', detail: 'Take 10 shots', type: 'shots', target: 10, reward: 35, currency: 'GAME PTS' },
  { id: 'baskets-twelve', label: 'Hot streak', detail: 'Make 12 baskets', type: 'baskets', target: 12, reward: 60, currency: 'GAME PTS' },
];
const rotationIndex = Math.floor((new Date(`${todayKey}T12:00:00`) - new Date('2026-01-01T12:00:00')) / 86400000);
const dailyQuests = [dailyQuestPool[rotationIndex % dailyQuestPool.length], dailyQuestPool[(rotationIndex + 2) % dailyQuestPool.length], dailyQuestPool[(rotationIndex + 4) % dailyQuestPool.length]];

function persist() {
  localStorage.setItem('taskshot-tasks', JSON.stringify(tasks));
  localStorage.setItem('taskshot-score', score);
  localStorage.setItem('taskshot-points', rewardPoints);
  localStorage.setItem('taskshot-daily', JSON.stringify(daily));
  localStorage.setItem('taskshot-completed', completed);
  localStorage.setItem('taskshot-ball', equippedBall);
}

function renderTasks() {
  const openTasks = tasks.filter(task => !task.done);
  taskCountEl.textContent = `${openTasks.length} open`;
  tasksDoneEl.textContent = completed;
  totalScoreEl.textContent = String(score).padStart(3, '0');
  coinCountEl.textContent = String(rewardPoints).padStart(3, '0');
  taskList.innerHTML = '';
  if (!tasks.length) {
    taskList.innerHTML = '<div class="empty-state">Your queue is clear. Add a fresh mission above.</div>';
  }
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''} ${activeTaskId === task.id ? 'active' : ''}`;
    item.innerHTML = `<span class="task-title">${escapeHtml(task.title)}</span><span class="task-state">${task.done ? 'cleared' : 'queued'}</span><button class="complete-task" data-id="${task.id}">${task.done ? 'Done' : 'Finish +5'}</button>`;
    taskList.appendChild(item);
  });
  taskList.querySelectorAll('.complete-task').forEach(button => button.addEventListener('click', () => finishTask(Number(button.dataset.id))));
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function renderDailyQuests() {
  const date = new Date(`${daily.date}T12:00:00`);
  questDateEl.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  questList.innerHTML = dailyQuests.map(quest => {
    const current = Math.min(daily[quest.type], quest.target);
    const finished = current >= quest.target;
    const claimed = Boolean(daily.claimed[quest.id]);
    const action = claimed ? 'Claimed' : finished ? `Claim +${quest.reward} ${quest.currency}` : `${current} / ${quest.target}`;
    return `<article class="quest-card ${finished ? 'complete' : ''} ${claimed ? 'claimed' : ''}"><div class="quest-icon">${claimed ? '✓' : finished ? '★' : '○'}</div><div class="quest-info"><strong>${quest.label}</strong><span>${quest.detail}</span><div class="quest-track"><i style="width:${(current / quest.target) * 100}%"></i></div></div><button class="quest-claim" data-quest="${quest.id}" ${!finished || claimed ? 'disabled' : ''}>${action}</button></article>`;
  }).join('');
  questList.querySelectorAll('.quest-claim').forEach(button => button.addEventListener('click', () => claimQuest(button.dataset.quest)));
}

function claimQuest(id) {
  const quest = dailyQuests.find(item => item.id === id); if (!quest || daily.claimed[id] || daily[quest.type] < quest.target) return;
  daily.claimed[id] = true; if (quest.currency === 'TASK PTS') rewardPoints += quest.reward; else score += quest.reward; persist(); renderDailyQuests(); renderShop(); totalScoreEl.textContent = String(score).padStart(3, '0'); scoreEl.textContent = String(score).padStart(3, '0');
}

function finishTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task || task.done || busy) return;
  const startingNewRound = shots === 0;
  task.done = true; activeTaskId = id; shots += 5; if (startingNewRound) roundScore = 0; completed += 1; rewardPoints += 10; daily.tasks += 1;
  startOverlay.classList.add('hidden');
  gameStatus.textContent = 'ROUND ACTIVE / GOOD LUCK'; queueMessage.textContent = `${shots} shots loaded. +10 task pts earned.`; queueMessage.previousElementSibling.style.background = 'var(--lime)';
  shotsLeftEl.textContent = shots; renderTasks(); renderDailyQuests(); updateProgress(); persist();
  if (startingNewRound) document.querySelector('#arcade-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateProgress() { progressBars.forEach((bar, index) => bar.classList.toggle('filled', index >= shots)); }

function takeShot() {
  if (busy || shots < 1) return;
  busy = true; holdingBall = false; aimGuide.classList.remove('active'); ball.classList.remove('holding', 'shooting'); resetBallPosition();
  ball.style.setProperty('--aim-dx', `${aim.dx}px`); ball.style.setProperty('--aim-dy', `${aim.dy}px`); void ball.offsetWidth; ball.classList.add('shooting');
  const distance = Math.hypot(aim.x - hoopAim.x, aim.y - hoopAim.y);
  const swish = distance < 3; const made = distance < 9;
  setTimeout(() => {
    const points = swish ? 10 : made ? 3 : 0;
    roundScore += points; score += points; shots -= 1; daily.shots += 1; if (made) daily.baskets += 1; if (swish) daily.swishes += 1; scoreEl.textContent = String(score).padStart(3, '0'); totalScoreEl.textContent = String(score).padStart(3, '0'); shotsLeftEl.textContent = shots;
    resultPop.textContent = swish ? '+10 SWISH' : made ? '+3' : 'MISS'; resultPop.style.color = made ? 'var(--lime)' : 'var(--pink)'; resultPop.classList.remove('show'); void resultPop.offsetWidth; resultPop.classList.add('show');
    updateProgress(); persist(); renderDailyQuests(); renderShop();
    if (shots === 0) endRound(); else { if (Math.random() < .4) moveHoop(); busy = false; }
  }, 790);
}

function moveHoop() {
  const backboardX = Math.round(30 + Math.random() * 40); const backboardY = Math.round(18 + Math.random() * 15);
  hoopAim = { x: backboardX, y: backboardY + 15 };
  hoop.style.left = `calc(${backboardX}% - 58px)`; hoop.style.top = `${backboardY}%`;
  resultPop.style.left = `calc(${backboardX}% - 34px)`; resultPop.style.top = `calc(${backboardY}% + 80px)`;
  gameStatus.textContent = 'HOOP MOVED / FIND THE RIM';
}

function setAim(event) {
  const rect = court.getBoundingClientRect();
  aim = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  aim.dx = event.clientX - rect.left - (rect.width / 2 - 23); aim.dy = event.clientY - rect.top - (rect.height - 27 - 45);
  aimGuide.style.left = `${aim.x}%`; aimGuide.style.top = `${aim.y}%`;
  aimGuide.classList.add('active');
  if (holdingBall) {
    const x = Math.max(8, Math.min(rect.width - 54, event.clientX - rect.left - 23));
    const y = Math.max(34, Math.min(rect.height - 45, event.clientY - rect.top - 23));
    ball.style.left = `${x}px`; ball.style.top = `${y}px`; ball.style.bottom = 'auto';
  }
}

function resetBallPosition() { ball.style.left = ''; ball.style.top = ''; ball.style.bottom = ''; }

function startHolding(event) {
  if (busy || shots < 1) return;
  event.preventDefault(); event.stopPropagation(); holdingBall = true; ball.classList.add('holding'); ball.setPointerCapture?.(event.pointerId); setAim(event);
}

function releaseBall(event) {
  if (!holdingBall) return;
  event.preventDefault();
  const rect = court.getBoundingClientRect();
  const insideCourt = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (insideCourt) takeShot(); else { holdingBall = false; ball.classList.remove('holding'); resetBallPosition(); aimGuide.classList.remove('active'); }
}

function renderShop() {
  shopPointsEl.textContent = String(score).padStart(3, '0');
  ballShop.innerHTML = balls.map(item => {
    const isEquipped = equippedBall === item.id;
    const owned = item.price === 0 || JSON.parse(localStorage.getItem(`taskshot-owned-${item.id}`) || 'false');
    const action = isEquipped ? 'Equipped' : owned ? 'Equip' : `Buy · ${item.price} pts`;
    return `<article class="ball-card ${isEquipped ? 'equipped' : ''}"><div class="shop-ball" data-ball="${item.id}">${item.emoji}</div><div><h3>${item.name}</h3><p>${item.description}</p></div><button class="buy-ball" data-ball="${item.id}" ${!owned && score < item.price ? 'disabled' : ''}>${action}</button></article>`;
  }).join('');
  ballShop.querySelectorAll('.buy-ball').forEach(button => button.addEventListener('click', () => chooseBall(button.dataset.ball)));
}

function chooseBall(id) {
  const item = balls.find(ballItem => ballItem.id === id); if (!item) return;
  const owned = item.price === 0 || JSON.parse(localStorage.getItem(`taskshot-owned-${id}`) || 'false');
  if (!owned) { if (score < item.price) return; score -= item.price; localStorage.setItem(`taskshot-owned-${id}`, 'true'); }
  equippedBall = id; ball.textContent = item.emoji; ball.dataset.ball = id; totalScoreEl.textContent = String(score).padStart(3, '0'); scoreEl.textContent = String(score).padStart(3, '0'); persist(); renderTasks(); renderShop();
}

function endRound() {
  gameStatus.textContent = `${roundScore ? 'NICE RUN' : 'KEEP SWINGING'} / ROUND OVER`;
  queueMessage.textContent = `Round complete — you scored ${roundScore} points.`; busy = false; activeTaskId = null; renderTasks(); persist();
}

taskForm.addEventListener('submit', event => { event.preventDefault(); const title = taskInput.value.trim(); if (!title) return; tasks.unshift({ id: Date.now(), title, done: false }); taskInput.value = ''; renderTasks(); persist(); taskInput.focus(); });
ball.addEventListener('pointerdown', startHolding);
document.addEventListener('pointermove', event => { if (holdingBall) setAim(event); });
document.addEventListener('pointerup', releaseBall);
court.addEventListener('pointermove', event => { if (!busy && !holdingBall) setAim(event); });
court.addEventListener('pointerleave', () => { if (!holdingBall) aimGuide.classList.remove('active'); });
court.addEventListener('pointerdown', event => { if (!event.target.closest('#ball') && !busy && shots > 0) setAim(event); });
document.querySelector('#reset-button').addEventListener('click', () => { if (!confirm('Reset your tasks and score?')) return; localStorage.removeItem('taskshot-tasks'); localStorage.removeItem('taskshot-score'); localStorage.removeItem('taskshot-points'); localStorage.removeItem('taskshot-daily'); localStorage.removeItem('taskshot-completed'); balls.slice(1).forEach(item => localStorage.removeItem(`taskshot-owned-${item.id}`)); localStorage.removeItem('taskshot-ball'); window.location.reload(); });
renderTasks(); renderDailyQuests(); renderShop(); scoreEl.textContent = String(score).padStart(3, '0'); totalScoreEl.textContent = String(score).padStart(3, '0'); ball.textContent = balls.find(item => item.id === equippedBall)?.emoji || '🏀'; ball.dataset.ball = equippedBall;
