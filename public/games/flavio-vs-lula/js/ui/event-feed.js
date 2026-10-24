/**
 * event-feed.js
 * Last gifts / votes at the bottom. Uses textContent only, so nicknames can
 * never inject HTML.
 *
 * @module games/flavio-vs-lula/ui/event-feed
 */

import { EVENT_TYPE, FEED } from "../constants.js";

/**
 * @param {HTMLElement} container #eventFeed
 * @param {Object} config DUEL_CONFIG
 */
export function createEventFeed(container, config) {
	const L = config.labels;
	let lastKey = "";

	/** @param {import("../types.js").RecentEvent[]} events */
	function render(events) {
		container.innerHTML = "";
		events.forEach((evt) => {
			const el = document.createElement("div");
			el.className = `feed-item ${evt.type}`;
			if (evt.type === EVENT_TYPE.GIFT || evt.type === EVENT_TYPE.VOTE) {
				el.style.borderLeftColor = evt.color;
				el.textContent = `${evt.giftEmoji} ${evt.nickname} → ${evt.sideShort} (+${evt.points} ${L.points})`;
			} else if (evt.type === EVENT_TYPE.CHAT) {
				el.textContent = `💬 ${evt.nickname}: ${evt.text}`;
			}
			container.appendChild(el);
		});
	}

	/**
	 * Re-render only when something new arrived.
	 * @param {import("../types.js").DuelState} state
	 */
	function update(state) {
		const newest = state.recentEvents[0];
		const key = newest ? `${newest.timestamp}-${state.recentEvents.length}` : "";
		if (key === lastKey) return;
		lastKey = key;
		render(state.recentEvents.slice(0, FEED.visibleEvents));
	}

	return { update };
}
