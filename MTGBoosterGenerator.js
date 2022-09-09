const FS = require('fs');
const PATH = require('path');

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
/ The set code is passed in as command line argument 0.
/ [optional] The number of boosters to generate is passed in as command line argument 1.
/ [optional] Whether to include basic lands in the boosters. (defaulted to false.)
/ [optional] The prefix of the file path to the full set is passed in as command line argument 3.
*/////////////////////////////////////////////////////////////////////////////////////////////////

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
const FULL_SET_FILE_PATH_PREFIX = (!ARGUMENTS[3]) ? "" : ARGUMENTS[3];

// Define other variables.
const SET_FILES_FOLDER_NAME = "SetFiles";
const BOOSTER_FILES_FOLDER_NAME = "BoosterFiles";
const FILE_NAME_FULL_SET = PATH.join(FULL_SET_FILE_PATH_PREFIX, SET_FILES_FOLDER_NAME, `${SET_CODE}_cards.txt`);
const FILE_NAME_BOOSTER = PATH.join(BOOSTER_FILES_FOLDER_NAME, `${SET_CODE}_booster.txt`);
let stringifiedCardHash = null;
let cardHash = null;

// These constants represent the distribution of cards in a booster pack, by rarity.
const COMMON_COUNT = 11;
const UNCOMMON_COUNT = 3;
const RARE_COUNT = 1;

// Create BoosterFiles directory, if it doesn't exist.
if (!FS.existsSync(BOOSTER_FILES_FOLDER_NAME)) {
    FS.mkdirSync(BOOSTER_FILES_FOLDER_NAME);
}

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

// Read the contents of the file to get every card in the set. Assign to stringifiedCardHash.
if (FS.existsSync(FILE_NAME_FULL_SET)) {
    stringifiedCardHash = FS.readFileSync(FILE_NAME_FULL_SET, {encoding: "utf8", flag: "r"});
    cardHash = JSON.parse(stringifiedCardHash);

    if (typeof(cardHash) !== "object") {
        throw(`CARD HASH WAS NOT A HASH -- ${typeof(cardHash)}`);
    }
} else {
   throw(`FILE DID NOT EXIST -- ${FILE_NAME_FULL_SET}`);
}

// Clear the contents of the booster file. (If it doesn't exist, this will create it and make it blank.)
FS.writeFileSync(FILE_NAME_BOOSTER, "", function(err) {
    if (err) {
        throw(`!!! ERROR CLEARING BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
    }
});

// Generate each card for the booster and write their names to the booster file.
for (let i = 0; i < NUMBER_OF_BOOSTERS; i++) {
    let missingCardCount = 0;

    // Rares
    for (let r = 0; r < RARE_COUNT; r++) {
        // 12.5% chance for the Rare card in a booster pack to be a Mythic Rare card instead.
        const GET_MYTHIC_RARE_CARD = Math.floor(Math.random() * 8) < 1;
        const RARE_CARD_POOL = (GET_MYTHIC_RARE_CARD) ? cardHash["mythicRares"] : cardHash["rares"];
        let cardName = sample(RARE_CARD_POOL);

        // If there are no cards of the chosen rarity, then get one of the other rarity (between Rare & Mythic Rare).
        // If there are no cards of either rarity, then break out the loop.
        if (!cardName) {
            if (GET_MYTHIC_RARE_CARD) {
                console.log("NO MYTHIC RARES TO CHOOSE FROM.");
                cardName = sample(cardHash["rares"]);
            } else {
                console.log("NO RARES TO CHOOSE FROM.")
                cardName = sample(cardHash["mythicRares"]);
            }

            if (!cardName) {
                console.log("NO RARES OR MYTHIC RARES TO CHOOSE FROM.");
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
    }

    // Uncommons
    for (let u = 0; u < (UNCOMMON_COUNT + missingCardCount); u++) {
        let cardName = sample(cardHash["uncommons"]);

        // Break if there are no cards of this rarity.
        if (!cardName) {
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
    }

    // Commons
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
    }

    // Append a new line character to the booster file as a separator for each booster.
    FS.appendFileSync(FILE_NAME_BOOSTER, "\n", function(err) {
        if (err) {
            throw(`!!! ERROR APPENDING TO BOOSTER FILE - ${FILE_NAME_BOOSTER}\nERROR MESSAGE: ${err}`);
        }
    });
}

console.log(`BOOSTER GENERATION COMPLETE! - ${FILE_NAME_BOOSTER}`);



