# MTGBoosterPackGenerator

## NodeJS & NPM installation
If you already have NodeJS and NPM installed, feel free to skip this section.
Otherwise, follow these steps:

1. Install NodeJS [here](https://nodejs.org/en/download/).
2. Install the latest version of NPM with this command: `npm install -g npm`
3. Run this command to verify that you have installed NodeJS (you should see a version number): `node -v`
4. Run this command to verify that you have installed NPM (you should see a version number): `npm -v`

## Dependency installation
1. In your preferred command line interface, navigate to the root directory of this project.
2. Run this command to install all depedencies required by this project: `npm install`

## Using the Set Generator & Booster Generator
Ensure that you're still in the root directory of this project before continuing.

### First run this:
`node MTGSetGenerator <threeLetterSetCode>`

This only needs to be run **once per set**, as it obtains the all of the designated set's card names and saves them in a text file.

### Then run this: 
`node MTGBoosterGenerator <threeLetterSetCode> <numberOfBoosterPacksToGenerate [defaults to 1]> <includeBasicLands [defaults to false]> <sortTheContentsOfTheBoosters [defaults to false]>`

This creates a text file containing the names of the cards in the booster packs that were generated.

The format is compatible with the card loader in the Magic: The Gathering mod for Table Top Simulator.

---

The booster packs will be in the **BoosterFiles** directory.

There will also be a file containing the name of every card in the designated set in the **SetFiles** directory.

Reach out to **Kellenceo@gmail.com** with any questions!

Thanks for reading :)