/**
 * side-cards.js
 * The two score cards (blue / red): number, name, big counter, progress bar,
 * percentage, rounds won, gift counter and gift legend.
 *
 * @module games/flavio-vs-lula/ui/side-cards
 */

import { escapeHtml, formatNumber } from "../lib/format.js";

/** @typedef {import("../types.js").SideConfig} SideConfig */

/**
 * Candidate number shown on the card / typed on the urna.
 * @param {SideConfig} side
 * @returns {string}
 */
export function getSideNumber(side) {
	return String(side.number ?? side.id + 1);
}

/**
 * HTML of one card.
 * @param {Object} config DUEL_CONFIG
 * @param {SideConfig} side
 * @returns {string}
 */
function cardTemplate(config, side) {
	const L = config.labels;
	const avatar = side.photo
		? `<img src="${escapeHtml(side.photo)}" alt="" />`
		: escapeHtml(side.short.charAt(0).toUpperCase());

	const gifts = config
		.getSideGifts(side.id)
		.map((g) => `<span class="gift-chip">${g.emoji}<small>${g.coins}</small></span>`)
		.join("");

	const voteHint =
		config.chatPoints > 0
			? `<span class="side-vote">${escapeHtml(L.voteHint(getSideNumber(side)))}</span>`
			: "";

	return (
		`<div class="side-top">` +
		`<span class="side-number">${escapeHtml(getSideNumber(side))}</span>` +
		`<span class="lead-badge">${escapeHtml(L.leading)}</span>` +
		`<span class="side-name">${escapeHtml(side.name)}</span>` +
		`<div class="side-avatar">${avatar}</div>` +
		`</div>` +
		`<div class="side-score" data-role="score">0</div>` +
		`<div class="side-label">${escapeHtml(L.scoreLabel)}</div>` +
		`<div class="side-bar"><i data-role="bar"></i></div>` +
		`<div class="side-foot">` +
		`<span class="side-share" data-role="share">50%</span>` +
		`<span class="side-rounds" data-role="rounds">${escapeHtml(L.rounds)}: 0</span>` +
		`<span class="side-presents">🎁 <span data-role="presents">0</span> ${escapeHtml(L.presents)}</span>` +
		`</div>` +
		`<div class="side-gifts">${voteHint}</div>`
	);
}

/**
 * @param {HTMLElement} container #sideCards
 * @param {Object} config DUEL_CONFIG
 */
export function createSideCards(container, config) {
	const L = config.labels;

	/** @type {{card: HTMLElement, score: HTMLElement, bar: HTMLElement, share: HTMLElement, rounds: HTMLElement, presents: HTMLElement}[]} */
	const cards = config.sides.map((side) => {
		const card = document.createElement("div");
		card.className = "side-card";
		card.id = `side-card-${side.id}`;
		card.style.setProperty("--side-color", side.color);
		card.innerHTML = cardTemplate(config, side);
		container.appendChild(card);

		const part = (role) => /** @type {HTMLElement} */ (card.querySelector(`[data-role="${role}"]`));
		return {
			card,
			score: part("score"),
			bar: part("bar"),
			share: part("share"),
			rounds: part("rounds"),
			presents: part("presents"),
		};
	});

	/**
	 * The big counter of a side (anchor of the "+N" popups).
	 * @param {number} sideIdx
	 * @returns {HTMLElement|null}
	 */
	function getScoreElement(sideIdx) {
		return cards[sideIdx]?.score ?? null;
	}

	/**
	 * Small "pop" animation of the counter.
	 * @param {number} sideIdx
	 */
	function bump(sideIdx) {
		const el = getScoreElement(sideIdx);
		if (!el) return;
		el.classList.remove("bump");
		void el.offsetWidth; // restart the CSS animation
		el.classList.add("bump");
	}

	/**
	 * Refresh counters, percentages, rounds, gifts and the leader highlight.
	 * @param {import("../types.js").DuelState} state
	 * @param {import("../types.js").ViewState} view
	 */
	function update(state, view) {
		const leftPct = Math.round(view.shownShare * 100);

		state.sides.forEach((side, i) => {
			const els = cards[i];
			const pct = i === 0 ? leftPct : 100 - leftPct;

			els.score.textContent = formatNumber(view.shownScore[i]);
			els.share.textContent = `${pct}%`;
			els.bar.style.width = `${pct}%`;
			els.rounds.textContent = `${L.rounds}: ${state.roundsWon[side.id]}`;
			els.presents.textContent = formatNumber(view.presents[i]);

			const other = state.sides[1 - i];
			els.card.classList.toggle("leading", side.score !== other.score && side.score > other.score);
		});
	}

	return { getScoreElement, bump, update };
}
