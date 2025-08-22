// Игровое состояние
class GameState {
    constructor() {
        this.playerName = '';
        this.playerAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
        this.wins = 0;
        this.losses = 0;
        this.currentFight = null;
        this.currentScreen = 'registration';
        
        // Загрузка из localStorage
        this.loadGameData();
    }

    saveGameData() {
        const gameData = {
            playerName: this.playerName,
            playerAvatar: this.playerAvatar,
            wins: this.wins,
            losses: this.losses,
            currentFight: this.currentFight
        };
        localStorage.setItem('notFightClubData', JSON.stringify(gameData));
    }

    loadGameData() {
        const savedData = localStorage.getItem('notFightClubData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.playerName = data.playerName || '';
            this.playerAvatar = data.playerAvatar || this.playerAvatar;
            this.wins = data.wins || 0;
            this.losses = data.losses || 0;
            this.currentFight = data.currentFight || null;
            
            // Если у игрока уже есть имя, пропускаем регистрацию
            if (this.playerName) {
                this.currentScreen = 'home';
            }
        }
    }
}

// Система врагов
class Enemy {
    constructor(name, avatar, health, damage, critChance, critMultiplier, attackZones, defenseZones) {
        this.name = name;
        this.avatar = avatar;
        this.maxHealth = health;
        this.health = health;
        this.damage = damage;
        this.critChance = critChance;
        this.critMultiplier = critMultiplier;
        this.attackZones = attackZones; // количество зон атаки
        this.defenseZones = defenseZones; // количество зон защиты
    }
}

// Пул врагов
const ENEMIES = [
    new Enemy(
        '⚔️ Берсерк Рагнар',
        'https://api.dicebear.com/7.x/bottts/svg?seed=berserker',
        120,
        25,
        0.15,
        1.5,
        2, // бьёт в 2 зоны
        1  // защищает 1 зону
    ),
    new Enemy(
        '🛡️ Страж Один',
        'https://api.dicebear.com/7.x/bottts/svg?seed=guardian',
        150,
        20,
        0.1,
        1.8,
        1, // бьёт в 1 зону
        3  // защищает 3 зоны
    ),
    new Enemy(
        '🗡️ Ярл Торгрим',
        'https://api.dicebear.com/7.x/bottts/svg?seed=jarl',
        130,
        22,
        0.2,
        1.6,
        1, // бьёт в 1 зону
        2  // защищает 2 зоны
    )
];

// Игрок
class Player {
    constructor() {
        this.maxHealth = 100;
        this.health = 100;
        this.damage = 20;
        this.critChance = 0.15;
        this.critMultiplier = 1.5;
    }

    reset() {
        this.health = this.maxHealth;
    }
}

// Система боя
class FightSystem {
    constructor() {
        this.player = new Player();
        this.enemy = null;
        this.zones = ['head', 'body', 'legs'];
        this.selectedAttackZone = null;
        this.selectedDefenseZones = [];
        this.fightLog = [];
        this.isPlayerTurn = true;
        this.fightInProgress = false;
    }

    startFight() {
        // Сбрасываем состояние
        this.player.reset();
        this.selectedAttackZone = null;
        this.selectedDefenseZones = [];
        this.fightLog = [];
        this.isPlayerTurn = true;
        this.fightInProgress = true;

        // Выбираем случайного врага
        this.enemy = this.getRandomEnemy();
        this.enemy.health = this.enemy.maxHealth;

        // Обновляем UI
        this.updateFightUI();
        this.addLog(`Бой начался! ${gameState.playerName} против ${this.enemy.name}`);
        
        // Очищаем выбор зон
        this.clearZoneSelection();
    }

    getRandomEnemy() {
        const randomIndex = Math.floor(Math.random() * ENEMIES.length);
        const enemyTemplate = ENEMIES[randomIndex];
        return new Enemy(
            enemyTemplate.name,
            enemyTemplate.avatar,
            enemyTemplate.maxHealth,
            enemyTemplate.damage,
            enemyTemplate.critChance,
            enemyTemplate.critMultiplier,
            enemyTemplate.attackZones,
            enemyTemplate.defenseZones
        );
    }

    selectAttackZone(zone) {
        if (!this.fightInProgress) return;

        this.selectedAttackZone = zone;
        
        // Обновляем UI выбора атаки
        document.querySelectorAll('.attack-zone').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-zone="${zone}"].attack-zone`).classList.add('selected');
        
        this.updateSelectionDisplay();
        this.checkAttackReady();
    }

    selectDefenseZone(zone) {
        if (!this.fightInProgress) return;
        
        const maxDefenseZones = 2;
        
        if (this.selectedDefenseZones.includes(zone)) {
            // Убираем зону из защиты
            this.selectedDefenseZones = this.selectedDefenseZones.filter(z => z !== zone);
            document.querySelector(`[data-zone="${zone}"].defense-zone`).classList.remove('selected');
        } else if (this.selectedDefenseZones.length < maxDefenseZones) {
            // Добавляем зону в защиту
            this.selectedDefenseZones.push(zone);
            document.querySelector(`[data-zone="${zone}"].defense-zone`).classList.add('selected');
        }
        
        this.updateSelectionDisplay();
        this.checkAttackReady();
    }

    updateSelectionDisplay() {
        const attackDisplay = document.getElementById('attack-selection');
        const defenseDisplay = document.getElementById('defense-selection');
        
        attackDisplay.textContent = this.selectedAttackZone ? this.getZoneName(this.selectedAttackZone) : '-';
        defenseDisplay.textContent = this.selectedDefenseZones.length > 0 
            ? this.selectedDefenseZones.map(z => this.getZoneName(z)).join(', ')
            : '-';
    }

    getZoneName(zone) {
        const names = {
            'head': 'Голова',
            'body': 'Тело',
            'legs': 'Ноги'
        };
        return names[zone];
    }

    checkAttackReady() {
        const attackBtn = document.getElementById('attack-btn');
        const ready = this.selectedAttackZone && this.selectedDefenseZones.length > 0;
        attackBtn.disabled = !ready;
    }

    performAttack() {
        if (!this.fightInProgress || !this.selectedAttackZone || this.selectedDefenseZones.length === 0) {
            return;
        }

        // Ход игрока
        this.playerAttack();
        
        // Проверяем, не закончился ли бой
        if (this.checkFightEnd()) {
            return;
        }

        // Небольшая задержка перед ходом врага
        setTimeout(() => {
            this.enemyAttack();
            this.checkFightEnd();
        }, 1500);
    }

    playerAttack() {
        // ИИ врага выбирает защиту
        const enemyDefenseZones = this.getEnemyDefenseZones();
        
        let damage = this.player.damage;
        let isCritical = Math.random() < this.player.critChance;
        let isBlocked = enemyDefenseZones.includes(this.selectedAttackZone);
        
        if (isCritical && !isBlocked) {
            damage = Math.floor(damage * this.player.critMultiplier);
        }
        
        if (isBlocked) {
            damage = Math.floor(damage * 0.3); // урон при блоке снижается
        }
        
        this.enemy.health = Math.max(0, this.enemy.health - damage);
        
        // Лог атаки
        let logMessage = `<span class="attacker">${gameState.playerName}</span> атакует в <span class="zone">${this.getZoneName(this.selectedAttackZone)}</span>`;
        
        if (isBlocked) {
            logMessage += ` - ЗАБЛОКИРОВАНО! Урон: <span class="damage">${damage}</span>`;
        } else if (isCritical) {
            logMessage += ` - КРИТИЧЕСКИЙ УДАР! Урон: <span class="damage">${damage}</span>`;
        } else {
            logMessage += ` - Урон: <span class="damage">${damage}</span>`;
        }
        
        this.addLog(logMessage, isCritical ? 'critical' : 'player-attack');
        
        // Обновляем UI
        this.updateHealthBars();
        this.clearZoneSelection();
    }

    enemyAttack() {
        if (this.enemy.health <= 0) return;
        
        // ИИ врага выбирает атаку
        const enemyAttackZones = this.getEnemyAttackZones();
        
        let totalDamage = 0;
        let criticalHits = 0;
        let blockedAttacks = 0;
        
        enemyAttackZones.forEach(attackZone => {
            let damage = this.enemy.damage;
            let isCritical = Math.random() < this.enemy.critChance;
            let isBlocked = this.selectedDefenseZones.includes(attackZone);
            
            if (isCritical && !isBlocked) {
                damage = Math.floor(damage * this.enemy.critMultiplier);
                criticalHits++;
            }
            
            if (isBlocked) {
                damage = Math.floor(damage * 0.3);
                blockedAttacks++;
            }
            
            totalDamage += damage;
        });
        
        this.player.health = Math.max(0, this.player.health - totalDamage);
        
        // Лог атаки врага
        let logMessage = `<span class="attacker">${this.enemy.name}</span> атакует в ${enemyAttackZones.map(z => this.getZoneName(z)).join(', ')}`;
        
        if (blockedAttacks > 0) {
            logMessage += ` - ${blockedAttacks} атак заблокировано!`;
        }
        
        if (criticalHits > 0) {
            logMessage += ` - ${criticalHits} критических удара!`;
        }
        
        logMessage += ` Общий урон: <span class="damage">${totalDamage}</span>`;
        
        this.addLog(logMessage, criticalHits > 0 ? 'critical' : 'enemy-attack');
        
        // Обновляем UI
        this.updateHealthBars();
    }

    getEnemyAttackZones() {
        const shuffledZones = [...this.zones].sort(() => Math.random() - 0.5);
        return shuffledZones.slice(0, this.enemy.attackZones);
    }

    getEnemyDefenseZones() {
        const shuffledZones = [...this.zones].sort(() => Math.random() - 0.5);
        return shuffledZones.slice(0, this.enemy.defenseZones);
    }

    clearZoneSelection() {
        this.selectedAttackZone = null;
        this.selectedDefenseZones = [];
        
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.updateSelectionDisplay();
        this.checkAttackReady();
    }

    updateHealthBars() {
        // Игрок
        const playerHealthPercentage = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('player-health-fill').style.width = `${playerHealthPercentage}%`;
        document.getElementById('player-health-text').textContent = `${this.player.health}/${this.player.maxHealth}`;
        
        // Враг
        const enemyHealthPercentage = (this.enemy.health / this.enemy.maxHealth) * 100;
        document.getElementById('enemy-health-fill').style.width = `${enemyHealthPercentage}%`;
        document.getElementById('enemy-health-text').textContent = `${this.enemy.health}/${this.enemy.maxHealth}`;
    }

    updateFightUI() {
        document.getElementById('fight-player-name').textContent = gameState.playerName;
        document.getElementById('fight-player-avatar').src = gameState.playerAvatar;
        document.getElementById('enemy-name').textContent = this.enemy.name;
        document.getElementById('enemy-avatar').src = this.enemy.avatar;
        
        this.updateHealthBars();
        
        // Очищаем лог
        document.getElementById('log-container').innerHTML = '';
    }

    addLog(message, type = '') {
        const logContainer = document.getElementById('log-container');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = message;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    checkFightEnd() {
        if (this.player.health <= 0) {
            this.endFight(false);
            return true;
        }
        
        if (this.enemy.health <= 0) {
            this.endFight(true);
            return true;
        }
        
        return false;
    }

    endFight(playerWon) {
        this.fightInProgress = false;
        
        if (playerWon) {
            gameState.wins++;
            this.addLog(`🎉 ${gameState.playerName} победил!`, 'player-attack');
            this.showResultModal('Победа!', `Поздравляем! Вы победили ${this.enemy.name}!`);
        } else {
            gameState.losses++;
            this.addLog(`💀 ${this.enemy.name} победил!`, 'enemy-attack');
            this.showResultModal('Поражение', `Вы проиграли ${this.enemy.name}. Попробуйте еще раз!`);
        }
        
        gameState.saveGameData();
    }

    showResultModal(title, message) {
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-message').textContent = message;
        document.getElementById('result-modal').classList.add('active');
    }
}

// Глобальные переменные
let gameState;
let fightSystem;

// Генерация аватаров
function generateAvatars() {
    return [
        // Аватаарс стиль (люди-викинги)
        'https://api.dicebear.com/7.x/avataaars/svg?seed=viking1',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=warrior2',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=berserker3',
        // Боттс стиль (роботы-воины)
        'https://api.dicebear.com/7.x/bottts/svg?seed=robot1',
        'https://api.dicebear.com/7.x/bottts/svg?seed=mech2',
        'https://api.dicebear.com/7.x/bottts/svg?seed=cyborg3',
        // Персоны стиль (простые лица)
        'https://api.dicebear.com/7.x/personas/svg?seed=hero1',
        'https://api.dicebear.com/7.x/personas/svg?seed=champion2',
        'https://api.dicebear.com/7.x/personas/svg?seed=gladiator3',
        // Пиксель арт стиль
        'https://api.dicebear.com/7.x/pixel-art/svg?seed=pixel1',
        'https://api.dicebear.com/7.x/pixel-art/svg?seed=pixel2',
        'https://api.dicebear.com/7.x/pixel-art/svg?seed=pixel3'
    ];
}

// Навигация между экранами
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Обновляем активные кнопки навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    gameState.currentScreen = screenId;
}

// Обновление отображения данных игрока
function updatePlayerDisplay() {
    document.getElementById('player-name-display').textContent = gameState.playerName;
    document.getElementById('character-name').textContent = gameState.playerName;
    document.getElementById('player-avatar').src = gameState.playerAvatar;
    document.getElementById('wins-count').textContent = gameState.wins;
    document.getElementById('losses-count').textContent = gameState.losses;
    document.getElementById('new-player-name').value = gameState.playerName;
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    gameState = new GameState();
    fightSystem = new FightSystem();
    
    // Показываем нужный экран
    showScreen(gameState.currentScreen + '-screen');
    
    if (gameState.playerName) {
        updatePlayerDisplay();
    }

    // Регистрация
    document.getElementById('register-btn').addEventListener('click', function() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            alert('Имя должно содержать минимум 2 символа');
            return;
        }
        
        gameState.playerName = name;
        gameState.saveGameData();
        
        showScreen('home-screen');
        updatePlayerDisplay();
    });
    
    // Проверка Enter в поле регистрации
    document.getElementById('player-name').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('register-btn').click();
        }
    });

    // Навигация - Главная
    document.querySelectorAll('[id^="home-nav"]').forEach(btn => {
        btn.addEventListener('click', function() {
            showScreen('home-screen');
            this.classList.add('active');
        });
    });

    // Навигация - Персонаж
    document.querySelectorAll('[id^="character-nav"]').forEach(btn => {
        btn.addEventListener('click', function() {
            showScreen('character-screen');
            this.classList.add('active');
            updatePlayerDisplay();
        });
    });

    // Навигация - Настройки
    document.querySelectorAll('[id^="settings-nav"]').forEach(btn => {
        btn.addEventListener('click', function() {
            showScreen('settings-screen');
            this.classList.add('active');
        });
    });

    // Начать бой
    document.getElementById('start-fight-btn').addEventListener('click', function() {
        showScreen('fight-screen');
        fightSystem.startFight();
    });
    
    // Возврат домой из боя
    document.getElementById('back-home-btn').addEventListener('click', function() {
        showScreen('home-screen');
        fightSystem.fightInProgress = false;
    });

    // Выбор зон атаки
    document.querySelectorAll('.attack-zone').forEach(btn => {
        btn.addEventListener('click', function() {
            const zone = this.dataset.zone;
            fightSystem.selectAttackZone(zone);
        });
    });

    // Выбор зон защиты
    document.querySelectorAll('.defense-zone').forEach(btn => {
        btn.addEventListener('click', function() {
            const zone = this.dataset.zone;
            fightSystem.selectDefenseZone(zone);
        });
    });

    // Атака
    document.getElementById('attack-btn').addEventListener('click', function() {
        fightSystem.performAttack();
    });

    // Смена аватара
    document.querySelector('.avatar-container').addEventListener('click', function() {
        const modal = document.getElementById('avatar-modal');
        const grid = document.getElementById('avatar-grid');
        
        // Генерируем аватары
        const avatars = generateAvatars();
        grid.innerHTML = '';
        
        avatars.forEach(avatarUrl => {
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.className = 'avatar-option';
            img.addEventListener('click', function() {
                gameState.playerAvatar = avatarUrl;
                gameState.saveGameData();
                updatePlayerDisplay();
                modal.classList.remove('active');
            });
            grid.appendChild(img);
        });
        
        modal.classList.add('active');
    });

    // Закрытие модального окна аватара
    document.getElementById('close-avatar-modal').addEventListener('click', function() {
        document.getElementById('avatar-modal').classList.remove('active');
    });

    // Смена имени
    document.getElementById('change-name-btn').addEventListener('click', function() {
        const newNameInput = document.getElementById('new-player-name');
        const newName = newNameInput.value.trim();
        
        if (newName.length < 2) {
            alert('Имя должно содержать минимум 2 символа');
            return;
        }
        
        gameState.playerName = newName;
        gameState.saveGameData();
        updatePlayerDisplay();
        
        alert('Имя успешно изменено!');
    });

    // Результат боя - новый бой
    document.getElementById('new-fight-btn').addEventListener('click', function() {
        document.getElementById('result-modal').classList.remove('active');
        fightSystem.startFight();
    });

    // Результат боя - домой
    document.getElementById('go-home-btn').addEventListener('click', function() {
        document.getElementById('result-modal').classList.remove('active');
        showScreen('home-screen');
        updatePlayerDisplay();
    });

    // Закрытие модальных окон по клику вне их
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    console.log('Not Fight Club загружен!');
});