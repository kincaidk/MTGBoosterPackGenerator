#!/bin/bash

######################## GET ALL CARDS IN SET AND PUT THEIR NAMES IN A TEXT FILE, REMOVING DUPLICATES, BASIC LANDS, & ALCHEMY CARDS. SORT BY RARITY.
setCode=$1
dirName="set_data/${setCode}_set_data"

rm -r -f "$dirName"
mkdir -p "$dirName"
allCardsFilePath="${dirName}/all_${setCode}_cards.json"
newCardsFilePath="${dirName}/new_${setCode}_cards.json"

###### NOTES:
### This will fail to get all the cards in the chosen set if the set has more than 1000 cards (extremely unlikely, considering that the biggest set ever only had 449 cards)
### The regex 'test("^A-") | not' removes all Alchemy cards, which have a 'number' field whose value starts with 'A-'.
for page in {1..10}
do
    # Get all cards in set (page by page).
    newCards=$(curl -s "https://api.magicthegathering.io/v1/cards?set=${setCode}&page=${page}&pageSize=100" | jq .cards)
    
    # Break if there are no more cards.
    if [ "$newCards" == "[]" ]
    then
        break
    fi

    if [ ! -f "$allCardsFilePath" ]
    then
        # If the master file didn't exist, create it and add these cards to it.
        touch "$allCardsFilePath"
        echo "$newCards" > "$allCardsFilePath"
    else
        # Otherwise, add these cards to their own temporary file and then merge it with the master file.
        echo "$newCards" > "$newCardsFilePath"

        # Otherwise, add them to the existing content in the file.
        cardFileContents=$(jq ". + input" "$allCardsFilePath" "$newCardsFilePath")

        echo "$cardFileContents" > "$allCardsFilePath"
        rm "$newCardsFilePath"
    fi
done

 # All cards
allCardNames=$(jq --raw-output '[.[] | select(.number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not)] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$allCardNames" >> "${dirName}/all_${setCode}_cards.txt"

if [ -z "$allCardNames" ]
then
    echo "!!! ERROR - NO CARDS IN SET: ${setCode}"
    rm -r -f "$dirName"
    exit 1
fi

# Commons
commonCards=$(jq --raw-output '[.[] | select(.number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="Common")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$commonCards" >> "${dirName}/common_${setCode}_cards.txt"

# Uncommons
uncommonCards=$(jq --raw-output '[.[] | select(.number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="Uncommon")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$uncommonCards" >> "${dirName}/uncommon_${setCode}_cards.txt"

# Rares
rareCards=$(jq --raw-output '[.[] | select(.number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="Rare")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$rareCards" >> "${dirName}/rare_${setCode}_cards.txt"

# Mythics
mythicCards=$(jq --raw-output '[.[] | select(.number | test("^A-") | not) | select(.name | test("^Island|Mountain|Plains|Swamp|Forest$"; "i") | not) | select(.rarity=="Mythic")] | map(.name) | unique | .[]' "${allCardsFilePath}")
echo "$mythicCards" >> "${dirName}/mythic_${setCode}_cards.txt"
#############################
