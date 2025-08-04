/**
 * Utility functions for formatting blockchain data
 */

/**
 * Format long hex values (addresses, hashes, IDs) into shortened form
 * Converts "0x1234567890abcdef1234567890abcdef12345678" to "0x0...45678"
 * @param hexValue - The hex string to format
 * @param prefixLength - Number of characters to show after 0x (default: 0)
 * @param suffixLength - Number of characters to show at the end (default: 5)
 * @returns Formatted hex string or original input if not valid hex
 */
export function formatHexValue(
  hexValue: string | undefined | null, 
  prefixLength: number = 2, 
  suffixLength: number = 5
): string | undefined | null {
  // Return original value if null/undefined/empty or not a string
  if (!hexValue || typeof hexValue !== 'string') {
    return hexValue;
  }

  // Return original value if not a hex string
  if (!hexValue.startsWith('0x')) {
    return hexValue;
  }

  // Remove 0x prefix for processing
  const hexPart = hexValue.slice(2);

  // If the hex part is too short to abbreviate, return as-is
  if (hexPart.length <= prefixLength + suffixLength + 3) {
    return hexValue;
  }

  // Create abbreviated format
  const prefix = prefixLength > 0 ? hexPart.slice(0, prefixLength) : '0';
  const suffix = hexPart.slice(-suffixLength);
  
  return `0x${prefix}...${suffix}`;
}

/**
 * Format blockchain addresses (commonly 40 hex characters)
 * @param address - The address to format
 * @returns Formatted address like "0x0...45678" or original input
 */
export function formatAddress(address: string | undefined | null): string | undefined | null {
  return formatHexValue(address, 2, 5);
}

/**
 * Format transaction hashes and block hashes (commonly 64 hex characters)
 * @param hash - The hash to format
 * @returns Formatted hash like "0x0...89abc" or original input
 */
export function formatHash(hash: string | undefined | null): string | undefined | null {
  return formatHexValue(hash, 2, 5);
}

/**
 * Format transaction/block IDs
 * @param id - The ID to format
 * @returns Formatted ID or original input
 */
export function formatId(id: string | undefined | null): string | undefined | null {
  return formatHexValue(id, 2, 5);
}

/**
 * Format contract bytecode for display (show first few and last few characters)
 * @param bytecode - The bytecode to format
 * @returns Formatted bytecode like "0x608060...1234" or original input
 */
export function formatBytecode(bytecode: string | undefined | null): string | undefined | null {
  return formatHexValue(bytecode, 6, 4);
} 