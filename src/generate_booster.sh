#!/bin/bash

_jq() {
    echo "${1}" | base64 --decode --ignore-garbage | jq -r "${2}"
}

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

# Generate booster(s).
for ((i=0; i<$numberOfBoosters; i++)); do
    for row in $(echo "${boosterComposition}" | jq -r '.[] | @base64'); do
        rarity=$(_jq "${row}" '.rarity')
        card=""
        case "$rarity" in
            "common"|"uncommon")
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
                urlSlugToGetCard=$(echo "$decodedRow" | jq '. | to_entries[] | "&\(.key)=\(.value)"' | tr -d '"' | tr -d '\n'  | tr -d '\r') # TODO: This will fail to get every card if there are more than 100.
                urlForCard="https://api.magicthegathering.io/v1/cards?set=${setCode}${urlSlugToGetCard}"
                card=$(curl -s "$urlForCard" | jq --raw-output '[.cards[] | select(.number | test("^A-") | not)] | map(.name) | unique | .[]' | shuf -n 1)
                ;;
        esac

        echo "01 $card" >> "$boosterFile"
    done

    echo "" >> "$boosterFile" # Separaion between booster packs.
done
