# The food chain simulator is a simulation of organisms based on foodchain dynamics

## This simulation consists of 3 types of organisms:

    Plants (are eaten by herbivores and omnivores)
    Herbivores (are eaten by carnivores and omnivores)
    Carnivores (are eaten by omnivores)
    Omnivores

 ## These are the organisms that currently exist in the simulation

    Grass: Fast reproduction, low food value. Light green.
    Vegetable: Slow reproduction, high food value. Dark green.
    Cow: Eats grass and vegetables, slow speed, slow reproduction. Light yellow.
    Rabbit: Eats grass and vegetables, high speed, high reproduction. Dark yellow
    Wolf: Eats cows and rabbits, high speed, medium reproduction, Light red
    Human: Eats everything, medium speed, slow reproduction. Blue.

## Future versions:

    More interactivity to control the simulation
    More different organisms
    Lion: Eats cows, high speed, slow reproduction. Dark red.
    Animal species to be more selective about diet. Cows should only eat grass for example.
    Animal color trasparancy based on health
    Fix bugs

## Bugs:

    Chasing direction is wrong, because of wrong vector frame of reference (using screen reference, instead of local animal reference)
    Chasing mechanic does not make predator stop chasing prey even if it is eaten already or out of sight
    rapid plant growth causes the simulation to freeze quickly
