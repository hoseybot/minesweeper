/*
    ============================================
        MINESWEEPER
        Discord-compatible version
    ============================================

    GitHub Pages:
        index.html
        style.css
        game.js

    Discord integration:

        The game calls:

            notifyDiscordGameResult(...)

        when the player wins or loses.

        Later, change DISCORD_API_URL to the
        public endpoint hosted by your Discord bot.
*/


/* ============================================
   CONFIGURATION
============================================ */

const BOARD_WIDTH = 8;
const BOARD_HEIGHT = 8;
const MINE_COUNT = 20;


/*
    Leave this empty while testing locally.

    Later we'll put something like:

    https://your-bot-domain.com/api/minesweeper/result

    here.

    IMPORTANT:

    Do NOT put your Discord bot token here.
    Do NOT put any secret API key here.

    Anything inside JavaScript can be seen
    by the player.
*/

const DISCORD_API_URL = "https://therapeutic-consisting-infinite-gently.trycloudflare.com/api/minesweeper/result";


/* ============================================
   GAME STATE
============================================ */

let board = [];

let gameStarted = false;
let gameOver = false;
let gameWon = false;

let timer = 0;
let timerInterval = null;

let flagsUsed = 0;


/*
    Optional Discord player information.

    Later the Discord button can open:

    https://your-game.github.io/
        ?user=123456789
        &guild=123456789

    The game can then send those IDs
    back to your bot.

    We don't trust these IDs for rewards
    by themselves — the bot will verify them.
*/

const urlParams = new URLSearchParams(
    window.location.search
);

const discordUserId =
    urlParams.get("user") || null;

const discordGuildId =
    urlParams.get("guild") || null;


/* ============================================
   DOM
============================================ */

const boardElement =
    document.getElementById("game-board");

const mineCounter =
    document.getElementById("mine-counter");

const timerElement =
    document.getElementById("timer");

const statusElement =
    document.getElementById("status");

const newGameButton =
    document.getElementById("new-game");

const messageElement =
    document.getElementById("message");

const messageIcon =
    document.getElementById("message-icon");

const messageTitle =
    document.getElementById("message-title");

const messageDescription =
    document.getElementById("message-description");

const messageButton =
    document.getElementById("message-button");


/* ============================================
   CELL CREATION
============================================ */

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


/* ============================================
   CREATE BOARD
============================================ */

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


/* ============================================
   RANDOM MINE PLACEMENT
============================================ */

function placeMines() {

    let minesPlaced = 0;

    while (minesPlaced < MINE_COUNT) {

        const row =
            Math.floor(
                Math.random() * BOARD_HEIGHT
            );

        const col =
            Math.floor(
                Math.random() * BOARD_WIDTH
            );

        if (board[row][col].mine) {
            continue;
        }

        board[row][col].mine = true;

        minesPlaced++;
    }
}


/* ============================================
   CALCULATE NUMBERS
============================================ */

function calculateNumbers() {

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell = board[row][col];

            if (cell.mine) {
                continue;
            }

            const neighbors =
                getNeighbors(row, col);

            let count = 0;

            for (const neighbor of neighbors) {

                if (neighbor.mine) {
                    count++;
                }

            }

            cell.adjacentMines = count;
        }
    }
}


/* ============================================
   GET NEIGHBORS
============================================ */

function getNeighbors(row, col) {

    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {

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

            neighbors.push(
                board[newRow][newCol]
            );
        }
    }

    return neighbors;
}


/* ============================================
   RENDER BOARD
============================================ */

function renderBoard() {

    boardElement.innerHTML = "";

    boardElement.style.gridTemplateColumns =
        `repeat(${BOARD_WIDTH}, 38px)`;

    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            const cell = board[row][col];

            const element =
                document.createElement("div");

            element.classList.add("cell");

            element.dataset.row = row;
            element.dataset.col = col;


            /* Left click */

            element.addEventListener(
                "click",
                () => {

                    handleReveal(row, col);

                }
            );


            /* Right click */

            element.addEventListener(
                "contextmenu",
                (event) => {

                    event.preventDefault();

                    handleFlag(row, col);

                }
            );


            updateCellElement(
                element,
                cell
            );

            boardElement.appendChild(element);
        }
    }
}


/* ============================================
   UPDATE SINGLE CELL
============================================ */

function updateCellElement(element, cell) {

    element.className = "cell";

    element.innerHTML = "";


    /*
        Game-over mine display
    */

    if (
        gameOver &&
        cell.mine
    ) {

        element.classList.add("mine");

        element.textContent = "💣";

        return;
    }


    /*
        Flag
    */

    if (cell.flagged && !cell.revealed) {

        element.classList.add("flagged");

        const flag =
            document.createElement("span");

        flag.className = "flag-icon";

        flag.textContent = "🚩";

        element.appendChild(flag);

        return;
    }


    /*
        Hidden cell
    */

    if (!cell.revealed) {

        return;
    }


    /*
        Revealed cell
    */

    element.classList.add("revealed");


    /*
        Mine
    */

    if (cell.mine) {

        element.classList.add("mine");

        element.textContent = "💣";

        return;
    }


    /*
        Number
    */

    if (cell.adjacentMines > 0) {

        element.classList.add(
            `number-${cell.adjacentMines}`
        );

        element.textContent =
            cell.adjacentMines;
    }
}


/* ============================================
   REVEAL
============================================ */

function handleReveal(row, col) {

    if (gameOver) {
        return;
    }

    const cell =
        board[row][col];


    /*
        Can't reveal flags
    */

    if (cell.flagged) {
        return;
    }


    /*
        Start timer on first move
    */

    if (!gameStarted) {

        gameStarted = true;

        startTimer();

        setStatus(
            "PLAYING",
            "status-playing"
        );
    }


    /*
        Already revealed
    */

    if (cell.revealed) {

        /*
            Optional chord behavior.

            If the player clicks a revealed
            number and has correctly flagged
            all surrounding mines, reveal
            the remaining neighbors.
        */

        handleChord(row, col);

        return;
    }


    /*
        Mine hit
    */

    if (cell.mine) {

        cell.revealed = true;

        endGame(false);

        return;
    }


    /*
        Safe reveal
    */

    revealArea(row, col);

    renderBoard();

    checkWin();
}


/* ============================================
   REVEAL EMPTY AREA
============================================ */

function revealArea(row, col) {

    const queue = [
        board[row][col]
    ];

    const visited = new Set();


    while (queue.length > 0) {

        const cell =
            queue.shift();

        const key =
            `${cell.row},${cell.col}`;

        if (visited.has(key)) {
            continue;
        }

        visited.add(key);


        if (
            cell.mine ||
            cell.flagged ||
            cell.revealed
        ) {
            continue;
        }


        cell.revealed = true;


        /*
            Empty cell.

            Automatically open neighbors.
        */

        if (cell.adjacentMines === 0) {

            const neighbors =
                getNeighbors(
                    cell.row,
                    cell.col
                );

            for (const neighbor of neighbors) {

                if (
                    !neighbor.mine &&
                    !neighbor.flagged &&
                    !neighbor.revealed
                ) {

                    queue.push(neighbor);
                }
            }
        }
    }
}


/* ============================================
   CHORD
============================================ */

function handleChord(row, col) {

    const cell =
        board[row][col];

    if (
        !cell.revealed ||
        cell.adjacentMines === 0
    ) {
        return;
    }

    const neighbors =
        getNeighbors(row, col);

    const flaggedCount =
        neighbors.filter(
            neighbor => neighbor.flagged
        ).length;


    /*
        Only chord if the number of flags
        matches the displayed number.
    */

    if (
        flaggedCount !==
        cell.adjacentMines
    ) {
        return;
    }


    for (const neighbor of neighbors) {

        if (
            neighbor.revealed ||
            neighbor.flagged
        ) {
            continue;
        }

        if (neighbor.mine) {

            neighbor.revealed = true;

            endGame(false);

            return;
        }

        revealArea(
            neighbor.row,
            neighbor.col
        );
    }

    renderBoard();

    checkWin();
}


/* ============================================
   FLAG
============================================ */

function handleFlag(row, col) {

    if (gameOver) {
        return;
    }

    const cell =
        board[row][col];


    if (cell.revealed) {
        return;
    }


    /*
        Start game if flagging first
    */

    if (!gameStarted) {

        gameStarted = true;

        startTimer();

        setStatus(
            "PLAYING",
            "status-playing"
        );
    }


    /*
        Toggle flag
    */

    if (cell.flagged) {

        cell.flagged = false;

        flagsUsed--;

    } else {

        /*
            Don't allow more flags than mines.
        */

        if (flagsUsed >= MINE_COUNT) {
            return;
        }

        cell.flagged = true;

        flagsUsed++;
    }


    updateMineCounter();

    renderBoard();

    checkWin();
}


/* ============================================
   WIN CHECK
============================================ */

function checkWin() {

    if (gameOver) {
        return;
    }

    let safeCellsRevealed = 0;

    const totalSafeCells =
        BOARD_WIDTH *
        BOARD_HEIGHT -
        MINE_COUNT;


    for (let row = 0; row < BOARD_HEIGHT; row++) {

        for (let col = 0; col < BOARD_WIDTH; col++) {

            if (
                board[row][col].revealed &&
                !board[row][col].mine
            ) {

                safeCellsRevealed++;
            }
        }
    }


    if (
        safeCellsRevealed ===
        totalSafeCells
    ) {

        endGame(true);
    }
}


/* ============================================
   END GAME
============================================ */

function endGame(won) {

    gameOver = true;

    gameWon = won;

    stopTimer();


    if (won) {

        /*
            Automatically flag all mines.
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

        flagsUsed = MINE_COUNT;

        setStatus(
            "WON",
            "status-won"
        );

        showMessage(
            "🎉",
            "YOU WIN!",
            `You cleared the field in ${timer} seconds.`,
            true
        );

    } else {

        setStatus(
            "LOST",
            "status-lost"
        );

        showMessage(
            "💥",
            "BOOM!",
            "You hit a mine.",
            false
        );
    }


    updateMineCounter();

    renderBoard();


    /*
        Tell Discord bot about result.
    */

    notifyDiscordGameResult(won);
}


/* ============================================
   DISCORD CALLBACK
============================================ */

let discordResultSent = false;

async function notifyDiscordGameResult(won) {

    /*
        Prevent the same Minesweeper game from
        sending multiple results to Discord.
    */

    if (discordResultSent) {

        console.log(
            "[Minesweeper] Result already sent. Ignoring duplicate."
        );

        return;
    }

    discordResultSent = true;


    /*
        During development, if no API URL exists,
        just log the result.
    */

    if (!DISCORD_API_URL) {

        console.log(
            "[Minesweeper] Game result:",
            {
                won: won,
                time: timer,
                user: discordUserId,
                guild: discordGuildId
            }
        );

        return;
    }


    /*
        Information sent to the Discord bot.
    */

    const result = {

        user_id: discordUserId,

        guild_id: discordGuildId,

        game: "minesweeper",

        won: won,

        time: timer,

        board_width: BOARD_WIDTH,

        board_height: BOARD_HEIGHT,

        mines: MINE_COUNT,

        timestamp: Date.now()
    };


    try {

        const response = await fetch(
            DISCORD_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(result)
            }
        );


        if (!response.ok) {

            console.error(
                "[Minesweeper] Discord API error:",
                response.status
            );

            /*
                If the server failed, allow the player
                to retry instead of permanently marking
                the result as sent.
            */

            discordResultSent = false;

            return;
        }


        const data = await response.json().catch(() => null);


        console.log(
            "[Minesweeper] Result sent to Discord.",
            data
        );


    } catch (error) {

        /*
            Network/CORS/Cloudflare failure.

            Allow another attempt.
        */

        discordResultSent = false;

        console.error(
            "[Minesweeper] Could not contact Discord bot:",
            error
        );
    }
}


/* ============================================
   TIMER
============================================ */

function startTimer() {

    stopTimer();

    timerInterval =
        setInterval(() => {

            timer++;

            updateTimer();

        }, 1000);
}


function stopTimer() {

    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


function updateTimer() {

    timerElement.textContent =
        String(timer).padStart(3, "0");
}


/* ============================================
   MINE COUNTER
============================================ */

function updateMineCounter() {

    const remaining =
        MINE_COUNT -
        flagsUsed;

    mineCounter.textContent =
        String(remaining).padStart(2, "0");
}


/* ============================================
   STATUS
============================================ */

function setStatus(
    text,
    className
) {

    statusElement.textContent =
        text;

    statusElement.className =
        `stat-value ${className}`;
}


/* ============================================
   MESSAGE
============================================ */

function showMessage(
    icon,
    title,
    description,
    won
) {

    messageElement.classList.remove(
        "hidden"
    );

    messageIcon.textContent =
        icon;

    messageTitle.textContent =
        title;

    messageDescription.textContent =
        description;

    messageButton.textContent =
        "Play Again";


    if (won) {

        messageTitle.style.color =
            "var(--green)";

    } else {

        messageTitle.style.color =
            "var(--red)";
    }
}


/* ============================================
   NEW GAME
============================================ */

function newGame() {

    stopTimer();

    timer = 0;

    flagsUsed = 0;

    gameStarted = false;

    gameOver = false;

    gameWon = false;

    updateTimer();

    updateMineCounter();

    setStatus(
        "READY",
        "status-ready"
    );

    messageElement.classList.add(
        "hidden"
    );

    createBoard();

    placeMines();

    calculateNumbers();

    renderBoard();
}


/* ============================================
   BUTTONS
============================================ */

newGameButton.addEventListener(
    "click",
    newGame
);

messageButton.addEventListener(
    "click",
    newGame
);


/* ============================================
   START
============================================ */

newGame();
