/**
 * logger.js
 * Console logger that can be switched off with `config.debug`.
 *
 * @module games/flavio-vs-lula/lib/logger
 */

/**
 * @param {string} tag      Prefix shown in every line, e.g. "DUEL".
 * @param {boolean} enabled When false, `log` does nothing (errors are always shown).
 * @returns {{log: (...args: unknown[]) => void, error: (...args: unknown[]) => void}}
 */
export function createLogger(tag, enabled) {
	return {
		log: (...args) => {
			if (enabled) console.log(`[${tag}]`, ...args);
		},
		error: (...args) => console.error(`[${tag}]`, ...args),
	};
}
