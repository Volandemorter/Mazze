import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { getDatabase, ref, push, get, update } from 'firebase/database';
import { characters } from './characters.js';
import { MazeGenerator } from './maze.js';
import { Game } from './game.js';
import { TextureLoader } from './textures.js';
import { Joystick } from './joystick.js';
import * as ui from './ui.js';

const firebaseConfig = {
    apiKey: 'AIzaSyAZjARpOm4u4z0T_BWIDjT1sDWkl0jQRrY',
    authDomain: 'mazze-80a3f.firebaseapp.com',
    projectId: 'mazze-80a3f',
    storageBucket: 'mazze-80a3f.firebasestorage.app',
    messagingSenderId: '879435062204',
    appId: '1:879435062204:web:e345724c6397dfd37be9b9',
    measurementId: 'G-6ZNC886MHC',
    databaseURL:
        'https://mazze-80a3f-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let isGuest = false;
let currentGame = null;
let currentCharacterId = 'worker';
let textureLoader = new TextureLoader();
let joystick = null;

// Инициализация текстур
await textureLoader.loadAll();

// Функция запуска игры
async function startGame(characterId, startLevel = 1, keepScore = false) {
    if (currentGame && currentGame.running) currentGame.endGame(false);
    const level = startLevel;
    const size = Math.min(5 + (level - 1) * 2, 15);
    const mazeData = MazeGenerator.generate(size, size, level);
    const canvas = document.getElementById('gameCanvas');
    const callbacks = {
        onLevelComplete: (newScore, lvl, timeBonus) => {
            // сохранить скор в Firebase
            if (currentUser && !isGuest) {
                const userRef = ref(db, `users/${currentUser.uid}`);
                get(userRef).then((snap) => {
                    let data = snap.val() || { totalScore: 0, bestLevel: 0 };
                    let newTotal = (data.totalScore || 0) + newScore;
                    let newLevel = Math.max(data.bestLevel || 0, lvl);
                    update(userRef, {
                        totalScore: newTotal,
                        bestLevel: newLevel,
                    });
                });
            }
            // следующий уровень
            let nextLevel = lvl + 1;
            let extraTime = 10 + Math.floor(timeBonus / 2);
            startGame(characterId, nextLevel, true);
            if (currentGame) {
                currentGame.timeLeft += extraTime;
                document.getElementById('timer').innerText =
                    currentGame.timeLeft;
            }
        },
        onGameOver: (finalScore, lvl) => {
            ui.showGameOver(finalScore, lvl, () => {
                ui.showCharacterSelection((id) => {
                    currentCharacterId = id;
                    startGame(id, 1, false);
                });
            });
            if (currentUser && !isGuest) {
                const leaderboardRef = ref(db, 'leaderboard');
                push(leaderboardRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    score: finalScore,
                    level: lvl,
                    date: Date.now(),
                });
                loadLeaderboard();
            }
            currentGame = null;
        },
    };
    currentGame = new Game(
        canvas,
        mazeData,
        characters[characterId],
        level,
        callbacks,
        textureLoader,
    );
    currentGame.setControlMode(getControlMode());
    document.getElementById('score').innerText = keepScore
        ? currentGame.score
        : 0;
    document.getElementById('level').innerText = level;
    document.getElementById('charName').innerText =
        characters[characterId].name;
    if (!keepScore) {
        currentGame.timeLeft = 15;
        document.getElementById('timer').innerText = '15';
    }
}

function getControlMode() {
    const radios = document.querySelectorAll('input[name="control"]');
    for (let radio of radios) {
        if (radio.checked) return radio.value;
    }
    return 'keys';
}

function setupControlModeChange() {
    const radios = document.querySelectorAll('input[name="control"]');
    const joystickContainer = document.getElementById('joystickContainer');
    radios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (currentGame) currentGame.setControlMode(mode);
            if (mode === 'joystick') {
                joystickContainer.style.display = 'block';
                if (!joystick) {
                    const base = document.getElementById('joystickBase');
                    joystick = new Joystick(base, (dir) => {
                        if (
                            currentGame &&
                            currentGame.controlMode === 'joystick'
                        ) {
                            currentGame.setJoystickDirection(dir);
                        }
                    });
                }
            } else {
                joystickContainer.style.display = 'none';
                if (currentGame && currentGame.controlMode === 'joystick') {
                    currentGame.setJoystickDirection({ x: 0, y: 0 });
                }
            }
        });
    });
}

async function loadLeaderboard() {
    const leaderRef = ref(db, 'leaderboard');
    const snapshot = await get(leaderRef);
    const data = snapshot.val();
    if (data) {
        const entries = Object.values(data)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        ui.updateLeaderboard(entries);
    }
}

// Firebase auth handlers
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        isGuest = false;
        ui.closeAuthModal();
        ui.showCharacterSelection((id) => {
            currentCharacterId = id;
            startGame(id, 1, false);
        });
        loadLeaderboard();
    } else if (!isGuest) {
        ui.showAuthModal();
    }
});

// Обработчики кнопок
document.getElementById('loginBtn').onclick = () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    signInWithEmailAndPassword(auth, email, pass).catch((err) =>
        alert(err.message),
    );
};
document.getElementById('registerBtn').onclick = () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    createUserWithEmailAndPassword(auth, email, pass).catch((err) =>
        alert(err.message),
    );
};
document.getElementById('guestBtn').onclick = () => {
    isGuest = true;
    currentUser = null;
    ui.closeAuthModal();
    ui.showCharacterSelection((id) => {
        currentCharacterId = id;
        startGame(id, 1, false);
    });
};
document.getElementById('logoutBtn').onclick = () => {
    signOut(auth);
    if (currentGame) currentGame.endGame(false);
    currentGame = null;
    isGuest = false;
};
document.getElementById('restartGame').onclick = () => {
    if (currentGame) currentGame.endGame(false);
    ui.showCharacterSelection((id) => {
        currentCharacterId = id;
        startGame(id, 1, false);
    });
};
document.getElementById('showLeaderboardBtn').onclick = () => {
    const panel = document.getElementById('leaderboardPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    loadLeaderboard();
};

setupControlModeChange();
