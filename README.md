# MTGBoosterPackGenerator

## Background
This booster pack generator is meant to be used with the "**Magic The Gathering**" mod (by Pol) for **Tabletop Simulator**.
When you're using that mod, there will be a button on the screen that says "*Deck Loader*". Clicking it will open a text box for you to enter card names and quantities. 

Here is an example of what you may enter: 

02 Lightning Bolt

01 Plains

This will generate 2 Lightning Bolts and 1 Plains.

Each booster pack will have 11 commons, 3 uncommons, and 1 rare/mythic. 
All of these cards will be chosen randomly from the set that you specify.

You may generate any amount of booster packs.

You may optionally enable the inclusion of basic lands in these booster packs.

You may optioanlly have the contents of these booster packs automatically sorted by color and creature/non-creature to expedite the deck-making process.

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
`node MTGSetGenerator <three_letter_set_code>`

This only needs to be run **once per set**, as it obtains the all of the designated set's card names and saves them in a text file.

### Then run this: 
`node MTGBoosterGenerator <three_letter_set_code> <number_of_booster_packs_to_generate [defaults to 1]> <include_basic_lands? [defaults to false]> <sort_the_contents_of_the_boosters? [defaults to false]>`

This creates a text file containing the names of the cards in the booster packs that were generated.

The format is compatible with the card loader in the Magic: The Gathering mod for Table Top Simulator.

---

The booster packs will be in the **BoosterFiles** directory.

There will also be a file containing the name of every card in the designated set in the **SetFiles** directory.

Reach out to **Kellenceo@gmail.com** with any questions!

Thanks for reading :)