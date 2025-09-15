/**
 * Sequential ID generation utility for manufacturing workflow
 * Generates formatted IDs like WO-2025-0001, QC-2025-0001, etc.
 */

export function nextSeq(prefix: string, lastNumber?: string): string {
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;
  
  // Extract sequence number from last number if it matches current year pattern
  let nextSeq = 1;
  if (lastNumber && lastNumber.startsWith(yearPrefix)) {
    const parts = lastNumber.split('-');
    if (parts.length >= 3) {
      const lastSeqNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeqNum)) {
        nextSeq = lastSeqNum + 1;
      }
    }
  }
  
  // Format as 4-digit padded number
  return `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generate next work order number
 * Format: WO-YYYY-0001
 */
export function getNextWorkOrderNumber(lastOrderNumber?: string): string {
  return nextSeq('WO', lastOrderNumber);
}

/**
 * Generate next quality check number  
 * Format: QC-YYYY-0001
 */
export function getNextQualityCheckNumber(lastCheckNumber?: string): string {
  return nextSeq('QC', lastCheckNumber);
}

/**
 * Generate next production task number
 * Format: PT-YYYY-0001  
 */
export function getNextProductionTaskNumber(lastTaskNumber?: string): string {
  return nextSeq('PT', lastTaskNumber);
}

/**
 * Extract year and sequence from formatted number
 */
export function parseSequentialId(formattedId: string): { prefix: string; year: number; sequence: number } | null {
  const parts = formattedId.split('-');
  if (parts.length !== 3) return null;
  
  const [prefix, yearStr, seqStr] = parts;
  const year = parseInt(yearStr, 10);
  const sequence = parseInt(seqStr, 10);
  
  if (isNaN(year) || isNaN(sequence)) return null;
  
  return { prefix, year, sequence };
}