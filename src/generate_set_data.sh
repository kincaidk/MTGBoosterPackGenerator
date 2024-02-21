#!/bin/bash

##### Custom functions
processCards () {
    cards=$1
    allCardsFilePath=$2
    newCardsFilePath=$3

    newCards=$(echo "$cardListObject" | jq '.data')
    if [ ! -f "$allCardsFilePath" ]
    then
        # If the master file didn't exist, create it and add these cards to it.
        touch "$allCardsFilePath"
        echo "$newCards" > "$allCardsFilePath"
    else
        # Otherwise, add these cards to their own temporary file and then merge it with the master file.
        echo "$newCards" > "$newCardsFilePath"

        # This adds them to the existing content in the master file. Then removes the new cards' file.
        cardFileContents=$(jq ". + input" "$allCardsFilePath" "$newCardsFilePath")
        echo "$cardFileContents" > "$allCardsFilePath"
        rm "$newCardsFilePath"
    fi
}
#####

##### Inputs
setCode=$1
#####

##### Setup
dirName="set_data/${setCode}_set_data"

echo "GENERATING SET: ${setCode}"

rm -r -f "$dirName"
mkdir -p "$dirName"
allCardsFilePath="${dirName}/all_${setCode}_cards.json"
newCardsFilePath="${dirName}/new_${setCode}_cards.json"
#####

##### Get first page of cards and check if there is another page.
cardListObject=$(curl -s "https://api.scryfall.com/cards/search?q=set:${setCode}" | jq '.')
thereIsAnotherPage=$(echo "$cardListObject" | jq --raw-output '.has_more')
numberOfCards=$(echo "$cardListObject" | jq --raw-output '.total_cards')

echo "TOTAL NUMBER OF CARDS FOUND: ${numberOfCards}"
#####

##### Save all the cards' DATA to one file.
processCards "$cardListObject" "$allCardsFilePath" "$newCardsFilePath" 
#####

while [ "$thereIsAnotherPage" = true ]
do
    ##### Get the next page of cards.
    nextPageUri=$(echo "$cardListObject" | jq --raw-output '.next_page')
    cardListObject=$(curl -s ${nextPageUri} | jq '.')
    #####

    ##### Save all the cards' DATA to one file.
    processCards "$cardListObject" "$allCardsFilePath" "$newCardsFilePath" 
    #####

    ##### Check if there is another page of cards.
    thereIsAnotherPage=$(echo "$cardListObject" | jq --raw-output '.has_more')
    #####
done


##### Save all the cards' NAMES to one file
allCardNames=$(jq --raw-output '[.[] | select(.collector_number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not)] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$allCardNames" >> "${dirName}/all_${setCode}_cards.txt"

if [ -z "$allCardNames" ]
then
    echo "!!! ERROR - NO CARDS IN SET: ${setCode}"
    rm -r -f "$dirName"
    exit 1
fi
#####

##### Sort each card into different files based on their rarity.
# Commons
commonCards=$(jq --raw-output '[.[] | select(.collector_number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="common")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$commonCards" >> "${dirName}/common_${setCode}_cards.txt"

# Uncommons
uncommonCards=$(jq --raw-output '[.[] | select(.collector_number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="uncommon")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$uncommonCards" >> "${dirName}/uncommon_${setCode}_cards.txt"

# Rares
rareCards=$(jq --raw-output '[.[] | select(.collector_number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="rare")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$rareCards" >> "${dirName}/rare_${setCode}_cards.txt"

# Mythics
mythicCards=$(jq --raw-output '[.[] | select(.collector_number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="mythic")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$mythicCards" >> "${dirName}/mythic_${setCode}_cards.txt"
#####


if [ "${numberOfCards}" -ge 0 ]
then
    echo "${setCode} SET GENERATED"
else
    echo "!!! ERROR - NO CARDS FOUND FOR THE ${setCode} SET."
fi

