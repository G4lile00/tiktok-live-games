/**
 * status-bar.js
 * Top bar: TOTAL | DIFERENÇA | "NN NA FRENTE".
 *
 * @module games/flavio-vs-lula/ui/status-bar
 */

import { NEUTRAL_COLOR } from "../constants.js";
import { formatNumber } from "../lib/format.js";
import { getSideNumber } from "./side-cards.js";

/**
 * @param {import("./dom.js").DuelDom} dom
 * @param {Object} config DUEL_CONFIG
 */
export function createStatusBar(dom, config) {
	const L = config.labels;
	dom.totalLabel.textContent = L.total;
	dom.diffLabel.textContent = L.diff;

	/**
	 * @param {import("../types.js").DuelState} state
	 * @param {import("../types.js").ViewState} view
	 */
	function update(state, view) {
		const [a, b] = state.sides;

		dom.totalScore.textContent = formatNumber(view.shownScore[0] + view.shownScore[1]);
		dom.diffScore.textContent = formatNumber(Math.abs(view.shownScore[0] - view.shownScore[1]));

		if (a.score === b.score) {
			dom.leaderPill.style.setProperty("--side-color", NEUTRAL_COLOR);
			dom.leaderPill.textContent = L.tie;
			return;
		}
		const leader = a.score > b.score ? a : b;
		dom.leaderPill.style.setProperty("--side-color", leader.color);
		dom.leaderPill.textContent = `${getSideNumber(leader)} ${L.leading}`;
	}

	return { update };
}
