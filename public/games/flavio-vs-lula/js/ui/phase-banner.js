/**
 * phase-banner.js
 * Small pill at the top: game title, current phase text and timer.
 *
 * @module games/flavio-vs-lula/ui/phase-banner
 */

import { PHASE } from "../constants.js";
import { formatTime } from "../lib/format.js";

/**
 * @param {import("./dom.js").DuelDom} dom
 * @param {Object} config DUEL_CONFIG
 */
export function createPhaseBanner(dom, config) {
	const L = config.labels;
	dom.gameTitle.textContent = L.title;

	/**
	 * @param {import("../types.js").DuelState} state
	 * @param {number} remainingMs Time left in the phase (Infinity = no limit).
	 */
	function update(state, remainingMs) {
		dom.phaseText.textContent = L[state.phase] || state.phase;

		const showTimer = remainingMs !== Infinity && remainingMs > 0 && state.phase !== PHASE.COOLDOWN;
		dom.phaseTimer.textContent = showTimer ? formatTime(remainingMs) : "";

		dom.phaseBanner.classList.toggle("countdown", state.phase === PHASE.COUNTDOWN);
	}

	return { update };
}
