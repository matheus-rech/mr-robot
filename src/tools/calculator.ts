import { Tool } from './base';
import vm from 'vm';

/**
 * Safe calculator tool that evaluates mathematical expressions.
 * Uses VM sandbox to prevent code execution exploits.
 */
export class CalculatorTool implements Tool {
  name = 'calculator';
  description = 'Perform mathematical calculations safely';

  async execute(args: string): Promise<string> {
    try {
      // Block only genuinely dangerous tokens and prototype/constructor escape paths.
      // Allow intended mathematical calls such as sqrt(16), pow(2, 8), and Math.floor(4.7).
      const dangerous = /(?:^|[^\w$])(require|import|process|eval|Function|constructor|__proto__|prototype|globalThis|global|module)(?:[^\w$]|$)/i;
      if (dangerous.test(args)) {
        return 'Error: Expression contains forbidden patterns';
      }

      // Create a safe sandbox with only Math functions
      const sandbox = {
        Math,
        abs: Math.abs,
        acos: Math.acos,
        asin: Math.asin,
        atan: Math.atan,
        atan2: Math.atan2,
        ceil: Math.ceil,
        cos: Math.cos,
        exp: Math.exp,
        floor: Math.floor,
        log: Math.log,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        random: Math.random,
        round: Math.round,
        sin: Math.sin,
        sqrt: Math.sqrt,
        tan: Math.tan,
        PI: Math.PI,
        E: Math.E,
        result: null as any,
      };

      // Wrap expression in assignment to capture result
      const code = `result = ${args};`;
      const script = new vm.Script(code);
      const context = vm.createContext(sandbox);

      script.runInContext(context, { timeout: 1000 });

      const result = sandbox.result;

      if (typeof result === 'number') {
        if (isNaN(result)) {
          return 'Error: Result is NaN';
        }
        if (!isFinite(result)) {
          return 'Error: Result is infinite';
        }
        return result.toString();
      }

      return String(result);

    } catch (error: any) {
      return `Calculation error: ${error.message}`;
    }
  }
}
