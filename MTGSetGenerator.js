const MTG = require('mtgsdk');
const FS = require('fs');
const PATH = require('path');

/////////////////////////////////////////////////////////////////////////////////////////////////
/* --DESCRIPTION--
/ This generates a file containing all the cards in the chosen set, grouped by rarity.
/ They are stored in a hash and that hash gets stringified and written to a file called
/   <setCode>_cards.txt where an example of <setCode> is SNC (Streets of New Capenna).
/ 
/ --ARGUMENTS--
/ The set code is passed in as command line argument 0.
*/////////////////////////////////////////////////////////////////////////////////////////////////

async function main() {    
    // Create an array to hold all the command line arguments.
    const ARGUMENTS = [];
    ARGUMENTS.push(process.argv[2].toUpperCase()); // NOTE: In JS, argv[2] is the first command line argument that's passed in.

    // Process the command line arguments.
    const SET_CODE = ARGUMENTS[0];
    const SET_FILES_FOLDER_NAME = "SetFiles";
    const CARDS = {commons:[], uncommons:[], rares:[], mythicRares:[]};
    const PAGE_SIZE = 100;

    // Set up some variables.
    let page = 1
    let numberOfCardsOnPage = 0;
    let totalNumberOfCardsFound = 0;
    let duplicatesFound = 0;

    
    // This function will be used to extract the all the cards from the designated set.
    async function getCardsOnPage(_page, _pageSize, _setCode) {
        let numberOfCardsOnPage = 0;

        await MTG.card.where({ set: _setCode, pageSize: _pageSize, page: _page })
        .then(cardsOnPage => {
            numberOfCardsOnPage = cardsOnPage.length

            // console.log(cardsOnPage[0]) //testing (use this to see all the properties of a Card object.)

            // Populate the 'cards' dictionary with each card, based on their rarities.
            for (let i = 0; i < numberOfCardsOnPage; i++) {
                console.log(`${cardsOnPage[i].name} - ${cardsOnPage[i].rarity}`);

                const RARITY = cardsOnPage[i].rarity.toLowerCase();
                const CARD_NAME = cardsOnPage[i].name;
                switch (RARITY) {
                    case "common":
                        if (CARDS["commons"].indexOf(CARD_NAME) == -1) {
                            CARDS["commons"].push(CARD_NAME);
                        } else {duplicatesFound++;}
                        break;
                    case "uncommon":
                        if (CARDS["uncommons"].indexOf(CARD_NAME) == -1) {
                            CARDS["uncommons"].push(CARD_NAME);
                        } else {duplicatesFound++;}
                        break;
                    case "rare":
                        if (CARDS["rares"].indexOf(CARD_NAME) == -1) {
                            CARDS["rares"].push(CARD_NAME);
                        } else {duplicatesFound++;}
                        break;
                    case "mythic":
                    case "mythic rare":
                        if (CARDS["mythicRares"].indexOf(CARD_NAME) == -1) {
                            CARDS["mythicRares"].push(CARD_NAME);
                        } else {duplicatesFound++;}
                        break;
                    default:
                        console.log(`!!! RARITY NOT RECOGNIZED - ${RARITY}`);
                        break;
                }
            }

            // testing - Lists the number of cards on the current page.
            console.log(`NUMBER OF CARDS ON PAGE ${_page}: ${numberOfCardsOnPage}`);
        })

        return numberOfCardsOnPage;
    }

    // NOTE: We can only get 100 cards at a time. This loop gets all the cards in batches of 100 (or whatever the pageSize variable has been set to.)
    do {
        numberOfCardsOnPage = await getCardsOnPage(page, PAGE_SIZE, SET_CODE);
        totalNumberOfCardsFound += numberOfCardsOnPage;
        page++;
    } while (numberOfCardsOnPage == PAGE_SIZE)

    // Adjust the total card count to ignore duplicates.
    totalNumberOfCardsFound -= duplicatesFound;

    // testing - Lists the total number of cards and duplicates found.
    console.log(`\nTOTAL NUMBER OF DUPLICATE CARDS FOUND: ${duplicatesFound}`);
    console.log(`\nTOTAL NUMBER OF UNIQUE CARDS FOUND: ${totalNumberOfCardsFound}`);

    // Stringify that 'cards' dictionary.
    const STRINGIFIED_CARDS_JSON = JSON.stringify(CARDS);

    // Write the stringified 'cards' dictionary to a file.
    const FILE_PATH = PATH.join(SET_FILES_FOLDER_NAME, `${SET_CODE}_cards.txt`);
    FS.writeFile(FILE_PATH, STRINGIFIED_CARDS_JSON, err => {
        if (err) {
            throw(`\n!!! ERROR WRITING TO FILE ${FILE_PATH}.\nERROR MESSAGE: ${err}`);
        } else {
            console.log(`\nSUCCESSFULLY wrote to file: ${FILE_PATH}`);
        }
    });
}

main();
