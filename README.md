# MTGBoosterPackGenerator

## Background
This specifically generates DRAFT booster packs. 
Instead of a basic land, an additional common is added to each pack. 

## Purpose of this tool
This meant to be used with the "**Magic The Gathering**" mod (by Pol) for **Tabletop Simulator**.
When you're using that mod, there will be a button on the screen that says "*Deck Loader*". Clicking it will open a text box for you to enter card names and quantities. 

Here is an example of what you may enter: 

```
02 Lightning Bolt    
01 Plains
```

This will generate 2 Lightning Bolts and 1 Plains.

The composition of each sets' booster packs can be editted in `src/booster_composition.json`
Certain sets have hardcoded compositions already in that file, like Strixhaven and Wilds of Eldraine because their booster packs have unique compositions.

## Dependency installation
1. In your preferred command line interface, navigate to the root directory of this project.
2. Run this command to install all depedencies required by this project: `yarn`

## Using the Booster Generator
Ensure that you're still in the root directory of this project before continuing.

### First run this:
`bash src/generate_booster.sh <threeLetterSetCode> <numberOfBoostersToGenerate>`

*Example:* `bash src/generate_booster.sh NEO 6`

This will generate 6 draft booster packs for Kamigawa: Neon Dynasty.

---

The booster packs will be in the **booster_packs** directory.

There will also be files containing the names of every card in the designated set in the **set_data** directory.

Reach out to **Kellenceo@gmail.com** with any questions!

Thanks for reading :)