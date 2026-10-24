/**
 * result-overlay.js
 * Full-stage result screen shown while the phase is FINISHED:
 * winner (or tie), final score and the top 3 supporters.
 *
 * @module games/flavio-vs-lula/ui/result-overlay
 */

import { PHASE } from "../constants.js";
import { formatNumber } from "../lib/format.js";

/** Background of the badge on a tie. */
const TIE_BADGE_COLOR = "#555";
const TIE_BADGE_EMOJI = "🤝";
const TOP_SUPPORTERS = 3;

/**
 * @param {import("./dom.js").DuelDom} dom
 * @param {Object} config DUEL_CONFIG
 */
export function createResultOverlay(dom, config) {
	const L = config.labels;
	/** phaseStartedAt of the result currently on screen (render once per round). */
	let shownFor = null;

	/** @param {import("../types.js").DuelState} state */
	function show(state) {
		dom.winnerOverlay.classList.remove("hidden");

		const [a, b] = state.sides;
		dom.winnerScore.textContent = `${a.short} ${formatNumber(a.score)} × ${formatNumber(b.score)} ${b.short}`;

		if (state.isTie || !state.winner) {
			dom.winnerBadge.textContent = TIE_BADGE_EMOJI;
			dom.winnerBadge.style.background = TIE_BADGE_COLOR;
			dom.winnerName.textContent = L.tie;
			dom.winnerName.style.color = "#fff";
			dom.winnerSupporters.textContent = "";
			return;
		}

		const winner = state.winner;
		dom.winnerBadge.innerHTML = "";
		if (winner.photo) {
			const img = document.createElement("img");
			img.src = winner.photo;
			img.alt = "";
			dom.winnerBadge.appendChild(img);
		} else {
			dom.winnerBadge.textContent = winner.short.charAt(0).toUpperCase();
		}
		dom.winnerBadge.style.background = winner.color;
		dom.winnerName.textContent = `${winner.name} ${L.wins}`;
		dom.winnerName.style.color = winner.color;

		const supporters = Array.from(winner.supporters.values())
			.sort((x, y) => y.totalContrib - x.totalContrib)
			.slice(0, TOP_SUPPORTERS);

		dom.winnerSupporters.textContent = supporters.length
			? `${L.topSupporters} ${supporters.map((s) => `${s.nickname} (${s.totalContrib})`).join(", ")}`
			: "";
	}

	/** @param {import("../types.js").DuelState} state */
	function update(state) {
		if (state.phase !== PHASE.FINISHED) {
			dom.winnerOverlay.classList.add("hidden");
			shownFor = null;
			return;
		}
		if (shownFor === state.phaseStartedAt) return;
		shownFor = state.phaseStartedAt;
		show(state);
	}

	return { update };
}
