import React, { useState, useEffect, useRef } from 'react';

// Main App Component
const App = () => {
    // State variables for the game
    const [balance, setBalance] = useState(10000); // User's starting balance
    const [pets, setPets] = useState([]); // Array of pet objects
    const [betAmounts, setBetAmounts] = useState({}); // Object to store bet amounts for each pet
    const [message, setMessage] = useState("Place your bets! Race starts in..."); // Game messages - Initial message set here
    const [winningPetId, setWinningPetId] = useState(null); // ID of the winning pet
    const [multiplier, setMultiplier] = useState(1); // Payout multiplier (1x or 4x)
    const [isBettingPhase, setIsBettingPhase] = useState(true); // Controls UI for betting vs. race results
    const [selectedBetValue, setSelectedBetValue] = useState(null); // The amount selected from the bottom buttons
    const [isRacing, setIsRacing] = useState(false); // True when race is ongoing (including highlight animation)
    const [highlightedPetId, setHighlightedPetId] = useState(null); // ID of the pet currently highlighted during the "search"
    const [roundCountdown, setRoundCountdown] = useState(30); // Countdown for betting phase (30 seconds)
    const [nextRoundTimer, setNextRoundTimer] = useState(5); // Countdown for delay between rounds (5 seconds)
    const [recentWins, setRecentWins] = useState([]); // Array to store recent winning pet emojis
    const [luckFactor, setLuckFactor] = useState(0); // Hidden state: -1 (unfavorable) to 1 (favorable)
    const [showAddBalanceModal, setShowAddBalanceModal] = useState(false); // New state to control modal visibility
    const [upiId, setUpiId] = useState(''); // New state for UPI ID input
    const [addBalanceMessage, setAddBalanceMessage] = useState(''); // New state for add balance messages

    // Refs for managing timers to ensure they are cleared
    const roundCountdownRef = useRef(null);
    const nextRoundTimerRef = useRef(null);
    const raceStartTimeoutRef = useRef(null);

    // Helper function to format balance (e.g., 1000000 -> 1M, 1010000 -> 1.01M, 100000 -> 100k)
    const formatBalance = (num) => {
        if (num >= 10000000) {
            return (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
        }
        if (num >= 100000) {
            return (num / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'k';
        }
        return num.toFixed(2);
    };

    // Initialize pets when the component mounts
    useEffect(() => {
        const initialPets = [
            { id: 1, name: 'Rabbit', odds: 5.0, emoji: '🐰' },
            { id: 2, name: 'Cat', odds: 5.0, emoji: '🐱' },
            { id: 3, name: 'Dog', odds: 5.0, emoji: '🐶' },
            { id: 4, name: 'Sheep', odds: 5.0, emoji: '🐑' },
            { id: 5, name: 'Dolphin', odds: 10.0, emoji: '🐬' },
            { id: 6, name: 'Panda', odds: 15.0, emoji: '🐼' },
            { id: 7, name: 'Eagle', odds: 25.0, emoji: '🦅' },
            { id: 8, name: 'Lion', odds: 45.0, emoji: '🦁' },
        ];
        setPets(initialPets);
        // Initialize bet amounts for all pets to 0
        const initialBetAmounts = initialPets.reduce((acc, pet) => {
            acc[pet.id] = 0;
            return acc;
        }, {});
        setBetAmounts(initialBetAmounts);

        // Start the initial betting phase countdown
        startRoundCountdown();

        // Cleanup timers on unmount
        return () => {
            clearInterval(roundCountdownRef.current);
            clearInterval(nextRoundTimerRef.current);
            clearTimeout(raceStartTimeoutRef.current);
        };
    }, []); // Empty dependency array means this runs once on mount

    // Effect for managing the betting phase countdown
    useEffect(() => {
        if (isBettingPhase) {
            setMessage(`Place your bets! Race starts in ${roundCountdown} seconds...`);
            if (roundCountdown === 0) {
                placeBets(); // Always call placeBets to proceed to race simulation
            }
        }
    }, [roundCountdown, isBettingPhase]); // Depend on countdown and betting phase

    // Effect for managing the inter-round timer
    useEffect(() => {
        if (!isBettingPhase && !isRacing && winningPetId !== null) { // Race has concluded
            setMessage(`Next round starts in ${nextRoundTimer} seconds...`);
            if (nextRoundTimer === 0) {
                playAgain(); // Auto-start next round
            }
        }
    }, [nextRoundTimer, isBettingPhase, isRacing, winningPetId]); // Depend on timer and game states

    // Function to start the betting phase countdown
    const startRoundCountdown = () => {
        clearInterval(roundCountdownRef.current); // Clear any existing timer
        setRoundCountdown(30); // Reset countdown
        roundCountdownRef.current = setInterval(() => {
            setRoundCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(roundCountdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Function to start the next round timer
    const startNextRoundTimer = () => {
        clearInterval(nextRoundTimerRef.current); // Clear any existing timer
        setNextRoundTimer(5); // Reset countdown
        nextRoundTimerRef.current = setInterval(() => {
            setNextRoundTimer(prev => {
                if (prev <= 1) {
                    clearInterval(nextRoundTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Handle clicking on a pet card to place a bet
    const handlePetClick = (petId) => {
        if (!isBettingPhase) return; // Only allow betting in betting phase
        if (selectedBetValue === null) {
            setMessage("Please select a bet amount first!");
            return;
        }

        // Check if the single selected bet value exceeds current balance
        if (selectedBetValue > balance) {
            setMessage("Not enough balance for this bet!");
            return;
        }

        // Deduct the selected bet value from the balance immediately
        setBalance(prevBalance => prevBalance - selectedBetValue);

        // Add the selected bet value to the pet's current bet amount
        setBetAmounts(prev => ({
            ...prev,
            [petId]: (prev[petId] || 0) + selectedBetValue
        }));
        setMessage(`Bet 💎${selectedBetValue} added to ${pets.find(p => p.id === petId).name}.`); // UPDATED currency symbol
    };

    // Calculate the total amount currently bet across all pets
    const getTotalBet = () => {
        return Object.values(betAmounts).reduce((sum, amount) => sum + amount, 0);
    };

    // Handle placing bets (starting the race)
    const placeBets = () => {
        clearInterval(roundCountdownRef.current); // Stop betting countdown
        clearTimeout(raceStartTimeoutRef.current); // Clear any pending auto-start

        // Update message based on whether bets were placed
        const totalBet = getTotalBet();
        if (totalBet === 0) {
            setMessage("No bets placed. Finding winner...");
        } else {
            setMessage("Bets placed! Finding winner...");
        }

        setIsBettingPhase(false); // Switch to race phase
        setSelectedBetValue(null); // Clear selected bet value
        setWinningPetId(null); // Clear previous winner highlight immediately
        setIsRacing(true); // Start the racing animation (including sequential highlight)
        simulateRace(); // Start the race simulation
    };

    // Simulate the race and determine the winner with continuous sequential highlighting
    const simulateRace = () => {
        let currentIndex = 0;
        const intervalTime = 100; // Time for each pet highlight (faster for continuous effect)
        const totalRaceDuration = 2500; // Total time for race + highlight animation before winner is revealed

        // Generate a new luck factor for this round (-1 to 1)
        const currentLuckFactor = Math.random() * 2 - 1; // Random number between -1 and 1
        setLuckFactor(currentLuckFactor);

        // Start continuous sequential highlighting
        const highlightInterval = setInterval(() => {
            setHighlightedPetId(pets[currentIndex % pets.length].id); // Use modulo to cycle through pets indefinitely
            currentIndex++;
        }, intervalTime);

        // After a fixed duration, determine the winner and stop the highlight
        setTimeout(() => {
            clearInterval(highlightInterval); // Stop the continuous highlighting

            // --- Weighted Random Winner Selection based on Luck Factor ---
            let totalWeight = 0;
            const weightedPets = pets.map(pet => {
                // Base weight is inverse of odds (lower odds = higher chance, better for player)
                let weight = 1 / pet.odds;

                // Adjust weight based on luckFactor
                // If luckFactor > 0 (favorable), increase weight for lower-odd pets
                // If luckFactor < 0 (unfavorable), decrease weight for lower-odd pets (effectively increasing for higher-odd pets)
                if (currentLuckFactor > 0) { // Favorable luck
                    weight *= (1 + currentLuckFactor * 0.5); // Boost lower-odd pets
                } else if (currentLuckFactor < 0) { // Unfavorable luck
                    weight *= (1 + currentLuckFactor * 0.5); // Reduce lower-odd pets (e.g., 1 - 0.5 = 0.5x weight)
                }
                totalWeight += weight;
                return { ...pet, weight };
            });

            let randomPoint = Math.random() * totalWeight;
            let winner = null;
            for (let i = 0; i < weightedPets.length; i++) {
                randomPoint -= weightedPets[i].weight;
                if (randomPoint <= 0) {
                    winner = weightedPets[i];
                    break;
                }
            }
            if (!winner) { // Fallback in case of floating point issues, pick last pet
                winner = weightedPets[weightedPets.length - 1];
            }
            // --- End Weighted Random Winner Selection ---

            // Make the highlight stop on the winner immediately
            setHighlightedPetId(winner.id);

            // Introduce a small delay before revealing the "WINNER!" badge and calculating payout
            setTimeout(() => {
                setWinningPetId(winner.id); // Set the actual winner, triggering the WINNER badge
                setIsRacing(false); // Stop the racing animation state

                // Add winning pet's emoji to recent wins history
                setRecentWins(prevWins => {
                    const newWins = [winner.emoji, ...prevWins];
                    return newWins.slice(0, 8); // Keep only the last 8 wins
                });

                // Determine if 4x multiplier applies (chance influenced by luckFactor)
                let multiplierChance = 0.1; // Base 10% chance
                if (currentLuckFactor > 0) {
                    multiplierChance += currentLuckFactor * 0.1; // Up to 20% chance
                } else if (currentLuckFactor < 0) {
                    multiplierChance += currentLuckFactor * 0.05; // Down to 5% chance
                }
                multiplierChance = Math.max(0.05, Math.min(0.25, multiplierChance)); // Clamp between 5% and 25%

                const randomChance = Math.random();
                const currentMultiplier = randomChance < multiplierChance ? 4 : 1;
                setMultiplier(currentMultiplier);

                const betOnWinner = betAmounts[winner.id] || 0;
                let winnings = 0;

                if (betOnWinner > 0) {
                    winnings = betOnWinner * winner.odds * currentMultiplier;
                    setMessage(`🎉 ${winner.name} won! You won 💎${winnings.toFixed(2)} with a ${currentMultiplier}x multiplier!`); // UPDATED currency symbol
                    setBalance(prevBalance => prevBalance + winnings); // Add winnings to balance
                } else {
                    setMessage(`😔 ${winner.name} won! You didn't bet on the winner. Better luck next time!`);
                }
                startNextRoundTimer(); // Start the 5-second timer for the next round
            }, 300); // Delay for the highlight to settle on the winner before showing winner badge
        }, totalRaceDuration);
    };

    // Reset the game for a new round
    const playAgain = () => {
        // Reset all relevant states
        setBetAmounts(pets.reduce((acc, pet) => {
            acc[pet.id] = 0;
            return acc;
        }, {}));
        setMessage("Place your bets! Race starts in...");
        setWinningPetId(null);
        setMultiplier(1);
        setIsBettingPhase(true); // Back to betting phase
        setSelectedBetValue(null);
        setIsRacing(false); // Ensure racing state is off
        setHighlightedPetId(null); // Ensure highlight is off
        setNextRoundTimer(5); // Reset next round timer display
        startRoundCountdown(); // Start the betting phase countdown for the new round
    };

    const betValues = [2, 50, 500, 1]; // Fixed bet amounts
    const topUpAmounts = [100, 500, 1000, 5000]; // New: Fixed top-up amounts

    // Function to handle simulated UPI payment
    const handleUpiPayment = (amount) => {
        if (!upiId) {
            setAddBalanceMessage("Please enter a UPI ID.");
            return;
        }
        setAddBalanceMessage(`Processing 💎${amount} payment via UPI ID: ${upiId}...`);

        // Simulate a delay for payment processing
        setTimeout(() => {
            // Simulate success
            setBalance(prevBalance => prevBalance + amount);
            setAddBalanceMessage(`✅ Successfully added 💎${amount} to your balance!`);
            setUpiId(''); // Clear UPI ID after successful payment
            // Optionally close modal after a short delay
            setTimeout(() => {
                setShowAddBalanceModal(false);
                setAddBalanceMessage('');
            }, 1500);
        }, 2000); // 2-second delay for simulation
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white font-inter p-4 sm:p-8 flex flex-col items-center justify-center">
            {/* Custom CSS for blinking effect */}
            <style>
                {`
                @keyframes blink-border {
                    0%, 100% { border-color: #FACC15; } /* Tailwind yellow-400 */
                    50% { border-color: transparent; }
                }
                .animate-blink-border {
                    animation: blink-border 0.8s infinite;
                }
                `}
            </style>

            <div className="bg-purple-700 p-6 rounded-xl shadow-2xl w-full max-w-4xl border border-purple-600">
                <h1 className="text-4xl font-extrabold text-center mb-6 text-yellow-300">Diamond Hunt </h1>

                {/* Balance and Message Display */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-purple-800 p-4 rounded-lg shadow-inner">
                    <p className="text-lg sm:text-2xl font-semibold mb-2 sm:mb-0">Balance: <span className="text-green-400">💎{formatBalance(balance)}</span></p>
                    <p className="text-base sm:text-xl text-center flex-grow mx-4">
                        {message}
                        {isBettingPhase && <span className="ml-2 text-sm sm:text-yellow-300 font-bold">{roundCountdown}s</span>}
                        {!isBettingPhase && !isRacing && winningPetId !== null && <span className="ml-2 text-sm sm:text-yellow-300 font-bold">{nextRoundTimer}s</span>}
                    </p>
                    {/* Button to open Add Balance Modal */}
                    <button
                        onClick={() => setShowAddBalanceModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base font-bold py-1.5 px-3 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 mt-2 sm:mt-0"
                    >
                        Add Balance
                    </button>
                </div>

                {/* Recent Wins History */}
                <div className="w-full text-center mb-6">
                    <div className="flex justify-center items-center gap-2 bg-purple-800 p-3 rounded-lg shadow-inner min-h-[50px]">
                        {recentWins.length > 0 ? (
                            recentWins.map((emoji, index) => (
                                <span key={`${emoji}-${index}`} className="text-3xl opacity-80 hover:opacity-100 transition-opacity duration-200">
                                    {emoji}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-lg">No recent wins yet.</span>
                        )}
                    </div>
                </div>


                {/* Pet Betting Cards */}
                <div className="grid grid-cols-4 gap-1 sm:gap-4 mb-8">
                    {pets.map(pet => (
                        <div
                            key={pet.id}
                            onClick={() => handlePetClick(pet.id)}
                            className={`
                                relative bg-purple-800 p-1 sm:p-4 rounded-lg shadow-lg border-4 cursor-pointer
                                flex flex-col items-center justify-center aspect-square
                                border-purple-700
                                ${isRacing && highlightedPetId === pet.id ? 'border-yellow-400 transition-all duration-200 ease-in-out' : ''}
                                ${!isRacing && winningPetId === pet.id ? 'border-yellow-400 scale-105 transform transition-all duration-300 animate-blink-border' : ''}
                                ${isBettingPhase && selectedBetValue !== null ? 'hover:border-blue-400' : ''}
                                ${!isBettingPhase && !isRacing && winningPetId !== pet.id ? 'opacity-70 cursor-not-allowed' : ''}
                                ${!isBettingPhase && isRacing ? 'cursor-not-allowed' : ''}
                            `}
                        >
                            {winningPetId === pet.id && (
                                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-yellow-400 text-xs sm:text-sm font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md animate-bounce flex items-center gap-0.5 sm:gap-1">
                                    WINNER! <span className="text-sm sm:text-lg">⭐</span> {multiplier}x
                                </div>
                            )}
                            <div className="flex flex-col items-center justify-center mb-0.5">
                                <span className="text-2xl sm:text-5xl mb-0">{pet.emoji}</span>
                                <h3 className="text-xs sm:text-xl font-bold text-center leading-tight">{pet.name}</h3>
                            </div>
                            <p className="text-gray-300 text-center text-xs sm:text-base leading-none">Odds: <span className="font-semibold text-white">{pet.odds.toFixed(0)}x</span></p>
                            <div className="text-center text-xs sm:text-lg font-bold text-blue-300 mt-0.5">
                                Bet: 💎{betAmounts[pet.id] ? betAmounts[pet.id].toFixed(2) : '0.00'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bet Amount Selection Buttons */}
                {isBettingPhase && (
                    <div className="flex justify-center gap-1 sm:gap-4 mb-8">
                        {betValues.map(value => (
                            <button
                                key={value}
                                onClick={() => setSelectedBetValue(value)}
                                className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 sm:py-3 sm:px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105
                                    ${selectedBetValue === value ? 'ring-4 ring-yellow-400' : ''}
                                `}
                            >
                                💎{value}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Balance Modal */}
            {showAddBalanceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-purple-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-purple-600 relative">
                        <button
                            onClick={() => {
                                setShowAddBalanceModal(false);
                                setAddBalanceMessage(''); // Clear message on close
                                setUpiId(''); // Clear UPI ID on close
                            }}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
                        >
                            &times;
                        </button>
                        <h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center">Add Diamonds</h2>

                        <div className="mb-4">
                            <label htmlFor="upiId" className="block text-white-300 text-sm font-bold mb-2">
                                Enter UPI ID (simulated):
                            </label>
                            <input
                                type="text"
                                id="upiId"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="e.g., yourname@bank"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-purple-900 border-purple-700 text-white"
                            />
                        </div>

                        <p className="text-center text-gray-300 mb-3">Select amount to add:</p>
                        <div className="flex flex-wrap justify-center gap-3 mb-4">
                            {topUpAmounts.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => handleUpiPayment(amount)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm"
                                >
                                    💎{amount}
                                </button>
                            ))}
                        </div>
                        {addBalanceMessage && (
                            <p className="text-center text-lg font-semibold mt-4">
                                {addBalanceMessage.startsWith('✅') ? (
                                    <span className="text-green-400">{addBalanceMessage}</span>
                                ) : (
                                    <span className="text-red-400">{addBalanceMessage}</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
