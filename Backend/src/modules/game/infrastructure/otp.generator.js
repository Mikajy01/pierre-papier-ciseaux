'use strict';

/** Generates a 4-digit numeric code (1000-9999). */
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

module.exports = { generateOtp };
