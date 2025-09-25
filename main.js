// Get the canvas element from the DOM
const canvas = document.querySelector(`canvas`);
// Get the WebGL rendering context
const webgl = canvas.getContext(`webgl`);

// Set the background color (dark green)
webgl.clearColor(0.0, 0.1, 0.0, 1.0);

// Load sound effects into memory
const sounds = {
    paddleHit: new Audio('bullet-hit-metal-84818.mp3'),
    blockHit: new Audio('game-start-6104.mp3'),
    difficultyUp: new Audio('game-bonus-2-294436.mp3'),
    gameOver: new Audio('game-over-38511.mp3')
};

// Helper function to play a sound by cloning it
function playSound(sound) {
    const clone = sound.cloneNode(); 
    clone.volume = 0.5;             
    clone.play();                    
}

// Paddle vertex coordinates (rectangle made of 4 points)
const paddleVertices = new Float32Array([
    -0.2, -0.05, 
    -0.2,  0.05, 
     0.2,  0.05, 
     0.2, -0.05  
]);

// Function to create circular vertex positions
function createCircleVertices(radius = 0.02, segments = 40) {
    const vertices = []; 

    // Loop to create points along a circle
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI; // Angle for each point
        vertices.push(Math.cos(angle) * radius);    // X coordinate
        vertices.push(Math.sin(angle) * radius);    // Y coordinate
    }
    return new Float32Array(vertices); // Return typed array for WebGL
}
// Generate vertices for the ball shape (circle)
const ballVertices = createCircleVertices();

// Block vertex coordinates (simple rectangle)
const blockVertices = new Float32Array([
    -0.1, -0.05, 
    -0.1,  0.05, 
    0.1,  0.05, 
    0.1, -0.05
]);

let blocks = []; // Store all block objects
const rows = 10, cols = 10; // Grid layout of blocks
const blockWidth = 0.2, blockHeight = 0.1;
const blockspacingX = 0.001, blockspacingY = 0.001;

// Different colors for block rows
const blockcolors = [
    [1.0, 0.0, 0.0, 1.0], // Red
    [0.0, 1.0, 0.0, 1.0], // Green
    [0.0, 0.0, 1.0, 1.0], // Blue
    [1.0, 1.0, 0.0, 1.0], // Yellow
    [1.0, 0.0, 1.0, 1.0], // Magenta
    [0.0, 1.0, 1.0, 1.0]  // Cyan
];

// Generate block layout grid
function createBlocks() {
    blocks = []; // Reset block list
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = -1 + (blockWidth + blockspacingX) * col + blockWidth / 2;
            const y = 1 - (blockHeight + blockspacingY) * row;
            const colorIndex = (row + col) % blockcolors.length;
            blocks.push({ x, y, hit: false, color: blockcolors[colorIndex] });
        }
    }
}
createBlocks(); // Initialize block grid

// Paddle initial position and speed
let paddleX = 0.0; 
let paddleY = -0.9;
let paddleSpeed = 0.01;

// Key tracking object
const keys = {};

// Handle key press
window.addEventListener("keydown", (event) => {
    keys[event.key] = true;
    if (event.key === " " && isGameRunning && !gameStarted) {
        gameStarted = true;
        document.getElementById("startMessage").style.display = "none";
    }
});
// Handle key release
window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
});

// Create WebGL buffer and load paddle vertices
const buffer = webgl.createBuffer();
webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
webgl.bufferData(webgl.ARRAY_BUFFER, paddleVertices, webgl.STATIC_DRAW);

// Ball buffer
const ballBuffer = webgl.createBuffer();
webgl.bindBuffer(webgl.ARRAY_BUFFER, ballBuffer);
webgl.bufferData(webgl.ARRAY_BUFFER, ballVertices, webgl.STATIC_DRAW);

// Block buffer
const blockBuffer = webgl.createBuffer();
webgl.bindBuffer(webgl.ARRAY_BUFFER, blockBuffer);
webgl.bufferData(webgl.ARRAY_BUFFER, blockVertices, webgl.STATIC_DRAW);

// Ball starting position and speed
let ballX = 0.0; 
let ballY = -0.8;
let ballSpeedX = 0.01; 
let ballSpeedY = 0.01;

// Vertex shader source
const vsSource = `
attribute vec2 pos;
uniform vec2 offset;
void main() {
    gl_Position = vec4(pos + offset, 0, 1);
}`;

// Fragment shader source
const fsSource = `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = uColor;
}`;

// Compile vertex shader
const vertexShader = webgl.createShader(webgl.VERTEX_SHADER);
webgl.shaderSource(vertexShader, vsSource);
webgl.compileShader(vertexShader);

// Compile fragment shader
const fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);
webgl.shaderSource(fragmentShader, fsSource);
webgl.compileShader(fragmentShader);

// Create and link WebGL program
const program = webgl.createProgram();
webgl.attachShader(program, vertexShader);
webgl.attachShader(program, fragmentShader);
webgl.linkProgram(program);

// Game score variable
let Score = 0;
// Hide score element initially
document.getElementById("score").style.display = "none";

// Show level-up message
function showLevelMessage(text) {
    const msg = document.getElementById("levelMessage");
    msg.textContent = text;
    msg.style.display = "block";
    setTimeout(() => {
        msg.style.display = "none";
    }, 2000);
}

// Update score and difficulty
function updateScore(points) {
    Score += points;
    document.getElementById("score").textContent = `Score: ${Score}`;

    // Difficulty scaling
    if (Score === 100 || Score === 300 || Score === 700) {
        showLevelMessage("Level Increased!");
        playSound(sounds.difficultyUp);

        const speedIncrement = Score === 100 ? 0.005 : Score === 300 ? 0.006 : 0.0075;
        ballSpeedX += (ballSpeedX > 0 ? speedIncrement : -speedIncrement);
        ballSpeedY += (ballSpeedY > 0 ? speedIncrement : -speedIncrement);
        paddleSpeed += 0.01;

        clearKeys();
    }

    function clearKeys() {
        for (const key in keys) keys[key] = false;
    }
}

// Handle "Play" button click
document.getElementById('Play').addEventListener('click', () => {
    isGameRunning = true;
    gameStarted = false;
    resetGame();
    canvas.style.display = 'block';
    document.getElementById('Play').style.display = 'none';
    document.getElementById('Quit').style.display = 'block';
    document.getElementById("score").style.display = "block";
    document.getElementById("startMessage").style.display = "block";

    gameLoop();
});


// Handle "Quit" button click
document.getElementById('Quit').addEventListener('click', () => {
    isGameRunning = false;
    goToHomePage();
});

// Reset game state
function resetGame() {
    ballX = 0.0; 
    ballY = -0.8; 
    paddleX = 0.0;
    ballSpeedX = 0.01; 
    ballSpeedY = 0.01;
    paddleSpeed = 0.01;
    Score = 0;
    document.getElementById("score").textContent = `Score: ${Score}`;
    gameStarted = false;
    createBlocks();
    clearKeys();
}

// Clear key state
function clearKeys() {
    for (const key in keys) keys[key] = false;
}

// Return to initial
function goToHomePage() {
    resetGame();
    canvas.style.display = 'none';
    document.getElementById('Quit').style.display = 'none';
    document.getElementById("score").style.display = "none";
    document.getElementById('Play').style.display = 'block';
    document.getElementById("startMessage").style.display = "none"; 

}

let isGameRunning = false;
let gameStarted = false;

// Display game over screen
function showGameOverMessage() {
    const msg = document.getElementById("gameOverMessage");
    msg.style.display = "block";
    setTimeout(() => {
        msg.style.display = "none";
        goToHomePage();
    }, 3500);
}

// Update game logic (ball, paddle, collision)
function updateGame() {
    if (!isGameRunning || !gameStarted) return;

    if (keys["ArrowLeft"] && paddleX > -0.8) paddleX -= paddleSpeed;
    if (keys["ArrowRight"] && paddleX < 0.8) paddleX += paddleSpeed;

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballX > 1 || ballX < -1) ballSpeedX *= -1;
    if (ballY > 1) ballSpeedY *= -1;

    if (
        ballY < paddleY + 0.05 && ballY > paddleY - 0.05 &&
        ballX > paddleX - 0.2 && ballX < paddleX + 0.2
    ) {
        ballSpeedY *= -1;
        playSound(sounds.paddleHit);
    }

    if (ballY < -1) {
        isGameRunning = false;
        playSound(sounds.gameOver);
        showGameOverMessage();
        return;
    }

    blocks.forEach(block => {
        if (
            !block.hit &&
            ballX > block.x - 0.1 && ballX < block.x + 0.1 &&
            ballY > block.y - 0.05 && ballY < block.y + 0.05
        ) {
            ballSpeedY *= -1;
            block.hit = true;
            updateScore(10);
            playSound(sounds.blockHit);
        }
    });
}

// Render paddle
function drawPaddle(x, y) {
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
    const positionLocation = webgl.getAttribLocation(program, `pos`);
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(positionLocation);
    webgl.useProgram(program);
    webgl.uniform2f(webgl.getUniformLocation(program, "offset"), x, y);
    webgl.uniform4f(webgl.getUniformLocation(program, "uColor"), 1.0, 1.0, 1.0, 1.0);
    webgl.drawArrays(webgl.TRIANGLE_FAN, 0, 4);
}

// Render ball using the correct number of vertices
function drawBall(x, y) {
    webgl.bindBuffer(webgl.ARRAY_BUFFER, ballBuffer);
    const positionLocation = webgl.getAttribLocation(program, `pos`);
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(positionLocation);
    webgl.useProgram(program);
    webgl.uniform2f(webgl.getUniformLocation(program, "offset"), x, y);
    webgl.uniform4f(webgl.getUniformLocation(program, "uColor"), 0.0, 1.0, 1.0, 1.0);
    webgl.drawArrays(webgl.TRIANGLE_FAN, 0, ballVertices.length / 2); // ← Fixed to use actual circle vertices
}

// Render block
function drawBlock(x, y, color) {
    webgl.bindBuffer(webgl.ARRAY_BUFFER, blockBuffer);
    const positionLocation = webgl.getAttribLocation(program, `pos`);
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(positionLocation);
    webgl.useProgram(program);
    webgl.uniform2f(webgl.getUniformLocation(program, "offset"), x, y);
    webgl.uniform4fv(webgl.getUniformLocation(program, "uColor"), color);
    webgl.drawArrays(webgl.TRIANGLE_FAN, 0, 4);
}

// Redraw everything on screen
function renderGame() {
    webgl.clear(webgl.COLOR_BUFFER_BIT); // Clear canvas
    drawPaddle(paddleX, paddleY);        // Draw paddle
    drawBall(ballX, ballY);              // Draw ball
    blocks.forEach(block => {
        if (!block.hit) drawBlock(block.x, block.y, block.color); // Draw remaining blocks
    });
}

// Main game loop
function gameLoop() {
    if (!isGameRunning) return;
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop); // Loop recursively
}

