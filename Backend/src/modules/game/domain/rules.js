'use strict';

const { BEATS, isValidChoice } = require('./choice');

/**
 * @returns {'draw' | 'player1' | 'player2' | 'invalid'}
 */
function determineWinner(choice1, choice2) {
  if (!isValidChoice(choice1) || !isValidChoice(choice2)) return 'invalid';
  if (choice1 === choice2) return 'draw';
  return BEATS[choice1] === choice2 ? 'player1' : 'player2';
}

module.exports = { determineWinner };
