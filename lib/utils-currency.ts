/**
 * Format a number as Peruvian Soles currency
 * @param amount The numeric amount to format
 * @returns Formatted string like "S/ 1,234.56"
 */
export function formatSoles(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return 'S/ 0.00'
  
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format a number as Soles without currency symbol (for tables)
 * @param amount The numeric amount to format
 * @returns Formatted string like "1,234.56"
 */
export function formatSolesNumber(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  
  return num.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Get Soles symbol
 */
export function getSolesSymbol(): string {
  return 'S/'
}
