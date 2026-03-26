export function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}
export function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}
export function showCharacterSelection(onSelect) {
    const container = document.getElementById('characterSelect');
    container.innerHTML = '';
    import('./characters.js').then(({ characters }) => {
        for (let [id, char] of Object.entries(characters)) {
            const div = document.createElement('div');
            div.className = 'char-card';
            div.innerHTML = `<strong>${char.name}</strong><br><small>${char.desc}</small>`;
            div.onclick = () => {
                document
                    .querySelectorAll('.char-card')
                    .forEach((c) => c.classList.remove('selected'));
                div.classList.add('selected');
                onSelect(id);
            };
            container.appendChild(div);
        }
    });
    document.getElementById('characterModal').style.display = 'flex';
}
export function closeCharacterModal() {
    document.getElementById('characterModal').style.display = 'none';
}
export function showGameOver(score, level, onPlayAgain) {
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalLevels').innerText = level;
    document.getElementById('gameOverModal').style.display = 'flex';
    document.getElementById('playAgainBtn').onclick = () => {
        document.getElementById('gameOverModal').style.display = 'none';
        onPlayAgain();
    };
    document.getElementById('closeGameOver').onclick = () => {
        document.getElementById('gameOverModal').style.display = 'none';
    };
}
export function updateLeaderboard(entries) {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    entries.forEach((entry) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        div.innerText = `${entry.email || 'anon'}: ${entry.score} очков, ур.${entry.level}`;
        list.appendChild(div);
    });
}
