const crypto = require('crypto');

const KEYLEN = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLEL = 1;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, KEYLEN, { N: COST, r: BLOCK_SIZE, p: PARALLEL }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${COST}$${BLOCK_SIZE}$${PARALLEL}$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

function comparePassword(password, stored) {
  return new Promise((resolve, reject) => {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
    const [, n, r, p, salt, expectedHex] = parts;
    crypto.scrypt(password, salt, KEYLEN, { N: Number(n), r: Number(r), p: Number(p) }, (err, derivedKey) => {
      if (err) return reject(err);
      const expected = Buffer.from(expectedHex, 'hex');
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

module.exports = { hashPassword, comparePassword };
