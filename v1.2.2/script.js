// script.js - 完全版（差し替え用）
// 追加機能：オナニ率リセットボタン（UI がなければ自動生成）
//            オナニ率の分母は最大 100（表示計算時に適用）

const slotChars = ['オ', 'ナ', 'ニ'];

const slots = [
  document.getElementById('slot1'),
  document.getElementById('slot2'),
  document.getElementById('slot3')
];

const startBtn = document.getElementById('startBtn');
const counter = document.getElementById('count');
const soundBtn = document.getElementById('soundBtn');

// rateDisplay が HTML に無ければ自動生成（スタイルは既存CSSに合わせて）
let rateDisplay = document.getElementById('rateDisplay');
let rateContainer = document.getElementById('rateContainer');
let resetRateBtn = document.getElementById('resetRateBtn');

if (!rateContainer) {
  // 作るときは rateDisplay と reset ボタンを内包するコンテナを生成
  rateContainer = document.createElement('div');
  rateContainer.id = 'rateContainer';
  rateContainer.style.display = 'flex';
  rateContainer.style.alignItems = 'center';
  rateContainer.style.gap = '10px';
  rateContainer.style.marginTop = '12px';
  // 挿入位置：スタートボタンのすぐ下
  const startBtnEl = document.getElementById('startBtn');
  startBtnEl.parentNode.insertBefore(rateContainer, startBtnEl.nextSibling);
}

// ensure rateDisplay exists inside container
if (!rateDisplay) {
  rateDisplay = document.createElement('div');
  rateDisplay.id = 'rateDisplay';
  rateDisplay.style.fontSize = '1.1em';
  rateDisplay.style.color = '#222';
  rateContainer.appendChild(rateDisplay);
} else {
  // 既に存在するrateDisplayがあるなら、親に移動して見た目を整える
  if (rateDisplay.parentNode !== rateContainer) {
    rateContainer.appendChild(rateDisplay);
  }
}

// ensure reset button exists
if (!resetRateBtn) {
  resetRateBtn = document.createElement('button');
  resetRateBtn.id = 'resetRateBtn';
  resetRateBtn.textContent = 'リセット';
  // 見た目を最小限で整える（必要ならstyle.cssで変更）
  resetRateBtn.style.padding = '6px 10px';
  resetRateBtn.style.fontSize = '0.95em';
  resetRateBtn.style.cursor = 'pointer';
  rateContainer.appendChild(resetRateBtn);
}

// --- stats ---
let winCount = 0;
let totalSpins = 0;
let soundEnabled = true;
let spinIntervals = [];
let spinTimeouts = [];
let isSpinning = false;
let slotsStoppedCount = 0;
let orderOfStops = []; // 停止したスロットの順を記録

// 音声設定
const drumRoll = new Audio('ドラムロール.mp3');
const decisionSound = new Audio('51.mp3');
const spinSoundSrcs = ['爆発1.mp3', '爆発2.mp3', '爆発3.mp3', '爆発4.mp3'];
const winSoundSrc = 'sky piller.m4a';

const playingAudios = new Set();
const pausedAudios = new Set();
let lastWinInstance = null;
let currentDrumRoll = null;

// --- localStorage 用キー ---
const LS_WIN = 'onani_win_count';
const LS_TOTAL = 'onani_total_spins';

// ===== ロード時に保存値を復元 =====
function loadStats() {
  try {
    const w = parseInt(localStorage.getItem(LS_WIN), 10);
    const t = parseInt(localStorage.getItem(LS_TOTAL), 10);
    if (!isNaN(w)) winCount = w;
    if (!isNaN(t)) totalSpins = t;
  } catch (e) {
    console.log('localStorage load error', e);
  }
  updateCounterUI();
  updateRateUI();
}
loadStats();

function saveStats() {
  try {
    localStorage.setItem(LS_WIN, String(winCount));
    localStorage.setItem(LS_TOTAL, String(totalSpins));
  } catch (e) {
    console.log('localStorage save error', e);
  }
}

function updateCounterUI() {
  if (counter) counter.textContent = String(winCount);
}

function updateRateUI() {
  // 分母の上限を 100 とする
  let text = 'オナニ率: 0%';
  if (totalSpins > 0) {
    const denom = Math.min(totalSpins, 100);
    const rate = (winCount / denom) * 100;
    text = 'オナニ率: ' + (Math.round(rate * 10) / 10) + '%';
  }
  rateDisplay.textContent = text;
}

// ===== 音声管理ヘルパー（既存ロジックを踏襲） =====
function addPlaying(audio) {
  playingAudios.add(audio);
  const cleanup = () => {
    playingAudios.delete(audio);
    audio.removeEventListener('ended', cleanup);
    audio.removeEventListener('pause', cleanup);
    audio.removeEventListener('abort', cleanup);
  };
  audio.addEventListener('ended', cleanup);
  audio.addEventListener('pause', cleanup);
  audio.addEventListener('abort', cleanup);
}

async function playManagedInstance(audio, { resetTime = false } = {}) {
  if (!soundEnabled) return false;
  try {
    if (resetTime) audio.currentTime = 0;
    await audio.play();
    addPlaying(audio);
    return true;
  } catch (err) {
    try {
      const s = new Audio(audio.src || audio);
      await s.play();
      addPlaying(s);
      return true;
    } catch (err2) {
      console.log('再生失敗:', err2);
      return false;
    }
  }
}

function playSoundFromSrc(src) {
  if (!soundEnabled) return null;
  const a = new Audio(src);
  a.play().then(() => addPlaying(a)).catch(e => {
    console.log('効果音再生失敗', src, e);
  });
  return a;
}

function pauseAllPlaying() {
  for (const a of Array.from(playingAudios)) {
    try {
      a.pause();
      pausedAudios.add(a);
      playingAudios.delete(a);
    } catch (e) {
      console.log('一時停止エラー', e);
    }
  }
}

function resumePaused() {
  for (const a of Array.from(pausedAudios)) {
    a.play().then(() => {
      addPlaying(a);
      pausedAudios.delete(a);
    }).catch(e => {
      console.log('再生再開失敗', e);
      pausedAudios.delete(a);
    });
  }
}

async function playWinSound() {
  if (!soundEnabled) return;
  try {
    const a = new Audio(winSoundSrc);
    await a.play();
    addPlaying(a);
    lastWinInstance = a;
  } catch (e) {
    console.log('勝利音再生失敗', e);
  }
}

function stopLastWinSound() {
  if (lastWinInstance) {
    try {
      lastWinInstance.pause();
      lastWinInstance.currentTime = 0;
    } catch (e) { }
    playingAudios.delete(lastWinInstance);
    pausedAudios.delete(lastWinInstance);
    lastWinInstance = null;
  }
}

function stopDrumRoll() {
  if (currentDrumRoll) {
    try {
      currentDrumRoll.pause();
      currentDrumRoll.currentTime = 0;
    } catch (e) { }
    playingAudios.delete(currentDrumRoll);
    pausedAudios.delete(currentDrumRoll);
    currentDrumRoll = null;
  }
}

function playDrumRoll() {
  if (!soundEnabled) return;
  stopDrumRoll();
  try {
    drumRoll.currentTime = 0;
    drumRoll.play().then(() => {
      addPlaying(drumRoll);
      currentDrumRoll = drumRoll;
    }).catch(e => {
      console.log('ドラムロール再生失敗', e);
    });
  } catch (e) {
    console.log('ドラムロール再生エラー', e);
  }
}

// ===== UI のミュートトグル =====
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '音声: ON' : '音声: OFF';

  if (!soundEnabled) {
    pauseAllPlaying();
    stopLastWinSound();
    stopDrumRoll();
  } else {
    resumePaused();
    if (isSpinning && !currentDrumRoll) {
      playDrumRoll();
    }
  }
});

// ===== スピンロジック =====
function resetVisuals() {
  slots.forEach(s => {
    s.classList.remove('stopped', 'final', 'win');
  });
  orderOfStops = [];
}

function clearAllSpinTimers() {
  spinIntervals.forEach(i => clearInterval(i));
  spinIntervals = [];
  spinTimeouts.forEach(t => clearTimeout(t));
  spinTimeouts = [];
}

function stopCurrentSpin() {
  clearAllSpinTimers();
  isSpinning = false;
  slotsStoppedCount = 0;
  orderOfStops = [];
  stopDrumRoll();
}

// スピン開始
function spinSlots() {
  // もし既にスピン中なら強制停止してリセット
  if (isSpinning) {
    stopCurrentSpin();
  }

  isSpinning = true;
  slotsStoppedCount = 0;
  orderOfStops = [];

  document.body.classList.remove('rainbow-bg');
  resetVisuals();

  // ドラムロール再生
  playDrumRoll();

  // 停止タイミングをそれぞれランダムに決める
  const delays = slots.map(() => Math.random() * 2400 + 1500);

  slots.forEach((slot, index) => {
    // 回転開始
    spinIntervals[index] = setInterval(() => {
      const rand = Math.floor(Math.random() * slotChars.length);
      slot.textContent = slotChars[rand];
    }, 100);

    // 停止タイマー
    spinTimeouts[index] = setTimeout(() => {
      if (!isSpinning) return; // 途中で止められた場合保険

      clearInterval(spinIntervals[index]);
      spinIntervals[index] = null;

      // 停止した順番を記録
      orderOfStops.push(slot);
      slot.classList.add('stopped');

      // 効果音（停止ごと）
      if (soundEnabled) {
        const src = spinSoundSrcs[Math.floor(Math.random() * spinSoundSrcs.length)];
        playSoundFromSrc(src);
      }

      slotsStoppedCount++;

      // 最初の停止でドラムロールを止める（仕様に合わせる）
      if (slotsStoppedCount === 1) {
        stopDrumRoll();
      }

      // 全て停止したら処理
      if (slotsStoppedCount === slots.length) {
        // 最後に止まったスロットを取り出して final をつける
        const finalSlot = orderOfStops[orderOfStops.length - 1];
        if (finalSlot) {
          finalSlot.classList.add('final');
        }

        // 勝利判定（winCount の増加はここで行う）
        checkWin();

        // スピン回数をカウントして保存・表示更新
        totalSpins++;
        saveStats();
        updateRateUI();

        // スピン終了フラグ
        isSpinning = false;
      }
    }, delays[index]);
  });
}

// 勝利判定
function checkWin() {
  const texts = slots.map(s => s.textContent).join('');
  if (texts === 'オナニ') {
    slots.forEach(s => s.classList.add('win'));
    winCount++;
    updateCounterUI();
    saveStats();

    if (soundEnabled) {
      playWinSound();
    }

    document.body.classList.add('rainbow-bg');
  } else {
    slots.forEach(s => s.classList.remove('win'));
    document.body.classList.remove('rainbow-bg');
  }
}

// スタート押下時のラッパー（決定音・勝利音停止）
function onStartPressed() {
  // 以前の勝利音が鳴っていたら止める
  stopLastWinSound();

  if (soundEnabled) {
    // 決定音を鳴らす（プリロード済み or フォールバック）
    try {
      decisionSound.currentTime = 0;
      decisionSound.play().then(() => addPlaying(decisionSound)).catch(e => {
        const s = new Audio(decisionSound.src);
        s.play().then(() => addPlaying(s)).catch(e2 => console.log('決定音再生エラー', e2));
      });
    } catch (e) {
      const s = new Audio(decisionSound.src);
      s.play().then(() => addPlaying(s)).catch(e2 => console.log('決定音再生エラー', e2));
    }
  }

  // スピン開始
  spinSlots();
}

// リセットボタンの挙動（オナニ率・カウンターをリセット）
resetRateBtn.addEventListener('click', () => {
  // 停止中の勝利音やドラムロールを止めておく
  stopLastWinSound();
  stopDrumRoll();

  winCount = 0;
  totalSpins = 0;
  saveStats();
  updateCounterUI();
  updateRateUI();
});

// 初期イベント設定
startBtn.addEventListener('click', onStartPressed);

// ページを離れるときに stats を保存（保険）
window.addEventListener('beforeunload', () => {
  saveStats();
});
