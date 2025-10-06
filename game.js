// --- Matter.jsのモジュール ---
const { Engine, Render, Runner, World, Bodies, Body, Events, Query } = Matter;

// --- ゲームの基本設定 ---
const V_WIDTH = 400;
const V_HEIGHT = 700;
const TSUM_RADIUS = 25;
const TSUM_TYPES = 5;
const TSUM_COLORS = ['#ff6666', '#66ff66', '#6666ff', '#ffff66', '#ff66ff'];
const GRAVITY_Y = 0.8;
const GAME_TIME = 60; // 制限時間（秒）

// --- DOM要素の取得 ---
const gameContainer = document.getElementById('game-container');
const uiContainer = document.getElementById('ui-container');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const shuffleButton = document.getElementById('shuffle-button');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.querySelector('#final-score span');
const restartButton = document.getElementById('restart-button');

// --- ゲームの状態管理 ---
let score = 0;
let isDragging = false;
let currentChain = [];
let currentTsumType = -1;
let timer = GAME_TIME;
let timerInterval = null;
let isGameActive = false;

// --- Matter.jsのセットアップ ---
const engine = Engine.create();
const world = engine.world;
world.gravity.y = GRAVITY_Y;

const render = Render.create({
    element: gameContainer,
    engine: engine,
    options: {
        width: V_WIDTH,
        height: V_HEIGHT,
        wireframes: false,
        background: '#f8f8f8'
    }
});

const runner = Runner.create();

// --- 壁と床の作成 ---
const wallOptions = { isStatic: true, render: { fillStyle: '#333' } };
World.add(world, [
    Bodies.rectangle(V_WIDTH / 2, V_HEIGHT, V_WIDTH, 40, wallOptions),
    Bodies.rectangle(0, V_HEIGHT / 2, 20, V_HEIGHT, wallOptions),
    Bodies.rectangle(V_WIDTH, V_HEIGHT / 2, 20, V_HEIGHT, wallOptions)
]);

// --- ツムを生成/補充する関数 ---
function addTsums(count) {
    for (let i = 0; i < count; i++) {
        const type = Math.floor(Math.random() * TSUM_TYPES);
        const tsum = Bodies.circle(
            Math.random() * (V_WIDTH - 80) + 40,
            -50 * i - 50,
            TSUM_RADIUS,
            {
                restitution: 0.3, friction: 0.5, label: 'tsum',
                render: { fillStyle: TSUM_COLORS[type] }
            }
        );
        tsum.tsumType = type;
        World.add(world, tsum);
    }
}

// --- ゲーム開始処理 ---
function startGame() {
    isGameActive = true;
    score = 0;
    timer = GAME_TIME;
    scoreElement.innerText = score;
    timerElement.innerText = timer;
    
    gameOverScreen.style.display = 'none';
    uiContainer.style.visibility = 'visible';
    shuffleButton.style.visibility = 'visible';

    const allTsums = world.bodies.filter(body => body.label === 'tsum');
    allTsums.forEach(tsum => World.remove(world, tsum));

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    //     ここの数値を30から45に変更しました
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    addTsums(45);

    Render.run(render);
    Runner.run(runner, engine);

    timerInterval = setInterval(() => {
        timer--;
        timerElement.innerText = timer;
        if (timer <= 0) {
            endGame();
        }
    }, 1000);
}

// --- ゲーム終了処理 ---
function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    Runner.stop(runner);
    finalScoreElement.innerText = score;
    gameOverScreen.style.display = 'flex';
}

// --- シャッフル機能 ---
shuffleButton.addEventListener('click', () => {
    if (!isGameActive) return;
    const allTsums = world.bodies.filter(body => body.label === 'tsum');
    allTsums.forEach(tsum => {
        const x = Math.random() * (V_WIDTH - 80) + 40;
        const y = Math.random() * (V_HEIGHT - 200);
        Body.setPosition(tsum, { x, y });
        Body.setVelocity(tsum, { x: 0, y: 0 });
    });
});

// --- ボタンのイベントリスナー ---
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    startGame();
});

restartButton.addEventListener('click', startGame);


// --- マウス操作のイベントリスナー ---
function getMousePosition(event) {
    const bounds = render.canvas.getBoundingClientRect();
    return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
    };
}

render.canvas.addEventListener('mousedown', (event) => {
    if (!isGameActive) return;
    const mousePosition = getMousePosition(event);
    const bodies = Query.point(world.bodies, mousePosition);
    if (bodies.length > 0 && bodies[0].label === 'tsum') {
        isDragging = true;
        const startTsum = bodies[0];
        currentTsumType = startTsum.tsumType;
        currentChain.push(startTsum);
        startTsum.render.strokeStyle = '#000';
        startTsum.render.lineWidth = 3;
    }
});

render.canvas.addEventListener('mousemove', (event) => {
    if (!isDragging || !isGameActive) return;
    const mousePosition = getMousePosition(event);
    const bodies = Query.point(world.bodies, mousePosition);
    if (bodies.length > 0 && bodies[0].label === 'tsum') {
        const tsum = bodies[0];
        if (tsum.tsumType === currentTsumType && !currentChain.includes(tsum)) {
            const lastTsum = currentChain[currentChain.length - 1];
            const distance = Matter.Vector.magnitude(Matter.Vector.sub(tsum.position, lastTsum.position));
            if (distance < TSUM_RADIUS * 2.5) {
                currentChain.push(tsum);
                tsum.render.strokeStyle = '#000';
                tsum.render.lineWidth = 3;
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    if (!isDragging || !isGameActive) return;
    
    if (currentChain.length >= 3) {
        score += currentChain.length * 100;
        scoreElement.innerText = score;
        const tsumsToRemove = [...currentChain];
        World.remove(world, tsumsToRemove);
        setTimeout(() => addTsums(tsumsToRemove.length), 500);
    }

    currentChain.forEach(tsum => {
        tsum.render.strokeStyle = null;
        tsum.render.lineWidth = 1;
    });

    isDragging = false;
    currentChain = [];
    currentTsumType = -1;
});