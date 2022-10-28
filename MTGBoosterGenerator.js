const MTG = require('mtgsdk');
const FS = require('fs');
const PATH = require('path');
const { exec } = require("child_process");

/////////////////////////////////////////////////////////////////////////////////////////////////
/* --DESCRIPTION--
/ This returns the names of the cards in a randomly generated booster pack, based on the contents
/   of the output file from MTGSetGenerator. 
/ The booster pack that gets generated will contain:
/   11 commons
/   3 uncommons
/   1 rare / mythic rare
/ 
/ --ARGUMENTS--
/ The set code (argument 0).
/ [optional] The number of boosters to generate (argument 1). (defaults to 1)
/ [optional] Whether to include basic lands in the boosters (argument 2). (defaulted to false)
/ [optional] Whether to create a file containing the contents of the boosters sorted (argument 3). (defaults to false)
/ [optional] The prefix of the file path to the full set (argument 4). (defaults to "")
*/////////////////////////////////////////////////////////////////////////////////////////////////

//#region Variables
// Create an array to hold all the command line arguments.
const ARGUMENTS = [];

// NOTE: In JS, process.argv[2] is the first command line argument that's passed in.
for (let i = 2; i < process.argv.length; i++) {
    ARGUMENTS.push(process.argv[i]);
}

// Process the command line arguments.
const SET_CODE = ARGUMENTS[0].toUpperCase(); // For example: "SNC" for Streets of New Capenna.
const NUMBER_OF_BOOSTERS = (!ARGUMENTS[1] || parseInt(ARGUMENTS[1]) < 1) ? 1 : parseInt(ARGUMENTS[1]);
const INCLUDE_BASIC_LANDS = (!ARGUMENTS[2]) ? false : ARGUMENTS[2].toLowerCase() !== "false";
const SORT_CARDS = (!ARGUMENTS[3]) ? false : ARGUMENTS[3].toLowerCase() !== "false";
const FULL_SET_FILE_PATH_PREFIX = (!ARGUMENTS[4]) ? "" : ARGUMENTS[4];

// Define other variables.
const SET_FILES_FOLDER_NAME = "SetFiles";
const BOOSTER_FILES_FOLDER_NAME = "BoosterFiles";
const FILE_NAME_FULL_SET = PATH.join(FULL_SET_FILE_PATH_PREFIX, SET_FILES_FOLDER_NAME, `${SET_CODE}_cards.txt`);
const FILE_NAME_BOOSTER = PATH.join(BOOSTER_FILES_FOLDER_NAME, `${SET_CODE}_booster.txt`);
const FILE_NAME_BOOSTER_SORTED = PATH.join(BOOSTER_FILES_FOLDER_NAME, `${SET_CODE}_booster_SORTED.txt`);
let cardHash = null;

// These constants represent the distribution of cards in a booster pack, by rarity.
const COMMON_COUNT = 11;
const UNCOMMON_COUNT = 3;
const RARE_COUNT = 1;
const BOOSTER_SIZE = COMMON_COUNT + UNCOMMON_COUNT + RARE_COUNT;
let maxCardNumber = undefined;

// Used for sorting the cards that get chosen for booster packs. (only relevant if the SORT_CARDS argument is true)
const SORTED_CARDS = {
    lands:[],
    multicolored:{creatures:[], nonCreatures:[]},
    white:{creatures:[], nonCreatures:[]},
    blue:{creatures:[], nonCreatures:[]},
    black:{creatures:[], nonCreatures:[]},
    red:{creatures:[], nonCreatures:[]},
    green:{creatures:[], nonCreatures:[]},
    colorless:{creatures:[], nonCreatures:[]}
};
//#endregion

//#region Functions
// Function for getting a random entry from an array. 
function sample(arrayToSample) {
    if (arrayToSample.length === 0) {return undefined;}

    const BASIC_LANDS = ["plains","island","swamp","mountain","forest"];
    let cardIsBasicLand;
    let cardName;

    do {
        let randomIndex = Math.floor(Math.random() * arrayToSample.length);
        cardName = arrayToSample[randomIndex]
        cardIsBasicLand = BASIC_LANDS.indexOf(cardName.toLowerCase()) != -1;
    } while (!INCLUDE_BASIC_LANDS && cardIsBasicLand)

    return cardName;
}

/*
    Creates the file that booster packs will reside.
    Also creates the BoosterFiles directory, if it doesn't exist.
*/
function prepareBoosterFile() {
    // Create BoosterFiles directory, if it doesn't exist.
    if (!FS.existsSync(BOOSTER_FILES_FOLDER_NAME)) {
        FS.mkdirSync(BOOSTER_FILES_FOLDER_NAME);
    }

    // Clear the contents of the booster file, or create it if it doesn't exist.
    FS.writeFileSync(FILE_NAME_BOOSTER, "", function(err) {
        if (err) {
            throw(`!!! ERROR CLEARING BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
        }
    });
}

/*
    Reads the file that contains all the card in the designated set.
    Returns json that contains each card in the designatd set, organized by rarity.
*/
async function parseCardHash() {
    // Read and parse the contents of the file to get every card in the set.
    const STRINGIFIED_CARD_HASH = FS.readFileSync(FILE_NAME_FULL_SET, {encoding: "utf8", flag: "r"});
    const PARSED_CARD_HASH = JSON.parse(STRINGIFIED_CARD_HASH);

    if (typeof(PARSED_CARD_HASH) !== "object") {
        throw(`!!! CARD HASH WAS NOT A HASH -- ${typeof(PARSED_CARD_HASH)}`);
    }

    return PARSED_CARD_HASH;
}

/*
    Adds a rare (or mythic rare) card to the booster pack.
    
    PARAMS:
    -Takes a variable that will represent the number of missing cards (based on missing rarities)

    Returns the number of missing cards for this rarity.
*/
async function selectRareCard(missingCardCount, cardsInBooster) {
    for (let r = 0; r < RARE_COUNT; r++) {
        // 12.5% chance for the Rare card in a booster pack to be a Mythic Rare card instead.
        const GET_MYTHIC_RARE_CARD = Math.floor(Math.random() * 8) < 1;
        const RARE_CARD_POOL = (GET_MYTHIC_RARE_CARD) ? cardHash["mythicRares"] : cardHash["rares"];
        let cardName = sample(RARE_CARD_POOL);

        // If there are no cards of the chosen rarity, then get one of the other rarity (between Rare & Mythic Rare).
        // If there are no cards of either rarity, then break out the loop.
        if (!cardName) {
            if (GET_MYTHIC_RARE_CARD) {
                console.log("! WARNING - NO MYTHIC RARES TO CHOOSE FROM.");
                cardName = sample(cardHash["rares"]);
            } else {
                console.log("! WARNING - NO RARES TO CHOOSE FROM.")
                cardName = sample(cardHash["mythicRares"]);
            }

            if (!cardName) {
                console.log("! WARNING - NO RARES OR MYTHIC RARES TO CHOOSE FROM.");
                missingCardCount = RARE_COUNT;
                break;
            }
        }

        // Append the card name to the booster file.
        FS.appendFileSync(FILE_NAME_BOOSTER, `01 ${cardName}\n`, function(err) {
            if (err) {
                throw(`!!! ERROR APPENDING TO BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
            }
        });

        cardsInBooster.push(cardName);
    }

    return missingCardCount;
}

/*
    Adds an uncommon card to the booster pack.
    
    PARAMS:
    -Takes a variable that will represent the number of missing cards (based on missing rarities)

    Returns the number of missing cards for this rarity.
*/
async function selectUncommonCard(missingCardCount, cardsInBooster) {
    for (let u = 0; u < (UNCOMMON_COUNT + missingCardCount); u++) {
        let cardName = sample(cardHash["uncommons"]);

        // Break if there are no cards of this rarity.
        if (!cardName) {
            console.log("! WARNING - NO UNCOMMONS FOUND!");
            missingCardCount += UNCOMMON_COUNT;
            break;
        } else if (missingCardCount !== 0) {
            missingCardCount = 0;
        }

        // Append the card name to the booster file.
        FS.appendFileSync(FILE_NAME_BOOSTER, `01 ${cardName}\n`, function(err) {
            if (err) {
                throw(`!!! ERROR APPENDING TO BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
            }
        });

        cardsInBooster.push(cardName);
    }

    return missingCardCount;
}

/*
    Adds a common card to the booster pack.
    
    PARAMS:
    -Takes a variable that will represent the number of missing cards (based on missing rarities)
*/
async function selectCommonCard(missingCardCount, cardsInBooster) {
    for (let c = 0; c < (COMMON_COUNT + missingCardCount); c++) {
        let cardName = sample(cardHash["commons"]);

        // Break if there are no cards of this rarity.
        if (!cardName) {
            console.log("WARNING - NO COMMONS FOUND!");
            break;
        }

        // Append the card name to the booster file.
        FS.appendFileSync(FILE_NAME_BOOSTER, `01 ${cardName}\n`, function(err) {
            if (err) {
                throw(`!!! ERROR APPENDING TO BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
            }
        });

        cardsInBooster.push(cardName);
    }
}

/*
    Generates a 15-card booster pack and appends it to the corresponding booster file.
*/
async function generateBoosterPack() {
    let missingCardCount = 0;
    const CARDS_IN_BOOSTER = [];

    // Rares
    missingCardCount = await selectRareCard(missingCardCount, CARDS_IN_BOOSTER);

    // Uncommons
    missingCardCount = await selectUncommonCard(missingCardCount, CARDS_IN_BOOSTER);

    // Commons
    await selectCommonCard(missingCardCount, CARDS_IN_BOOSTER);

    // Sort the booster pack's cards into SORTED_CARDS, if necessary.
    if (SORT_CARDS) {
        await getCardsFromCardNamesAndSortThem(CARDS_IN_BOOSTER);
    }

    // Append a new line character to the booster file as a separator for each booster.
    FS.appendFileSync(FILE_NAME_BOOSTER, "\n", function(err) {
        if (err) {
            throw(`!!! ERROR APPENDING TO BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
        }
    });
}

/*
    Returns true if card has the designated type.
*/
async function cardHasType(card, type) {
    return card.types.indexOf(type) !== -1;
}

/*
    Adds the card's name to the SORTED_CARDS hash.
*/
async function addCardToSortedCardHash(card) {
    const CARD_NAME = card.name;
    const CARD_IS_LAND = await cardHasType(card, "Land");

    if (CARD_IS_LAND) {
        SORTED_CARDS.lands.push(CARD_NAME);
    } else {
        const CARD_IS_CREATURE = await cardHasType(card, "Creature");
        const CARD_IS_MULTICOLORED = (!card.colors) ? false : card.colors.length > 1;

        if (CARD_IS_MULTICOLORED) {
            //testing
            // console.log(`CARD IS MULTICOLORED - ${CARD_NAME} - types:${card.types} - Colors:${card.colors}`);

            // Multicolored cards.
            if (CARD_IS_CREATURE) {
                SORTED_CARDS.multicolored.creatures.push(CARD_NAME);
            } else {
                SORTED_CARDS.multicolored.nonCreatures.push(CARD_NAME);
            }
        } else {
            //testing
            // console.log(`CARD IS monoCOLORED - ${CARD_NAME} - types:${card.types} - Colors:${card.colors}`);

            // Monocolored & colorless cards.
            const CARD_COLOR = (!card.colors) ? "" : card.colors[0].toLowerCase();

            //testing
            // console.log(`---CARD_COLOR variable: ${CARD_COLOR}`);

            switch (CARD_COLOR) {
                case "w":
                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.white.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.white.nonCreatures.push(CARD_NAME);
                    }
                    break;
                case "u":
                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.blue.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.blue.nonCreatures.push(CARD_NAME);
                    }
                    break;
                case "b":
                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.black.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.black.nonCreatures.push(CARD_NAME);
                    }
                    break;
                case "r":
                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.red.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.red.nonCreatures.push(CARD_NAME);
                    }
                    break;
                case "g":
                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.green.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.green.nonCreatures.push(CARD_NAME);
                    }
                    break;
                default:
                    //testing
                    // console.log(`CARD IS COLORLESS - ${CARD_NAME} - ColorID:${card.colorIdentity} - Colors:${card.colors} - CMC:${card.cmc} - ManaCost:${card.manaCost}`);

                    if (CARD_IS_CREATURE) {
                        SORTED_CARDS.colorless.creatures.push(CARD_NAME);
                    } else {
                        SORTED_CARDS.colorless.nonCreatures.push(CARD_NAME);
                    }
            }
        }
    }
}

/*
    Takes a card's name and queries the corresponding card object.
    Then adds that card's name to the SORTED_CARDS hash based on some of the card's attributes.
*/
async function getCardsFromCardNamesAndSortThem(cardNames) {
    const PIPE_DELIMITED_CARD_NAMES = cardNames.join("|");

    // Get the card objects that correspond to this booster's cards and add them to SORTED_CARDS.
    await MTG.card.where({ set: SET_CODE, name: PIPE_DELIMITED_CARD_NAMES})
    .then(async cardsInBooster => {
        //testing
        // console.log("~~~~~~~~~~~~~~~~~~~~");

        // Add each card to the SORTED_CARDS hash, one at a time.
        for (let i = 0; i < cardsInBooster.length; i++) {
            const CARD = cardsInBooster[i];
            
            // Only accept cards that were the original version in the set, to avoid adding duplicate cards to the booster.
            if (CARD.number <= maxCardNumber) {
                const AMOUNT_OF_THIS_CARD_IN_BOOSTER = cardNames.filter(cardName => cardName === CARD.name).length;
                for (let j = 0; j < AMOUNT_OF_THIS_CARD_IN_BOOSTER; j++) {
                    // console.log(`TAKE: ${CARD.name} - ${CARD.rarity}`);
                    await addCardToSortedCardHash(CARD);
                }

                /* 
                    -Double-sided cards cause duplicates to be added because the back side gets added too, but i dont want that to happen.
                    -So here we skip over the index of the back side that the query brought us.
                */
                const DOUBLE_SLASH_INDEX = CARD.name.indexOf(" // ");
                const CARD_IS_DOUBLE_SIDED = DOUBLE_SLASH_INDEX !== -1;
                if (CARD_IS_DOUBLE_SIDED) {
                    i += 1;

                    //testing
                    // console.log(`~~~SKIP (backside): ${CARD.name} - ${CARD.rarity}`);
                }
            } else {
                //testing
                // console.log(`~~~SKIP: ${CARD.name} - ${CARD.rarity}`);
            }
        }
    });
}

/*
    Main function.
*/
// retrieveFullSet();

async function main() {
    prepareBoosterFile();
    // await retrieveFullSet();
    cardHash = await parseCardHash();

    try {
        maxCardNumber = cardHash.setSize;
    } catch (e) {
        throw "!!! ERROR referencing the setSize property of the card hash. Try fetching the set's cards again [node MTGSetGenerator.js <setCode>]";
    }

    // Generate each card for the booster and write their names to the booster file.
    for (let i = 0; i < NUMBER_OF_BOOSTERS; i++) {
        await generateBoosterPack();
    }

    // If the cards were also sorted, create a separate file and store the sorted cards in there.
    if (SORT_CARDS) {
        const CARD_PREFIX = "01 ";
        let concatenatedCards = "";
        let cardArray = [];

        // Add lands
        cardArray = SORTED_CARDS.lands;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add multicolored
        cardArray = SORTED_CARDS.multicolored.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.multicolored.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add white
        cardArray = SORTED_CARDS.white.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.white.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add blue
        cardArray = SORTED_CARDS.blue.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.blue.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add black
        cardArray = SORTED_CARDS.black.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.black.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add red
        cardArray = SORTED_CARDS.red.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.red.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add green
        cardArray = SORTED_CARDS.green.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.green.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Add colorless
        cardArray = SORTED_CARDS.colorless.nonCreatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }
        cardArray = SORTED_CARDS.colorless.creatures;
        if (cardArray.length > 0) {
            concatenatedCards += `${CARD_PREFIX}${cardArray.join(`\n${CARD_PREFIX}`)}`;
            concatenatedCards += "\n\n";
        }

        // Write the sorted cards' names to their own file in sorted order.
        FS.writeFileSync(FILE_NAME_BOOSTER_SORTED, concatenatedCards, function(err) {
            if (err) {
                throw(`!!! ERROR APPENDING TO SORTED BOOSTER FILE - ${FILE_NAME_BOOSTER_SORTED}\nERROR MESSAGE: ${err}`);
            }
        });
    }

    console.log(`SUCCESSFULLY GENERATED ${NUMBER_OF_BOOSTERS} BOOSTERS! --- FIND THEM HERE: ${FILE_NAME_BOOSTER}`);

    if (SORT_CARDS) {
        console.log(`FIND THEM SORTED HERE: ${FILE_NAME_BOOSTER_SORTED}`);
    }
}
//#endregion

//////////////////////////////////////
                ////////      ////////
                //////// MAIN ////////
                ////////      ////////
//////////////////////////////////////

const SET_CARDS_RETRIEVED = FS.existsSync(FILE_NAME_FULL_SET);

// Retrieve the set cards if they haven't been already.
if (!SET_CARDS_RETRIEVED) {
    console.log(`! SET FILE DID NOT EXIST -- ${FILE_NAME_FULL_SET}`);
    console.log(`Fetching set: ${SET_CODE}...`);

    exec(`node MTGSetGenerator.js ${SET_CODE}`, (error, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);

        if (error || stderr) {
            console.log(`!!! SET ${SET_CODE} COULD NOT BE LOADED.`);
        } else {
            // Main (the set needed to be generated on the fly.)
            main();
        }
    });
} else {
    // Main (the Set was pre-generated.)
    main();
}








//testing - delete everything beyond this point.
// async function test() {
//     await MTG.card.where({ set: SET_CODE, pageSize: 100, page: 3,  })
//     .then(async cardsOnPage => {
//         for (let i = 0; i < cardsOnPage.length; i++) {
//             const CARD = cardsOnPage[i];
            
//             //testing
//             console.log(`${CARD.name} --- ${CARD.colorIdentity} --- ${CARD.types}`);

//             await addCardToSortedCardHash(CARD);
//         }
//     });

//     //testing
//     console.log("\nSORTED CARDS\n");
//     console.log(SORTED_CARDS);
// }

// test();
