/**
 * Anonymises sensitive data before sending to LLM.
 */
export function anonymiseData(data: any): any {
  if (Array.isArray(data)) return data.map(anonymiseData);
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'email', 'bankAccount'].includes(key)) {
        if (key === 'name') result[key] = `EMP_${String(value).slice(0, 4).toUpperCase()}`;
        else if (key === 'email') result[key] = `masked@example.com`;
        else if (key === 'bankAccount') result[key] = `****${String(value).slice(-4)}`;
      } else {
        result[key] = anonymiseData(value);
      }
    }
    return result;
  }
  return data;
}

export function anonymiseText(text: string): string {
  // Mask email addresses
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
}
