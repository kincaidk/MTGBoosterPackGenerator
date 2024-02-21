#!/bin/bash

# Arguments.
setCode=$1              # 3-letter set code.
numberOfBoosters=$2     # The number of booster packs to generate.

if [ -z $setCode ]
then
    echo "!!! ERROR - First argument must be a 3-letter set code."
    exit 1
fi

if [ -z $numberOfBoosters ]
then
    echo "!!! ERROR - Second argument must be a number. This is how many booster packs to generate."
    exit 1
fi

# Path variables.
setDataDirectory="set_data/${setCode}_set_data"
boosterPackDirectory="booster_packs"
boosterFile="${boosterPackDirectory}/${setCode}_booster.txt"
boosterCompositionFilePath="src/booster_composition.json"
theListFilePath="src/the_list.json"

# Generate set, if necessary.
if [ ! -d "$setDataDirectory" ]
then
    bash "src/generate_set_data.sh" "${setCode}" 
fi

# Exit if the set couldn't be generated.
if [ ! -d "$setDataDirectory" ]
then
    echo "!!! ERROR - SET NOT FOUND: ${setCode}"
    exit 1
fi

# Create necessary directories and files.
mkdir -p "$boosterPackDirectory"
rm -r -f "$boosterFile"
touch "$boosterFile"
echo "GENERATING BOOSTER: ${setCode}"

# Determine booster composition.
boosterComposition=$(jq -r ".[] | select(.setCode==\"${setCode}\") | .booster" "$boosterCompositionFilePath")
if [ -z "$boosterComposition" ]
then
    boosterComposition=$(jq -r ".[] | select(.setCode==\"default\") | .booster" "$boosterCompositionFilePath")
fi

# Determine cards from the list
thisSetUsesTheList=true

readarray -t cardsFromTheList < <(jq -r ".[] | select(.setCode==\"${setCode}\") | .cards[]" "$theListFilePath")
readarray -t specialGuestCardNames < <(curl -s 'https://api.scryfall.com/cards/search?q=set:spg' | jq '.data | map(.name) | .[]' | tr -d '"')

if [ -z "$cardsFromTheList" ]
then
    thisSetUsesTheList=false
fi

# Generate booster(s).
for ((i=0; i<$numberOfBoosters; i++)); do
    canIncludeCardFromTheList="$thisSetUsesTheList"

    for row in $(echo "${boosterComposition}" | jq -r '.[] | @base64'); do
        randomNumber=$((1 + $RANDOM % 10000)) # Generates a random number between 1 (inclusive) & 10000 (inclusive). This is also used later for The List, so keep it 10000.
        rarity=$(echo "${row}" | base64 --decode --ignore-garbage | jq --raw-output --arg _randomNumber "${randomNumber}" '. | to_entries[].value | if type=="array" then .[($_randomNumber | tonumber) % length] else . end')
        card=""
        case "$rarity" in
            "common")
                # 1250 / 10000 is 12.5%, which is the chance of a common being replaced with a card from The List.
                # Note this can only happen once per Play Booster pack.
                if [[ "$randomNumber" -le 1250 ]] && [[ "$canIncludeCardFromTheList" = true ]]; 
                then
                    # 156 / 10000 is 1.56%, which is the chance of a common being replaced with a Special Guests list card.
                    if [[ "$randomNumber" -le 156 ]]
                    then
                        numberOfCardsInTheSpecialGuests=${#specialGuestCardNames[@]} # <---- Array length
                        randomIndex=$(($randomNumber % $numberOfCardsInTheSpecialGuests))
                        card=${specialGuestCardNames[$randomIndex]}     
                        echo "--- SPECIAL GUEST CARD in pack $((i+1)) --> ${card}"
                    else
                        # Get a card from The List for the target set.
                        numberOfCardsInTheList=${#cardsFromTheList[@]} # <---- Array length 
                        randomIndex=$(($randomNumber % $numberOfCardsInTheList))
                        card=${cardsFromTheList[$randomIndex]}
                        echo "---TRIGGERED THE LIST in pack $((i+1)) --> ${card}"
                    fi
                    canIncludeCardFromTheList=false
                else
                    # Get a normal common from the target set.
                    card=$(sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1)
                fi
                ;;
            "uncommon")
                # Get an uncommon from the target set.
                card=$(sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1)
                ;;
            "rare")
                # Rares have a 1/8 chance of being mythics.
                randomNumber=$(shuf -i 1-8 -n 1)
                if [ "$randomNumber" == "1" ]
                then
                    rarity="mythic"
                fi

                card=$(sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1)
                ;;
            *)
                decodedRow=$(echo "$row" | base64 --decode --ignore-garbage)
   
                key=$(echo "$decodedRow" | jq '. | to_entries[] | "\(.key)"' | tr -d '"' | tr -d '\n'  | tr -d '\r')
                queryParam=$(echo "$decodedRow" | jq --arg _key "$key" '. | to_entries[].value | if type=="array" then map($_key+":"+.) | reduce .[] as $item (""; .+"+"+$item) else "+"+$_key+":"+. end' | tr -d '"' | tr -d '\n'  | tr -d '\r')

                urlSlugToGetCard=""

                # If the set wasnt specified, use the current set.
                if [ "${key}" != "set" ]
                then
                    urlSlugToGetCard+="set:${setCode}"
                fi

                urlSlugToGetCard+="${queryParam}"
                urlForCards="https://api.scryfall.com/cards/search?q=${urlSlugToGetCard}"
                card=$(curl -s "$urlForCards" | jq --raw-output '[.data[] | select(.collector_number | test("^A-") | not)] | map(.name) | unique | .[]' | shuf -n 1)
                ;;
        esac

        echo "01 $card" >> "$boosterFile"
    done

    echo "" >> "$boosterFile" # Separation between booster packs.
done

echo "${numberOfBoosters} ${setCode} BOOSTERS GENERATED"
