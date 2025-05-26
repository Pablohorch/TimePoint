// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const numPlayersInput = document.getElementById('num-players');
const numRoundsInput = document.getElementById('num-rounds');
const startGameBtn = document.getElementById('start-game-btn');
const characterNameDisplay = document.getElementById('character-name-display');
const playerInputsContainer = document.getElementById('player-inputs-container');
const calculateScoreBtn = document.getElementById('calculate-score-btn');
const scoreboardBody = document.getElementById('scoreboard-body');
const nextCharacterBtn = document.getElementById('next-character-btn');
const restartGameBtn = document.getElementById('restart-game-btn');

// Game State Variables
let characters = [];
let currentCharacter = null;
let currentCharacterIndex = -1; // To keep track of used characters if we had more
let shuffledCharacters = []; // For randomizing character order if we had more
let numPlayers = 0;
let totalRounds = 0;
let currentRound = 0;
let playerScores = []; // Array of objects: [{ player: 1, score: 0 }, ...]

// Scoring Functions based on requirements

function divisor(yearMid) {
  if (yearMid >= 1800) return 1;
  if (yearMid >= 1500) return 5;
  if (yearMid >=  500) return 20;
  if (yearMid >= -500) return 50;
  return 100;
}

function puntos(guess, birth, death) {
  // Ensure guess is a number, otherwise, it's a large penalty or specific error handling
  const numericGuess = parseInt(guess);
  if (isNaN(numericGuess)) {
    console.error(`Invalid guess: '${guess}'. Returning max points.`);
    // Assign a high penalty for non-numeric or empty guesses.
    // This could be discussed: what's the penalty for an invalid input?
    // For now, let's say it's equivalent to being 1000 years off with divisor 1.
    return 1000; 
  }

  const err = numericGuess < birth ? birth - numericGuess :
              numericGuess > death ? numericGuess - death : 0;
  
  if (err === 0) return 0;

  const yearMid = (birth + death) / 2;
  return Math.ceil(err / divisor(yearMid));
}

// Function to fetch characters from JSON file
async function loadCharacters() {
    try {
        const response = await fetch('characters.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        characters = await response.json();
        // For POC, we only have one character. If there were more, we'd shuffle.
        // For now, this is simple. In a real game, you'd shuffle characters.
        shuffledCharacters = [...characters]; // Simple copy for now
        console.log('Characters loaded:', characters);
    } catch (error) {
        console.error('Failed to load characters:', error);
        characterNameDisplay.textContent = 'Error al cargar personajes. Revisa characters.json.';
        // Disable game start if characters can't be loaded
        startGameBtn.disabled = true;
    }
}

// Event Listener for "Start Game" button
startGameBtn.addEventListener('click', () => {
    numPlayers = parseInt(numPlayersInput.value);
    totalRounds = parseInt(numRoundsInput.value);

    // Basic validation
    if (isNaN(numPlayers) || numPlayers < 1 || numPlayers > 8) {
        alert('Por favor, introduce un número de jugadores válido (1-8).');
        return;
    }
    if (isNaN(totalRounds) || totalRounds < 1) {
        alert('Por favor, introduce un número total de rondas válido (mínimo 1).');
        return;
    }
    
    // Check if characters are loaded (especially important if async loading fails)
    if (!characters || characters.length === 0) {
        alert('No se han podido cargar los datos de los personajes. El juego no puede comenzar.');
        return;
    }

    console.log(`Starting game with ${numPlayers} players and ${totalRounds} rounds.`);

    // Initialize game state
    currentRound = 0;
    playerScores = [];
    for (let i = 0; i < numPlayers; i++) {
        playerScores.push({ player: i + 1, score: 0 });
    }
    
    // Update UI
    setupScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    
    // Disable next character button initially as it's the first round
    nextCharacterBtn.disabled = true; 
    calculateScoreBtn.disabled = false; // Enable calculate button

    startNewRound();
});

// Function to display the winner(s)
function displayWinner() {
    if (!playerScores || playerScores.length === 0) return;

    let minScore = Infinity;
    playerScores.forEach(ps => {
        if (ps.score < minScore) {
            minScore = ps.score;
        }
    });

    const winners = playerScores.filter(ps => ps.score === minScore);
    const winnerPlayerNumbers = winners.map(w => w.player);

    // Highlight winner(s) in the scoreboard
    const rows = scoreboardBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        // Assuming the first cell contains "Jugador X"
        const playerCell = rows[i].getElementsByTagName('td')[0];
        if (playerCell) {
            // Extract player number from text content "Jugador X"
            const playerNumberText = playerCell.textContent.match(/Jugador (\d+)/);
            if (playerNumberText && playerNumberText[1]) {
                const playerNumber = parseInt(playerNumberText[1]);
                if (winnerPlayerNumbers.includes(playerNumber)) {
                    rows[i].classList.add('winner'); // Apply 'winner' class from style.css
                    // Add ARIA attribute to announce winner
                    rows[i].setAttribute('aria-label', playerCell.textContent + ' - Ganador con ' + minScore + ' puntos');
                }
            }
        }
    }

    if (winners.length > 1) {
        characterNameDisplay.textContent = `¡Empate entre Jugadores ${winnerPlayerNumbers.join(', ')} con ${minScore} puntos!`;
    } else if (winners.length === 1) {
        characterNameDisplay.textContent = `¡El Ganador es Jugador ${winnerPlayerNumbers[0]} con ${minScore} puntos!`;
    }
    console.log("Winner(s) determined and highlighted:", winners);
}

// Function to handle game end
function endGame() {
    console.log("Game has ended.");
    displayWinner();
    calculateScoreBtn.disabled = true;
    nextCharacterBtn.disabled = true;
    // Optionally, disable all player inputs if not already
    const inputs = playerInputsContainer.getElementsByTagName('input');
    for (let input of inputs) {
        input.disabled = true;
    }
}

// Modify startNewRound to call endGame
function startNewRound() {
    currentRound++;
    if (currentRound > totalRounds) {
        endGame(); // Call endGame here
        return;
    }
    
    console.log(`Starting Round: ${currentRound} of ${totalRounds}`);
    
    if (displayCharacter()) {
        generatePlayerInputs();
        calculateScoreBtn.disabled = false;
        nextCharacterBtn.disabled = true;
    } else {
        console.error("Could not display character for the new round.");
        // Consider calling endGame() here too if characters run out unexpectedly
        endGame(); // If character display fails, end game.
    }
    
    updateScoreboard();
}

// Function to display the current character
function displayCharacter() {
    // For POC, always use the first character if currentCharacterIndex is not advanced.
    // In a real game with multiple unique characters per round:
    // currentCharacterIndex++; // Advance to next character
    // if (currentCharacterIndex >= shuffledCharacters.length) {
    //     characterNameDisplay.textContent = 'No hay más personajes únicos.';
    //     // Handle end of unique characters - perhaps loop or end game
    //     calculateScoreBtn.disabled = true;
    //     nextCharacterBtn.disabled = true;
    //     return false; // Indicate no new character
    // }
    // currentCharacter = shuffledCharacters[currentCharacterIndex];
    
    // For POC with a single character, or allowing repeats:
    if (shuffledCharacters.length === 0) {
        characterNameDisplay.textContent = 'No hay personajes cargados.';
        calculateScoreBtn.disabled = true;
        nextCharacterBtn.disabled = true;
        return false;
    }
    // For POC, we just use the first character repeatedly or until rounds end.
    // A real game would have a list and pick one that hasn't been shown,
    // or pick randomly if repeats are allowed.
    currentCharacterIndex = 0; // Always Tesla for POC
    currentCharacter = shuffledCharacters[currentCharacterIndex];

    if (!currentCharacter) {
        characterNameDisplay.textContent = 'Error: Personaje no encontrado.';
        calculateScoreBtn.disabled = true;
        nextCharacterBtn.disabled = true;
        return false; // Indicate error or no character
    }

    characterNameDisplay.textContent = `Personaje: ${currentCharacter.name}`;
    console.log('Displaying character:', currentCharacter.name);
    return true; // Indicate success
}

// Function to generate player input fields
function generatePlayerInputs() {
    playerInputsContainer.innerHTML = ''; // Clear previous inputs
    if (!currentCharacter) return; // Don't generate inputs if no character

    for (let i = 0; i < numPlayers; i++) {
        const playerInputDiv = document.createElement('div');
        playerInputDiv.setAttribute('role', 'group');
        playerInputDiv.setAttribute('aria-labelledby', `player${i+1}-label`);

        const label = document.createElement('label');
        label.id = `player${i+1}-label`;
        label.setAttribute('for', `player${i+1}-guess`);
        // Providing birth and death years directly in the label for user convenience
        label.textContent = `Jugador ${i + 1}, año (nacimiento ${currentCharacter.birth} - muerte ${currentCharacter.death}):`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `player${i+1}-guess`;
        input.name = `player${i+1}-guess`;
        input.placeholder = `Año para Jugador ${i + 1}`;
        input.setAttribute('aria-label', `Año de conjetura para Jugador ${i + 1}`);
        // input.required = true; // Consider adding for form validation if desired

        playerInputDiv.appendChild(label);
        playerInputDiv.appendChild(input);
        playerInputsContainer.appendChild(playerInputDiv);
    }
    console.log(`Generated ${numPlayers} input fields.`);
}

// Ensure updateScoreboard is robust (it was basic before)
function updateScoreboard() {
    scoreboardBody.innerHTML = ''; // Clear existing rows
    if (!playerScores || playerScores.length === 0) {
        // Optionally, display a message like "Scoreboard will appear here."
        // For now, just ensures it doesn't error if called early.
        return;
    }
    playerScores.forEach(ps => {
        const row = scoreboardBody.insertRow();
        row.setAttribute('aria-live', 'polite'); // Announce changes for screen readers

        const cellPlayer = row.insertCell();
        const cellScore = row.insertCell();
        
        cellPlayer.textContent = `Jugador ${ps.player}`;
        cellScore.textContent = ps.score;
    });
    console.log('Scoreboard updated with scores:', playerScores);
}

// Modify calculateScoreBtn event listener to call endGame after final round calculation
calculateScoreBtn.addEventListener('click', () => {
    if (!currentCharacter) {
        console.error("Cannot calculate scores without a current character.");
        return;
    }

    console.log("Calculating scores for round:", currentRound);

    for (let i = 0; i < numPlayers; i++) {
        const inputElement = document.getElementById(`player${i+1}-guess`);
        if (inputElement) {
            const guess = inputElement.value;
            
            if (guess.trim() === '') {
                const roundScore = 1000; 
                playerScores[i].score += roundScore;
            } else {
                const roundScore = puntos(guess, currentCharacter.birth, currentCharacter.death);
                playerScores[i].score += roundScore;
            }
            inputElement.disabled = true;
        }
    }

    updateScoreboard();
    calculateScoreBtn.disabled = true;

    if (currentRound < totalRounds) {
        nextCharacterBtn.disabled = false;
    } else {
        // This is the final round, game ends after this calculation
        nextCharacterBtn.disabled = true;
        endGame(); // Call endGame here
    }
});

// Add this event listener, typically after DOM element declarations or other listeners
nextCharacterBtn.addEventListener('click', () => {
    console.log("Next Character button clicked.");
    // All logic for starting a new round, including incrementing currentRound,
    // displaying character, generating inputs, and managing button states
    // is handled by startNewRound().
    startNewRound(); 
});

// Load characters when the script loads
loadCharacters();

// TODO:
// - Implement "Restart Game" button logic
// - Implement displayWinner()
// - Add ARIA roles and further accessibility enhancements.
// - Refine comments.
```
