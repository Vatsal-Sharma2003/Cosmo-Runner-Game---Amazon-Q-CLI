// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_HEIGHT = 50;
const GRAVITY = 0.6;
const JUMP_POWER = -12;
const INITIAL_SCROLL_SPEED = 6;

// Game Variables
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let scrollSpeed = INITIAL_SCROLL_SPEED;
let lastObstacleTime = 0;
let lastPowerUpTime = 0;
let nightMode = false;
let nightModeTimer = 0;
let hasShield = false;
let shieldTimer = 0;

// Game Assets
const assets = {
    images: {},
    sounds: {},
    loaded: false,
    toLoad: 0,
    loaded: 0
};

// Game Objects
const player = {
    x: 50,
    y: CANVAS_HEIGHT - GROUND_HEIGHT - 50,
    width: 40,
    height: 50,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    frameX: 0,
    frameY: 0,
    frameCount: 8,
    frameTimer: 0,
    frameInterval: 100, // ms
    hasDoubleJump: false,
    canDoubleJump: false
};

const background = {
    stars: [],
    planets: [],
    groundX: 0
};

const obstacles = [];
const powerUps = [];

// Initialize the game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Create stars
    for (let i = 0; i < 100; i++) {
        background.stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT),
            size: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.1
        });
    }
    
    // Create planets
    for (let i = 0; i < 3; i++) {
        background.planets.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT) / 2,
            size: Math.random() * 40 + 20,
            speed: Math.random() * 0.2 + 0.05,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }
    
    // Event Listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', startGame);
    document.getElementById('resume-button').addEventListener('click', resumeGame);
    
    // Load assets
    // In a real game, you would load images and sounds here
    
    // Show start screen
    showMessage('game-message');
}

// Event Handlers
function handleKeyDown(e) {
    if (!gameRunning || gamePaused) return;
    
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (!player.isJumping) {
            jump();
        } else if (player.canDoubleJump) {
            doubleJump();
        }
        e.preventDefault();
    } else if (e.code === 'ArrowDown') {
        player.isDucking = true;
        player.height = 25; // Half height when ducking
        e.preventDefault();
    } else if (e.code === 'Escape') {
        togglePause();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (e.code === 'ArrowDown') {
        player.isDucking = false;
        player.height = 50; // Normal height
    }
}

// Game Functions
function startGame() {
    resetGame();
    gameRunning = true;
    gamePaused = false;
    hideAllMessages();
    gameLoop();
}

function resetGame() {
    score = 0;
    scrollSpeed = INITIAL_SCROLL_SPEED;
    obstacles.length = 0;
    powerUps.length = 0;
    player.x = 50;
    player.y = CANVAS_HEIGHT - GROUND_HEIGHT - 50;
    player.velocityY = 0;
    player.isJumping = false;
    player.isDucking = false;
    player.hasDoubleJump = false;
    player.canDoubleJump = false;
    hasShield = false;
    nightMode = false;
    updateScore();
}

function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;
    
    clearCanvas();
    updateGame(timestamp);
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function updateGame(timestamp) {
    // Update score
    score++;
    if (score % 100 === 0) {
        updateScore();
    }
    
    // Increase speed every 1000 points
    if (score % 1000 === 0) {
        scrollSpeed += 0.5;
    }
    
    // Toggle night mode every 5000 points
    if (score % 5000 === 0) {
        nightMode = !nightMode;
        nightModeTimer = 5000; // Duration of night mode
    }
    
    if (nightModeTimer > 0) {
        nightModeTimer--;
        if (nightModeTimer === 0) {
            nightMode = false;
        }
    }
    
    // Update shield timer
    if (hasShield && shieldTimer > 0) {
        shieldTimer--;
        if (shieldTimer === 0) {
            hasShield = false;
        }
    }
    
    // Update player
    updatePlayer();
    
    // Update background
    updateBackground();
    
    // Spawn obstacles
    if (timestamp - lastObstacleTime > getRandomSpawnTime()) {
        spawnObstacle();
        lastObstacleTime = timestamp;
    }
    
    // Spawn power-ups (every 10-15 seconds)
    if (timestamp - lastPowerUpTime > Math.random() * 5000 + 10000) {
        spawnPowerUp();
        lastPowerUpTime = timestamp;
    }
    
    // Update obstacles
    updateObstacles();
    
    // Update power-ups
    updatePowerUps();
    
    // Check collisions
    checkCollisions();
}

function updatePlayer() {
    // Apply gravity
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // Check ground collision
    if (player.y > CANVAS_HEIGHT - GROUND_HEIGHT - player.height) {
        player.y = CANVAS_HEIGHT - GROUND_HEIGHT - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.canDoubleJump = false;
    }
    
    // Update animation frame
    player.frameTimer += 16; // Approximately 60fps
    if (player.frameTimer > player.frameInterval) {
        player.frameTimer = 0;
        player.frameX = (player.frameX + 1) % player.frameCount;
    }
}

function updateBackground() {
    // Move ground
    background.groundX -= scrollSpeed;
    if (background.groundX <= -CANVAS_WIDTH) {
        background.groundX = 0;
    }
    
    // Move stars
    background.stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = CANVAS_WIDTH;
            star.y = Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT);
        }
    });
    
    // Move planets
    background.planets.forEach(planet => {
        planet.x -= planet.speed;
        if (planet.x + planet.size < 0) {
            planet.x = CANVAS_WIDTH + planet.size;
            planet.y = Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT) / 2;
            planet.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        }
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= scrollSpeed;
        
        // Remove obstacles that are off-screen
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.x -= scrollSpeed;
        
        // Remove power-ups that are off-screen
        if (powerUp.x + powerUp.width < 0) {
            powerUps.splice(i, 1);
        }
    }
}

function drawGame() {
    // Draw background
    drawBackground();
    
    // Draw ground
    drawGround();
    
    // Draw obstacles
    drawObstacles();
    
    // Draw power-ups
    drawPowerUps();
    
    // Draw player
    drawPlayer();
}

function drawBackground() {
    // Draw sky
    ctx.fillStyle = nightMode ? '#000033' : '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw stars
    ctx.fillStyle = '#fff';
    background.stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw planets
    background.planets.forEach(planet => {
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawGround() {
    // Draw alien terrain
    ctx.fillStyle = nightMode ? '#003300' : '#330033';
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    
    // Draw terrain details
    ctx.fillStyle = nightMode ? '#004400' : '#440044';
    for (let i = 0; i < 20; i++) {
        const x = (i * 100 + background.groundX) % CANVAS_WIDTH;
        const height = Math.sin(i * 0.5) * 10 + 15;
        ctx.fillRect(x, CANVAS_HEIGHT - GROUND_HEIGHT, 50, -height);
    }
}

function drawPlayer() {
    // Draw AstroBot
    ctx.fillStyle = hasShield ? '#00ffff' : '#fff';
    
    // Draw body
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw helmet
    ctx.fillStyle = '#aaf';
    ctx.fillRect(player.x + 5, player.y - 10, player.width - 10, 15);
    
    // Draw visor
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 10, player.y - 5, player.width - 20, 5);
    
    // Draw legs in motion (simple animation)
    if (player.isJumping) {
        // Jumping pose
        ctx.fillStyle = '#aaa';
        ctx.fillRect(player.x + 5, player.y + player.height, 10, 10);
        ctx.fillRect(player.x + player.width - 15, player.y + player.height, 10, 10);
    } else if (player.isDucking) {
        // Ducking pose
        ctx.fillStyle = '#aaa';
        ctx.fillRect(player.x + 5, player.y + player.height, 30, 5);
    } else {
        // Running animation
        ctx.fillStyle = '#aaa';
        if (player.frameX < player.frameCount / 2) {
            ctx.fillRect(player.x + 5, player.y + player.height, 10, 15);
            ctx.fillRect(player.x + player.width - 15, player.y + player.height - 10, 10, 10);
        } else {
            ctx.fillRect(player.x + 5, player.y + player.height - 10, 10, 10);
            ctx.fillRect(player.x + player.width - 15, player.y + player.height, 10, 15);
        }
    }
    
    // Draw shield effect if active
    if (hasShield) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 
                Math.max(player.width, player.height) * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        switch (obstacle.type) {
            case 'crater':
                // Draw crater
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.ellipse(obstacle.x + obstacle.width / 2, CANVAS_HEIGHT - GROUND_HEIGHT + 10, 
                           obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'meteor':
                // Draw meteor
                ctx.fillStyle = '#a52';
                ctx.beginPath();
                ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, 
                        obstacle.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw meteor trail
                ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(obstacle.x + obstacle.width, obstacle.y);
                ctx.lineTo(obstacle.x + obstacle.width + 20, obstacle.y - 20);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'crow':
                // Draw alien crow
                ctx.fillStyle = '#339';
                
                // Body
                ctx.beginPath();
                ctx.ellipse(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, 
                           obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                ctx.beginPath();
                if (obstacle.frameX % 2 === 0) {
                    // Wings up
                    ctx.moveTo(obstacle.x + 10, obstacle.y + 10);
                    ctx.lineTo(obstacle.x - 10, obstacle.y - 10);
                    ctx.lineTo(obstacle.x + 20, obstacle.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + obstacle.width - 10, obstacle.y + 10);
                    ctx.lineTo(obstacle.x + obstacle.width + 10, obstacle.y - 10);
                    ctx.lineTo(obstacle.x + obstacle.width - 20, obstacle.y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Wings down
                    ctx.moveTo(obstacle.x + 10, obstacle.y + 10);
                    ctx.lineTo(obstacle.x - 10, obstacle.y + 30);
                    ctx.lineTo(obstacle.x + 20, obstacle.y + 20);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + obstacle.width - 10, obstacle.y + 10);
                    ctx.lineTo(obstacle.x + obstacle.width + 10, obstacle.y + 30);
                    ctx.lineTo(obstacle.x + obstacle.width - 20, obstacle.y + 20);
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Update animation frame
                obstacle.frameTimer += 16;
                if (obstacle.frameTimer > 200) {
                    obstacle.frameTimer = 0;
                    obstacle.frameX = (obstacle.frameX + 1) % 2;
                }
                break;
        }
    });
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        switch (powerUp.type) {
            case 'shield':
                // Draw shield power-up
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 
                        powerUp.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw shield icon
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 
                        powerUp.width / 3, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'doubleJump':
                // Draw double jump power-up
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 
                        powerUp.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw jump icon
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.moveTo(powerUp.x + powerUp.width / 2, powerUp.y + 5);
                ctx.lineTo(powerUp.x + powerUp.width - 5, powerUp.y + powerUp.height - 5);
                ctx.lineTo(powerUp.x + 5, powerUp.y + powerUp.height - 5);
                ctx.closePath();
                ctx.fill();
                break;
        }
    });
}

function jump() {
    player.velocityY = JUMP_POWER;
    player.isJumping = true;
    
    if (player.hasDoubleJump) {
        player.canDoubleJump = true;
    }
}

function doubleJump() {
    if (player.canDoubleJump) {
        player.velocityY = JUMP_POWER * 0.8;
        player.canDoubleJump = false;
    }
}

function spawnObstacle() {
    const types = ['crater', 'meteor', 'crow'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let obstacle = {
        type: randomType,
        frameX: 0,
        frameTimer: 0
    };
    
    switch (randomType) {
        case 'crater':
            obstacle.x = CANVAS_WIDTH;
            obstacle.y = CANVAS_HEIGHT - GROUND_HEIGHT;
            obstacle.width = 60;
            obstacle.height = 20;
            break;
            
        case 'meteor':
            obstacle.x = CANVAS_WIDTH;
            obstacle.y = CANVAS_HEIGHT - GROUND_HEIGHT - 40;
            obstacle.width = 40;
            obstacle.height = 40;
            break;
            
        case 'crow':
            obstacle.x = CANVAS_WIDTH;
            obstacle.y = Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT - 100) + 50;
            obstacle.width = 50;
            obstacle.height = 30;
            break;
    }
    
    obstacles.push(obstacle);
}

function spawnPowerUp() {
    const types = ['shield', 'doubleJump'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const powerUp = {
        type: randomType,
        x: CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT - 100) + 50,
        width: 30,
        height: 30
    };
    
    powerUps.push(powerUp);
}

function checkCollisions() {
    // Check obstacle collisions
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        
        if (isColliding(player, obstacle)) {
            if (hasShield) {
                // Shield protects from one collision
                hasShield = false;
                shieldTimer = 0;
                obstacles.splice(i, 1);
                break;
            } else {
                gameOver();
                return;
            }
        }
    }
    
    // Check power-up collisions
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (isColliding(player, powerUp)) {
            collectPowerUp(powerUp);
            powerUps.splice(i, 1);
        }
    }
}

function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function collectPowerUp(powerUp) {
    switch (powerUp.type) {
        case 'shield':
            hasShield = true;
            shieldTimer = 500; // Shield lasts for 500 frames (about 8 seconds)
            break;
            
        case 'doubleJump':
            player.hasDoubleJump = true;
            if (player.isJumping) {
                player.canDoubleJump = true;
            }
            // Double jump lasts until used
            break;
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('final-score').textContent = score;
    showMessage('game-over');
}

function togglePause() {
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        showMessage('pause-menu');
    } else {
        hideAllMessages();
        gameLoop();
    }
}

function resumeGame() {
    if (gamePaused) {
        gamePaused = false;
        hideAllMessages();
        gameLoop();
    }
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

function getRandomSpawnTime() {
    // Get spawn time based on obstacle type probabilities
    const minTime = 1000; // Minimum 1 second
    const maxTime = 3000; // Maximum 3 seconds
    
    // As score increases, spawn time decreases
    const scoreMultiplier = Math.max(0.5, 1 - score / 10000);
    
    return Math.random() * (maxTime - minTime) * scoreMultiplier + minTime;
}

function showMessage(id) {
    hideAllMessages();
    document.getElementById(id).classList.remove('hidden');
}

function hideAllMessages() {
    document.getElementById('game-message').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
}

// Initialize the game when the page loads
window.addEventListener('load', init);
