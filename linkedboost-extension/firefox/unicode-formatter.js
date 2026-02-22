/**
 * LinkedBoost Unicode Formatter
 * Converts plain text to Unicode mathematical bold/italic/bold-italic characters.
 * LinkedIn doesn't support HTML formatting, so we use Unicode code points.
 */

const UnicodeFormatter = (() => {
  // Mathematical Bold: U+1D400 - U+1D433 (A-Z), U+1D41A - U+1D433 (a-z), U+1D7CE - U+1D7D7 (0-9)
  const BOLD_UPPER_START = 0x1d400;
  const BOLD_LOWER_START = 0x1d41a;
  const BOLD_DIGIT_START = 0x1d7ce;

  // Mathematical Italic: U+1D434 - U+1D467 (A-Z), U+1D44E - U+1D467 (a-z)
  const ITALIC_UPPER_START = 0x1d434;
  const ITALIC_LOWER_START = 0x1d44e;

  // Mathematical Bold Italic: U+1D468 - U+1D49B (A-Z), U+1D482 - U+1D49B (a-z)
  const BOLD_ITALIC_UPPER_START = 0x1d468;
  const BOLD_ITALIC_LOWER_START = 0x1d482;

  // Underline combining character
  const UNDERLINE_CHAR = '\u0332';

  // Strikethrough combining character
  const STRIKETHROUGH_CHAR = '\u0336';

  function _convertChar(char, upperStart, lowerStart, digitStart) {
    const code = char.charCodeAt(0);

    // A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(upperStart + (code - 65));
    }
    // a-z
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(lowerStart + (code - 97));
    }
    // 0-9 (only bold has digit variants)
    if (digitStart && code >= 48 && code <= 57) {
      return String.fromCodePoint(digitStart + (code - 48));
    }

    return char;
  }

  function toBold(text) {
    return Array.from(text)
      .map(char => _convertChar(char, BOLD_UPPER_START, BOLD_LOWER_START, BOLD_DIGIT_START))
      .join('');
  }

  function toItalic(text) {
    return Array.from(text)
      .map(char => {
        // Special case: italic h is U+210E (Planck constant)
        if (char === 'h') return '\u210e';
        return _convertChar(char, ITALIC_UPPER_START, ITALIC_LOWER_START, null);
      })
      .join('');
  }

  function toBoldItalic(text) {
    return Array.from(text)
      .map(char => _convertChar(char, BOLD_ITALIC_UPPER_START, BOLD_ITALIC_LOWER_START, null))
      .join('');
  }

  function toUnderline(text) {
    return Array.from(text)
      .map(char => char + UNDERLINE_CHAR)
      .join('');
  }

  function toStrikethrough(text) {
    return Array.from(text)
      .map(char => char + STRIKETHROUGH_CHAR)
      .join('');
  }

  // Reverse: detect if text uses Unicode math characters and convert back to plain
  function toPlain(text) {
    const result = [];
    for (const char of text) {
      const cp = char.codePointAt(0);

      // Bold uppercase
      if (cp >= BOLD_UPPER_START && cp < BOLD_UPPER_START + 26) {
        result.push(String.fromCharCode(65 + (cp - BOLD_UPPER_START)));
      }
      // Bold lowercase
      else if (cp >= BOLD_LOWER_START && cp < BOLD_LOWER_START + 26) {
        result.push(String.fromCharCode(97 + (cp - BOLD_LOWER_START)));
      }
      // Bold digits
      else if (cp >= BOLD_DIGIT_START && cp < BOLD_DIGIT_START + 10) {
        result.push(String.fromCharCode(48 + (cp - BOLD_DIGIT_START)));
      }
      // Italic uppercase
      else if (cp >= ITALIC_UPPER_START && cp < ITALIC_UPPER_START + 26) {
        result.push(String.fromCharCode(65 + (cp - ITALIC_UPPER_START)));
      }
      // Italic lowercase
      else if (cp >= ITALIC_LOWER_START && cp < ITALIC_LOWER_START + 26) {
        result.push(String.fromCharCode(97 + (cp - ITALIC_LOWER_START)));
      }
      // Italic h special case
      else if (cp === 0x210e) {
        result.push('h');
      }
      // Bold italic uppercase
      else if (cp >= BOLD_ITALIC_UPPER_START && cp < BOLD_ITALIC_UPPER_START + 26) {
        result.push(String.fromCharCode(65 + (cp - BOLD_ITALIC_UPPER_START)));
      }
      // Bold italic lowercase
      else if (cp >= BOLD_ITALIC_LOWER_START && cp < BOLD_ITALIC_LOWER_START + 26) {
        result.push(String.fromCharCode(97 + (cp - BOLD_ITALIC_LOWER_START)));
      }
      // Strip combining underline/strikethrough
      else if (cp === 0x0332 || cp === 0x0336) {
        // skip
      }
      else {
        result.push(char);
      }
    }
    return result.join('');
  }

  // Bullet point helper
  function toBulletList(lines) {
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `\u2022 ${line}`)
      .join('\n');
  }

  // Numbered list helper
  function toNumberedList(lines) {
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, i) => `${i + 1}. ${line}`)
      .join('\n');
  }

  return {
    toBold,
    toItalic,
    toBoldItalic,
    toUnderline,
    toStrikethrough,
    toPlain,
    toBulletList,
    toNumberedList
  };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnicodeFormatter;
}
