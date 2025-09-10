const slotChars = ['オ','ナ','ニ'];

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
let intervals = [];

// 音声設定
const drumRoll = new Audio('ドラムロール.mp3');
const spinSounds = [
  new Audio('爆発1.mp3'),
  new Audio('爆発2.mp3'),
  new Audio('爆発3.mp3'),
  new Audio('爆発4.mp3')
];
const winSound = new Audio('大爆発1.mp3');

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '音声: ON' : '音声: OFF';
});

function spinSlots() {
  document.body.classList.remove('rainbow-bg');
  // タイマークリア
  intervals.forEach(i => clearInterval(i));
  slots.forEach(s => s.classList.remove('win'));

  // スネアロール再生
  if(soundEnabled){
    drumRoll.currentTime = 0;
    drumRoll.play();
  }

  // 各スロット回転
  slots.forEach((slot, index) => {
    intervals[index] = setInterval(() => {
      const rand = Math.floor(Math.random() * slotChars.length);
      slot.textContent = slotChars[rand];
    }, 100);
  });

  // 停止タイミング（左→中→右）
  const delays = [
    Math.random() * 1000 + 2000,
    Math.random() * 2000 + 3000,
    Math.random() * 3000 + 4000
  ];

  slots.forEach((slot, index) => {
    setTimeout(() => {
      clearInterval(intervals[index]);

      // 左スロット停止でドラムロール止める
      if(index === 0 && soundEnabled){
        drumRoll.pause();
      }

      // 文字確定時に1回ランダム音再生
      if(soundEnabled){
        const randomSound = spinSounds[Math.floor(Math.random() * spinSounds.length)];
        randomSound.currentTime = 0;
        randomSound.play();
      }

      checkWin();

    }, delays[index]);
  });
}

// 当たり判定（虹色演出追加済み）
function checkWin() {
  const texts = slots.map(s => s.textContent).join('');
  if(texts === 'オナニ'){
    slots.forEach(s => s.classList.add('win'));
    winCount++;
    counter.textContent = winCount;

    if(soundEnabled){
      winSound.currentTime = 0;
      winSound.play();
    }

    // 虹色演出（オナニ揃いのときだけ）
    document.body.classList.add('rainbow-bg');

  } else {
    slots.forEach(s => s.classList.remove('win'));
    // オナニ以外なら背景は白に戻す
    document.body.classList.remove('rainbow-bg');
  }
}


startBtn.addEventListener('click', spinSlots);
