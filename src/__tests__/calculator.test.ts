import { CalculatorTool } from '../tools/calculator';

describe('CalculatorTool', () => {
  let calculator: CalculatorTool;

  beforeEach(() => {
    calculator = new CalculatorTool();
  });

  test('should perform basic arithmetic', async () => {
    expect(await calculator.execute('2 + 2')).toBe('4');
    expect(await calculator.execute('10 - 5')).toBe('5');
    expect(await calculator.execute('3 * 4')).toBe('12');
    expect(await calculator.execute('15 / 3')).toBe('5');
  });

  test('should handle complex expressions', async () => {
    expect(await calculator.execute('2 + 2 * 5')).toBe('12');
    expect(await calculator.execute('(2 + 2) * 5')).toBe('20');
    expect(await calculator.execute('sqrt(16)')).toBe('4');
    expect(await calculator.execute('pow(2, 8)')).toBe('256');
  });

  test('should use Math functions', async () => {
    expect(await calculator.execute('Math.floor(4.7)')).toBe('4');
    expect(await calculator.execute('Math.ceil(4.3)')).toBe('5');
    expect(await calculator.execute('Math.max(1, 5, 3)')).toBe('5');
    expect(await calculator.execute('Math.min(1, 5, 3)')).toBe('1');
  });

  test('should reject dangerous expressions', async () => {
    const result = await calculator.execute('require("fs")');
    expect(result).toContain('forbidden patterns');
  });

  test('should handle errors gracefully', async () => {
    const result = await calculator.execute('1 / 0');
    expect(result).toContain('infinite');
  });
});
