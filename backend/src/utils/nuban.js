// src/utils/nuban.js
// Implements the CBN (Central Bank of Nigeria) NUBAN algorithm.
// Reference: CBN NUBAN Specification document.

// Our bank code — in a real app this would be your actual CBN-assigned
// bank code. We use "000" as a placeholder for this project.
// Real examples: GTBank = 058, Kuda = 090267
// For NUBAN we only use the last 3 digits of the bank code.
const BANK_CODE = '171';

// CBN defined weights — these never change, they are fixed by the standard.
// Every Nigerian bank uses these exact weights in this exact order.
const NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3];

// ─── GENERATE NUBAN ──────────────────────────────────────────
// Takes a raw sequence number from the database and produces
// a valid 10-digit NUBAN account number.
//
// Example:
//   serialNumber = 1
//   → serial      = "000001"      (6 digits, zero padded)
//   → nineDigits  = "000000001"   (bank code + serial = 9 digits)
//   → checkDigit  = 7             (computed by algorithm)
//   → accountNumber = "0000000017" (9 digits + check digit)

export function generateNUBAN(serialNumber) {

  // STEP 1: Convert serial number to 6-digit zero-padded string.
  // padStart(6, '0') adds leading zeros until the string is 6 chars.
  // e.g. 1 → "000001", 999 → "000999", 100000 → "100000"
  const serial = serialNumber.toString().padStart(6, '0');

  // STEP 2: Build the 9-digit string = bank code (3) + serial (6)
  const nineDigits = BANK_CODE + serial;

  // STEP 3: Validate — must be exactly 9 digits
  if (nineDigits.length !== 9) {
    throw new Error(`Invalid NUBAN input: ${nineDigits} is not 9 digits`);
  }

  // STEP 4: Apply the NUBAN weighting algorithm
  // Split the 9-digit string into individual digits,
  // multiply each by its corresponding weight,
  // then sum all the products.
  const sum = nineDigits
    .split('')           // "000000001" → ["0","0","0","0","0","0","0","0","1"]
    .reduce((total, digit, index) => {
      // parseInt converts "0" → 0, "1" → 1 etc.
      // NUBAN_WEIGHTS[index] gives the weight for this position
      return total + (parseInt(digit) * NUBAN_WEIGHTS[index]);
    }, 0); // 0 is the initial value of "total"

  // STEP 5: Calculate check digit using CBN formula
  // (10 - (sum mod 10)) mod 10
  // The outer % 10 handles the edge case where sum is a multiple of 10
  // e.g. sum = 30 → (10 - 0) % 10 = 0, not 10
  const checkDigit = (10 - (sum % 10)) % 10;

  // STEP 6: Combine 9 digits + check digit = final 10-digit account number
  const accountNumber = nineDigits + checkDigit.toString();

  return accountNumber;
}

// ─── VERIFY NUBAN ────────────────────────────────────────────
// Verifies that a given account number is a valid NUBAN.
// Useful for validating account numbers before transfers.
// Returns true if valid, false if not.
//
// HOW VERIFICATION WORKS:
// We recompute the check digit from the first 9 digits
// and compare it to the 10th digit.
// If they match — valid. If not — invalid or tampered.

export function verifyNUBAN(accountNumber) {

  // Must be exactly 10 digits
  if (!accountNumber || accountNumber.length !== 10) {
    return false;
  }

  // Must contain only digits
  if (!/^\d{10}$/.test(accountNumber)) {
    return false;
  }

  // Extract the first 9 digits and the check digit
  const nineDigits  = accountNumber.slice(0, 9);
  const givenCheck  = parseInt(accountNumber[9]);

  // Recompute the check digit
  const sum = nineDigits
    .split('')
    .reduce((total, digit, index) => {
      return total + (parseInt(digit) * NUBAN_WEIGHTS[index]);
    }, 0);

  const expectedCheck = (10 - (sum % 10)) % 10;

  // Valid if recomputed check digit matches the given one
  return expectedCheck === givenCheck;
}