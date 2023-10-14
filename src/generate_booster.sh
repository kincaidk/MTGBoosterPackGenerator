#!/bin/bash

_jq() {
    echo "${1}" | base64 --decode --ignore-garbage | jq -r "${2}"
}

setCode=$1
setDataDirectory="set_data/${setCode}_set_data"
boosterPackDirectory="booster_packs"
boosterFile="${boosterPackDirectory}/${setCode}_booster.txt"

# Generate set, if necessary.
if [ ! -d "$setDataDirectory" ]
then
    bash "generate_set_data.sh" "${setCode}" 
fi

# Create necessary directories and files.
mkdir -p "$boosterPackDirectory"
rm -r -f "$boosterFile"
touch "$boosterFile"
echo "GENERATING BOOSTER: ${setCode}"

# Determine booster composition.
boosterComposition=$(jq -r ".[] | select(.setCode==\"${setCode}\") | .booster" "booster_composition.json")
if [ -z "$boosterComposition" ]
then
    boosterComposition=$(jq -r ".[] | select(.setCode==\"default\") | .booster" "booster_composition.json")
fi

# Generate booster.
for row in $(echo "${boosterComposition}" | jq -r '.[] | @base64'); do
    rarity=$(_jq "${row}" '.rarity')

    case "$rarity" in
        "common"|"uncommon")
            card=$(sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1)
            echo "$card" >> "$boosterFile"
            ;;
        "rare")
            # Rares have a 1/8 chance of being mythics.
            randomNumber=$(shuf -i 1-8 -n 1)
            if [ "$randomNumber" == "1" ]
            then
                rarity="mythic"
            fi

            card=$(sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1)
            echo "$card" >> "$boosterFile"
            ;;
        *)
            decodedRow=$(echo "$row" | base64 --decode --ignore-garbage)
            urlSlugToGetCard=$(echo "$decodedRow" | jq '. | to_entries[] | "&\(.key)=\(.value)&pageSize=100"' | tr -d '"') # TODO: This will fail to get every card if there are more than 100.
            specialCard=$(curl -s "https://api.magicthegathering.io/v1/cards?set=${setCode}${urlSlugToGetCard}" | jq --raw-output '[.cards[] | select(.number | test("^A-") | not)] | map(.name) | unique | .[]' | shuf -n 1)
            echo "$specialCard" >> "$boosterFile"
            ;;
    esac
done
