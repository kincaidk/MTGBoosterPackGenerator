# MTGBoosterPackGenerator

## First run this:
`node MTGSetGenerator <threeLetterSetCode>`

This only needs to be run **once per set**, as it obtains the all of the designated set's card names and saves them in a text file.

## Then run this: 
`node MTGBoosterGenerator <threeLetterSetCode> <numberOfBoosterPacksToGenerate> <includeBasicLands [defaults to false]>`

This creates a text file containing the names of the cards in the booster packs that were generated.

The format is compatible with the card loader in the Magic: The Gathering mod for Table Top Simulator.

---

The booster packs will be in the **BoosterFiles** directory.

There will also be a file containing the name of every card in the designated set in the **SetFiles** directory.

Reach out to **Kellenceo@gmail.com** with any questions!

Thanks for reading :)
