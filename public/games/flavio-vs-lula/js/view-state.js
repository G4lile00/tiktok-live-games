/**
 * view-state.js
 * Values that exist only on screen: counters that ease toward the real score,
 * the share shown on the bars and the gift counters.
 *
 * @module games/flavio-vs-lula/view-state
 */

import { EASING } from "./constants.js";

/** @typedef {import("./types.js").ViewState} ViewState */

/**
 * @param {{sides: unknown[]}} config
 * @returns {ViewState}
 */
export function createViewState(config) {
	return {
		shownScore: config.sides.map(() => 0),
		shownShare: EASING.initialShare,
		presents: config.sides.map(() => 0),
	};
}

/**
 * Reset everything for a new round.
 * @param {ViewState} view
 */
export function resetViewState(view) {
	view.shownScore.fill(0);
	view.shownShare = EASING.initialShare;
	view.presents.fill(0);
}

/**
 * Ease the shown values toward the real ones (call once per frame).
 * @param {ViewState} view
 * @param {import("./types.js").DuelState} state
 * @param {number} realShare Share of the left side, 0–1.
 */
export function easeViewState(view, state, realShare) {
	state.sides.forEach((side, i) => {
		const diff = side.score - view.shownScore[i];
		view.shownScore[i] =
			Math.abs(diff) < EASING.snapDistance ? side.score : view.shownScore[i] + diff * EASING.score;
	});
	view.shownShare += (realShare - view.shownShare) * EASING.share;
}
