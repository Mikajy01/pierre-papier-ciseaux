'use strict';

const CHOICES = Object.freeze(['pierre', 'papier', 'ciseau']);

/** Each choice mapped to the choice it beats. */
const BEATS = Object.freeze({
  pierre: 'ciseau',
  papier: 'pierre',
  ciseau: 'papier',
});

const isValidChoice = (value) => CHOICES.includes(value);

module.exports = { CHOICES, BEATS, isValidChoice };
