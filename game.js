"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

/*
    Your GitHub Pages game can be opened like:

    https://username.github.io/minesweeper/
        ?session=ABC123
        &user=123456789
        &guild=987654321
*/

const params = new URLSearchParams(window.location.search);

const SESSION_ID = params.get("session");
const DISCORD_USER_ID = params.get("user");
const DISCORD_GUILD_ID = params.get("guild");


/*
    IMPORTANT:

    This is your current Cloudflare Quick Tunnel.

    If Cloudflare gives you a NEW trycloudflare.com URL,
    replace this URL with the new one.
*/

const DISCORD_API_URL =
    "https://therapeutic-consisting-infinite-gently.trycloudflare.com/api/minesweeper/result";


/*
    BOARD DIFFICULTY
*/

const BOARD_WIDTH = 12;
const BOARD_HEIGHT = 12;
const MINE_COUNT = 20;


/* =========================================================
   GAME STATE
   ========================================================= */

let board = [];

let gameStarted = false;
let gameOver = false;
let gameWon = false;

let flagMode = false;

let minesPlaced = false;

let timerInterval = null;

let startTime = null;
let elapsedSeconds = 0;


/* =========================================================
   DOM
   ========================================================= */

const boardElement =
    document.getElementById("board");

const mineCounterElement =
    document.getElementById("mine-counter");

const timerElement =
    document.getElementById("timer");

const statusTextElement =
    document.getElementById("status-text");

const statusIconElement =
    document.getElementById("status-icon");

const flagModeButton =
    document.getElementById("flag-mode-button");

const restartButton =
    document.getElementById("restart-button");

const resultOverlay =
    document.getElementById("result-overlay");

const resultIcon =
    document.getElementById("result-icon");

const resultTitle =
    document.getElementById("result-title");

const resultMessage =
    document.getElementById("result-message");

const finalTime =
    document.getElementById("final-time");

const finalMines =
    document.getElementById("final-mines");

const resultRestart =
    document.getElementById("result-restart");


/* =========================================================
   CELL OBJECT
   ========================================================= */

function createCell(row, col) {

    return {
        row: row,
        col: col,

        mine: false,

        revealed: false,

        flagged: false,

        adjacentMines: 0
    };
}


/* =========================================================
   CREATE EMPTY BOARD
   ========================================================= */

function createBoard() {

    board = [];

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        const boardRow = [];

        for (let col = 0; col < BOARD_WIDTH; col++) {

            boardRow.push(
                createCell(row, col)
            );
        }

        board.push(boardRow);
    }
}


/* =========================================================
   PLACE MINES
   ========================================================= */

function placeMines(safeRow, safeCol) {

    const positions = [];

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            /*
                Don't place the first mine on the
                square the player clicked.
            */

            if (
                row === safeRow &&
                col === safeCol
            ) {
                continue;
            }

            positions.push({
                row: row,
                col: col
            });
        }
    }


    /*
        Shuffle positions.
    */

    for (
        let i = positions.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            positions[i],
            positions[j]
        ] = [
            positions[j],
            positions[i]
        ];
    }


    /*
        Place mines.
    */

    for (
        let i = 0;
        i < MINE_COUNT;
        i++
    ) {

        const position = positions[i];

        board[position.row][position.col].mine = true;
    }


    calculateNumbers();

    minesPlaced = true;
}


/* =========================================================
   CALCULATE ADJACENT MINES
   ========================================================= */

function calculateNumbers() {

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell =
                board[row][col];

            if (cell.mine) {
                continue;
            }

            let count = 0;

            forEachNeighbor(
                row,
                col,
                neighbor => {

                    if (neighbor.mine) {
                        count++;
                    }

                }
            );

            cell.adjacentMines = count;
        }
    }
}


/* =========================================================
   NEIGHBORS
   ========================================================= */

function forEachNeighbor(
    row,
    col,
    callback
) {

    for (
        let rowOffset = -1;
        rowOffset <= 1;
        rowOffset++
    ) {

        for (
            let colOffset = -1;
            colOffset <= 1;
            colOffset++
        ) {

            if (
                rowOffset === 0 &&
                colOffset === 0
            ) {
                continue;
            }

            const newRow =
                row + rowOffset;

            const newCol =
                col + colOffset;

            if (
                newRow < 0 ||
                newRow >= BOARD_HEIGHT ||
                newCol < 0 ||
                newCol >= BOARD_WIDTH
            ) {
                continue;
            }

            callback(
                board[newRow][newCol]
            );
        }
    }
}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {

    boardElement.innerHTML = "";

    boardElement.style.gridTemplateColumns =
        `repeat(${BOARD_WIDTH}, 1fr)`;


    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell =
                board[row][col];

            const element =
                document.createElement("button");

            element.type = "button";

            element.className = "cell";

            element.dataset.row = row;
            element.dataset.col = col;

            updateCellElement(
                element,
                cell
            );


            /*
                Desktop left click.
            */

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    handleCellClick(
                        row,
                        col
                    );
                }
            );


            /*
                Desktop right click.
            */

            element.addEventListener(
                "contextmenu",
                event => {

                    event.preventDefault();

                    toggleFlag(
                        row,
                        col
                    );
                }
            );


            boardElement.appendChild(
                element
            );
        }
    }
}


/* =========================================================
   UPDATE CELL VISUAL
   ========================================================= */

function updateCellElement(
    element,
    cell
) {

    element.className = "cell";

    element.textContent = "";


    if (cell.flagged && !cell.revealed) {

        element.classList.add("flagged");

        element.textContent = "🚩";

        return;
    }


    if (!cell.revealed) {

        return;
    }


    element.classList.add("revealed");


    if (cell.mine) {

        element.classList.add("mine");

        element.textContent = "💣";

        return;
    }


    if (cell.adjacentMines > 0) {

        element.classList.add(
            `number-${cell.adjacentMines}`
        );

        element.textContent =
            cell.adjacentMines;
    }
}


/* =========================================================
   GET CELL ELEMENT
   ========================================================= */

function getCellElement(row, col) {

    return boardElement.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
}


/* =========================================================
   HANDLE CELL CLICK
   ========================================================= */

function handleCellClick(row, col) {

    if (gameOver) {
        return;
    }

    const cell =
        board[row][col];


    /*
        Flag mode on mobile.
    */

    if (flagMode) {

        toggleFlag(row, col);

        return;
    }


    /*
        Don't reveal flagged cells.
    */

    if (cell.flagged) {
        return;
    }


    /*
        First move starts the game
        and generates the mines.
    */

    if (!gameStarted) {

        gameStarted = true;

        startTimer();

        placeMines(
            row,
            col
        );
    }


    revealCell(
        row,
        col
    );
}


/* =========================================================
   REVEAL CELL
   ========================================================= */

function revealCell(row, col) {

    if (gameOver) {
        return;
    }

    const cell =
        board[row][col];


    if (cell.revealed) {
        return;
    }


    if (cell.flagged) {
        return;
    }


    cell.revealed = true;


    /*
        Mine = lose.
    */

    if (cell.mine) {

        loseGame();

        return;
    }


    /*
        Automatically reveal empty areas.
    */

    if (cell.adjacentMines === 0) {

        forEachNeighbor(
            row,
            col,
            neighbor => {

                if (
                    !neighbor.revealed &&
                    !neighbor.flagged &&
                    !neighbor.mine
                ) {

                    revealCell(
                        neighbor.row,
                        neighbor.col
                    );
                }
            }
        );
    }


    renderBoard();

    checkWin();
}


/* =========================================================
   FLAG
   ========================================================= */

function toggleFlag(row, col) {

    if (gameOver) {
        return;
    }

    const cell =
        board[row][col];


    if (cell.revealed) {
        return;
    }


    cell.flagged =
        !cell.flagged;


    renderBoard();

    updateMineCounter();
}


/* =========================================================
   MINE COUNTER
   ========================================================= */

function updateMineCounter() {

    let flagCount = 0;

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            if (
                board[row][col].flagged
            ) {
                flagCount++;
            }
        }
    }


    const remaining =
        Math.max(
            0,
            MINE_COUNT - flagCount
        );

    mineCounterElement.textContent =
        remaining;
}


/* =========================================================
   WIN CHECK
   ========================================================= */

function checkWin() {

    let safeCellsRevealed = 0;

    const totalSafeCells =
        (
            BOARD_WIDTH *
            BOARD_HEIGHT
        ) - MINE_COUNT;


    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell =
                board[row][col];

            if (
                cell.revealed &&
                !cell.mine
            ) {

                safeCellsRevealed++;
            }
        }
    }


    if (
        safeCellsRevealed >=
        totalSafeCells
    ) {

        winGame();
    }
}


/* =========================================================
   WIN GAME
   ========================================================= */

async function winGame() {

    if (gameOver) {
        return;
    }

    gameOver = true;
    gameWon = true;

    stopTimer();


    /*
        Automatically flag remaining mines.
    */

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell =
                board[row][col];

            if (cell.mine) {
                cell.flagged = true;
            }
        }
    }


    renderBoard();


    statusIconElement.textContent = "🎉";

    statusTextElement.textContent =
        "You cleared the board!";


    showResult(
        true
    );


    /*
        Tell the Discord bot.
    */

    await sendGameResult(true);
}


/* =========================================================
   LOSE GAME
   ========================================================= */

async function loseGame() {

    if (gameOver) {
        return;
    }

    gameOver = true;
    gameWon = false;

    stopTimer();


    /*
        Reveal all mines.
    */

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            if (board[row][col].mine) {

                board[row][col].revealed = true;
            }
        }
    }


    renderBoard();


    statusIconElement.textContent = "💥";

    statusTextElement.textContent =
        "Boom! You hit a mine.";


    showResult(
        false
    );


    /*
        Tell Discord the player lost.

        The bot should NOT award anything
        for this result.
    */

    await sendGameResult(false);
}


/* =========================================================
   SEND RESULT TO DISCORD BOT
   ========================================================= */

async function sendGameResult(won) {

    /*
        If the game wasn't opened through Discord,
        there is nowhere to send the result.
    */

    if (!SESSION_ID) {

        console.warn(
            "[Minesweeper] No session ID."
        );

        return;
    }


    const result = {

        session: SESSION_ID,

        user_id:
            DISCORD_USER_ID,

        guild_id:
            DISCORD_GUILD_ID,

        game:
            "minesweeper",

        won:
            won,

        time:
            elapsedSeconds,

        board_width:
            BOARD_WIDTH,

        board_height:
            BOARD_HEIGHT,

        mines:
            MINE_COUNT,

        timestamp:
            Date.now()
    };


    try {

        const response =
            await fetch(
                DISCORD_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(result)
                }
            );


        if (!response.ok) {

            console.error(
                "[Minesweeper] Server returned:",
                response.status
            );

            return;
        }


        const data =
            await response.json();


        console.log(
            "[Minesweeper] Result sent:",
            data
        );

    } catch (error) {

        console.error(
            "[Minesweeper] Failed to send result:",
            error
        );
    }
}


/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {

    if (timerInterval !== null) {
        return;
    }

    startTime =
        Date.now();


    timerInterval =
        setInterval(
            updateTimer,
            250
        );
}


function updateTimer() {

    if (!startTime) {
        return;
    }


    elapsedSeconds =
        Math.floor(
            (
                Date.now() -
                startTime
            ) / 1000
        );


    timerElement.textContent =
        formatTime(
            elapsedSeconds
        );
}


function stopTimer() {

    if (
        timerInterval !== null
    ) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;
    }


    updateTimer();
}


function formatTime(seconds) {

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remainingSeconds =
        seconds % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


/* =========================================================
   FLAG MODE
   ========================================================= */

function toggleFlagMode() {

    flagMode =
        !flagMode;


    flagModeButton.classList.toggle(
        "flag-active",
        flagMode
    );


    flagModeButton.textContent =
        flagMode
            ? "🚩 Flag Mode: ON"
            : "🚩 Flag Mode: OFF";
}


flagModeButton.addEventListener(
    "click",
    toggleFlagMode
);


/* =========================================================
   RESTART
   ========================================================= */

function restartGame() {

    stopTimer();


    gameStarted = false;

    gameOver = false;

    gameWon = false;

    flagMode = false;

    minesPlaced = false;

    elapsedSeconds = 0;

    startTime = null;


    timerElement.textContent =
        "00:00";


    flagModeButton.classList.remove(
        "flag-active"
    );


    flagModeButton.textContent =
        "🚩 Flag Mode: OFF";


    statusIconElement.textContent =
        "💣";


    statusTextElement.textContent =
        "Clear the board!";


    resultOverlay.classList.add(
        "hidden"
    );


    createBoard();

    renderBoard();

    updateMineCounter();
}


restartButton.addEventListener(
    "click",
    restartGame
);


resultRestart.addEventListener(
    "click",
    restartGame
);


/* =========================================================
   PREVENT MOBILE CONTEXT MENU
   ========================================================= */

boardElement.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();
    }
);


/* =========================================================
   PREVENT LONG-PRESS SELECTION
   ========================================================= */

boardElement.addEventListener(
    "selectstart",
    event => {

        event.preventDefault();
    }
);


/* =========================================================
   RESULT SCREEN
   ========================================================= */

function showResult(won) {

    finalTime.textContent =
        formatTime(
            elapsedSeconds
        );

    finalMines.textContent =
        MINE_COUNT;


    if (won) {

        resultIcon.textContent =
            "🎉";

        resultTitle.textContent =
            "You Won!";

        resultMessage.textContent =
            "You cleared every safe square!";

    } else {

        resultIcon.textContent =
            "💥";

        resultTitle.textContent =
            "Boom!";

        resultMessage.textContent =
            "You hit a mine. Better luck next time!";
    }


    resultOverlay.classList.remove(
        "hidden"
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

restartGame();
