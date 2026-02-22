/* =========================================================
   csv-parser.js  —  Lightweight CSV parser for ColdFlow
   Injected before content.js so the helper is available.
   ========================================================= */

// eslint-disable-next-line no-unused-vars
const ColdFlowCSV = (() => {
  'use strict';

  /**
   * Parse a CSV string into an array of objects.
   * Handles quoted fields, embedded commas, and newlines inside quotes.
   *
   * @param {string} raw  — The raw CSV text
   * @returns {{ headers: string[], rows: Object[] }}
   */
  function parse(raw) {
    if (!raw || typeof raw !== 'string') {
      return { headers: [], rows: [] };
    }

    const lines = _splitLines(raw.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = _parseLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = _parseLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0].trim() === '')) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || '').trim();
      });
      rows.push(obj);
    }

    return { headers, rows };
  }

  /**
   * Split raw text into logical CSV lines, handling quoted newlines.
   */
  function _splitLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        current += ch;
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
        lines.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.length > 0) lines.push(current);
    return lines;
  }

  /**
   * Parse a single CSV line into an array of field values.
   */
  function _parseLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  }

  /**
   * Validate that required columns exist.
   * @param {string[]} headers
   * @returns {{ valid: boolean, missing: string[] }}
   */
  function validate(headers) {
    const required = ['email'];
    const missing = required.filter(r => !headers.includes(r));
    return { valid: missing.length === 0, missing };
  }

  /**
   * Map common header aliases to canonical names.
   */
  function normalizeHeaders(headers) {
    const aliases = {
      'first name': 'first_name',
      'firstname': 'first_name',
      'first': 'first_name',
      'last name': 'last_name',
      'lastname': 'last_name',
      'last': 'last_name',
      'e-mail': 'email',
      'email address': 'email',
      'company name': 'company',
      'organization': 'company',
      'org': 'company',
      'job title': 'title',
      'role': 'title',
      'position': 'title',
      'custom 1': 'custom1',
      'custom 2': 'custom2',
      'custom 3': 'custom3'
    };
    return headers.map(h => {
      const lower = h.toLowerCase();
      return aliases[lower] || lower;
    });
  }

  return { parse, validate, normalizeHeaders };
})();
