const slotChars = ['オ', 'ナ', 'ニ'];

const slots = [
  document.getElementById('slot1'),
  document.getElementById('slot2'),
  document.getElementById('slot3')
];

const startBtn = document.getElementById('startBtn');
const counter = document.getElementById('count');
const soundBtn = document.getElementById('soundBtn');

let winCount = 0;
let soundEnabled = true;
let spinIntervals = [];
let spinTimeouts = [];
let isSpinning = false;
let slotsStoppedCount = 0;

// 音声設定
const drumRoll = new Audio('ドラムロール.mp3');
const decisionSound = new Audio('51.mp3');
const spinSoundSrcs = ['爆発1.mp3', '爆発2.mp3', '爆発3.mp3', '爆発4.mp3'];
const winSoundSrc = 'sky piller.m4a';

const playingAudios = new Set();
const pausedAudios = new Set();
let lastWinInstance = null;
let currentDrumRoll = null; // 現在再生中のドラムロールを追跡

// ヘルパー関数
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

// ドラムロールを停止する関数
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

// UIのトグル処理
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
      // スピン中でドラムロールがなければ再生
      playDrumRoll();
    }
  }
});

function playingAudiosHasSource(src) {
  for (const a of playingAudios) {
    if (a && a.src && a.src.indexOf(src) !== -1) return true;
  }
  return false;
}

// ドラムロールを再生する関数
function playDrumRoll() {
  if (!soundEnabled) return;
  
  // 既存のドラムロールを停止
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

// ビジュアル/スピンロジック
function resetVisuals() {
  slots.forEach(s => {
    s.classList.remove('stopped', 'final', 'win');
  });
}

function clearAllSpinTimers() {
  // すべてのインターバルをクリア
  spinIntervals.forEach(i => clearInterval(i));
  spinIntervals = [];
  
  // すべてのタイムアウトをクリア
  spinTimeouts.forEach(t => clearTimeout(t));
  spinTimeouts = [];
}

function stopCurrentSpin() {
  // 現在のスピンを停止
  clearAllSpinTimers();
  
  // 状態をリセット
  isSpinning = false;
  slotsStoppedCount = 0;
  
  // ドラムロールを停止
  stopDrumRoll();
}

function spinSlots() {
  // 現在のスピンを停止（すでにスピン中の場合）
  if (isSpinning) {
    stopCurrentSpin();
  }
  
  // 状態リセット
  isSpinning = true;
  slotsStoppedCount = 0;

  document.body.classList.remove('rainbow-bg');
  resetVisuals();

  // ドラムロール再生
  playDrumRoll();

  // 停止タイミングをランダムに設定
  const delays = slots.map(() => Math.random() * 2400 + 1500);

  slots.forEach((slot, index) => {
    // 回転開始
    spinIntervals[index] = setInterval(() => {
      const rand = Math.floor(Math.random() * slotChars.length);
      slot.textContent = slotChars[rand];
    }, 100);

    // 停止タイマー
    spinTimeouts[index] = setTimeout(() => {
      // すでにスピンが停止している場合は何もしない
      if (!isSpinning) return;
      
      clearInterval(spinIntervals[index]);
      slot.classList.add('stopped');

      if (soundEnabled) {
        const src = spinSoundSrcs[Math.floor(Math.random() * spinSoundSrcs.length)];
        playSoundFromSrc(src);
      }

      slotsStoppedCount++;

      if (slotsStoppedCount === 1) {
        // 最初のスロットが止まったらドラムロールを停止
        stopDrumRoll();
      }

      if (slotsStoppedCount === slots.length) {
        slots.forEach(s => s.classList.remove('stopped'));
        const finalSlot = slots[slots.length - 1];
        finalSlot.classList.add('final');

        checkWin();

        isSpinning = false;
      }
    }, delays[index]);
  });
}

function checkWin() {
  const texts = slots.map(s => s.textContent).join('');
  if (texts === 'オナニ') {
    slots.forEach(s => s.classList.add('win'));
    winCount++;
    counter.textContent = winCount;

    if (soundEnabled) {
      playWinSound();
    }

    document.body.classList.add('rainbow-bg');
  } else {
    slots.forEach(s => s.classList.remove('win'));
    document.body.classList.remove('rainbow-bg');
  }
}

function onStartPressed() {
  stopLastWinSound();

  if (soundEnabled) {
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

  spinSlots();
}

// 初期イベント
startBtn.addEventListener('click', onStartPressed);