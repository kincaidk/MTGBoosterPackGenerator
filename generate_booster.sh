#!/bin/bash

_jq() {
    echo "${1}" | base64 --decode --ignore-garbage | jq -r "${2}"
}

setCode=$1
setDataDirectory="set_data/${setCode}_set_data"
boosterFormat=$(jq -r ".[] | select(.setCode==\"${setCode}\") | .booster" "booster_composition.json")

for row in $(echo "${boosterFormat}" | jq -r '.[] | @base64'); do
    rarity=$(_jq "${row}" '.rarity')

    case "$rarity" in
        "common"|"uncommon")
            sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1
            ;;
        "rare")
            # Rares have a 1/8 chance of being mythics.
            randomNumber=$(shuf -i 1-8 -n 1)
            if [ "$randomNumber" == "1" ]
            then
                rarity="mythic"
            fi

            sed '/^\s*$/d' "${setDataDirectory}/${rarity}_${setCode}_cards.txt" | shuf -n 1
            ;;
        *)
            decodedRow=$(echo "$row" | base64 --decode --ignore-garbage)
            urlSlugToGetCard=$(echo "$decodedRow" | jq '. | to_entries[] | "&\(.key)=\(.value)&pageSize=100"' | tr -d '"') # TODO: This will fail to get every card if there are more than 100.
            
            #testing
            # echo "urlSlugToGetCard: ${urlSlugToGetCard}"

            specialCard=$(curl -s "https://api.magicthegathering.io/v1/cards?set=${setCode}${urlSlugToGetCard}" | jq --raw-output '[.cards[] | select(.number | test("^A-") | not)] | map(.name) | unique | .[]' | shuf -n 1)
            echo "$specialCard"
            ;;
    esac
done
