/**
 * Normalizes a phone number to a standard format.
 * - Removes non-digit characters (except +).
 * - Converts country code prefixes to 09.
 * - Ensures 11-digit or 9-digit format starts with 09.
 */
export const normalizePhone = (phone: string): string => {
    // 1. Remove all non-digit characters (including +)
    let cleaned = phone.replace(/\D/g, '');

    // 2. Handle country code prefixes
    // If starts with 959... (e.g. 959xxxxxxxxx) -> replace 959 with 09
    if (cleaned.startsWith('959')) {
        cleaned = '09' + cleaned.substring(3);
    }
    // If starts with 9... (e.g. 9xxxxxxxxx) AND length is roughly 7-9 digits? 
    // Wait, 9xxxxxxxxx (9 digits) -> 09xxxxxxxxx
    else if (cleaned.startsWith('9') && cleaned.length >= 7 && !cleaned.startsWith('09')) {
        // If starts with 9 but not 09, prepend 0
        cleaned = '0' + cleaned;
    }
    // New case: 409274865 (starts with 4, length 9) -> prepend 09
    // Generally, if length is 7-9 and doesn't start with 09, prepend 09?
    // Most Myanmar mobile numbers without 09 are 9 digits (starting with 9, 7, 4, etc.)
    // E.g. Ooredoo: 9xxxxxxxxx, Telenor: 7xxxxxxxx, MPT: 4xxxxxxxx/2xxxxxxxx
    else if (cleaned.length >= 7 && cleaned.length <= 9 && !cleaned.startsWith('09')) {
        cleaned = '09' + cleaned;
    }

    return cleaned;
};
