const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const COMMAND_LETTER = /[MLHVCSQTAZ]/i;
const WHITESPACE = /\s/;
const ERROR_CONTEXT_LENGTH = 12;

export class PathScanner {
  private index = 0;

  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  isDone(): boolean {
    this.skipWhitespace();
    return this.index >= this.source.length;
  }

  readCommand(): string | null {
    this.skipWhitespace();
    const letter = this.source.charAt(this.index);
    if (!COMMAND_LETTER.test(letter)) return null;
    this.index++;
    return letter;
  }

  readNumber(): number {
    this.skipSeparator();
    const match = NUMBER_PATTERN.exec(this.source.slice(this.index));
    if (match === null) throw this.error('a number');
    this.index += match[0].length;
    return Number(match[0]);
  }

  readFlag(): boolean {
    this.skipSeparator();
    const flag = this.source.charAt(this.index);
    if (flag !== '0' && flag !== '1') throw this.error('an arc flag (0 or 1)');
    this.index++;
    return flag === '1';
  }

  error(expected: string): SyntaxError {
    const near = this.source.slice(this.index, this.index + ERROR_CONTEXT_LENGTH);
    const context = near === '' ? ' (end of data)' : ` ("${near}")`;
    return new SyntaxError(`expected ${expected} at character ${this.index}${context}`);
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && WHITESPACE.test(this.source.charAt(this.index))) {
      this.index++;
    }
  }

  private skipSeparator(): void {
    this.skipWhitespace();
    if (this.source.charAt(this.index) !== ',') return;
    this.index++;
    this.skipWhitespace();
  }
}
