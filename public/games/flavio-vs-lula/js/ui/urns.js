/**
 * urns.js
 * The two voting machines (urnas) under the score cards. On every score event
 * the hand types the candidate number, presses CONFIRMA and the screen shows
 * "FIM · CONFIRMADO · +N ponto(s)".
 *
 * The animation is purely visual: votes wait in a per-urna queue and play
 * faster when many arrive at once; the score itself is never delayed.
 *
 * @module games/flavio-vs-lula/ui/urns
 */

import { HAND, URN, URN_STATE } from "../constants.js";
import { escapeHtml, sleep } from "../lib/format.js";
import { HAND_SVG } from "./hand-svg.js";
import { getSideNumber } from "./side-cards.js";

/**
 * Runtime data of one urna.
 * @typedef {Object} Urn
 * @property {HTMLElement} el
 * @property {HTMLElement} hand
 * @property {Record<string, HTMLElement>} keys   Keypad keys by character.
 * @property {HTMLElement} confirmBtn
 * @property {HTMLElement[]} digitEls
 * @property {HTMLElement} endSub
 * @property {HTMLElement} keypad
 * @property {string} number                      Candidate number to type.
 * @property {number[]} queue                     Points of the votes waiting to play.
 * @property {boolean} busy
 */

/**
 * HTML of one urna.
 * @param {Object} config DUEL_CONFIG
 * @param {import("../types.js").SideConfig} side
 * @returns {string}
 */
function urnTemplate(config, side) {
	const L = config.labels;
	const number = getSideNumber(side);
	const digits = number
		.split("")
		.map(() => `<div class="vs-digit"></div>`)
		.join("");
	const keys = URN.keys
		.split("")
		.map((k) => `<div class="key" data-key="${k}">${k}</div>`)
		.join("");
	const photo = side.photo ? `<img src="${escapeHtml(side.photo)}" alt="" />` : "";

	return (
		`<div class="urn-top"></div>` +
		`<div class="urn-body">` +
		`<div class="urn-brand">${escapeHtml(L.urnBrand)}</div>` +
		`<div class="urn-screen"><div class="urn-screen-inner">` +
		`<div class="vote-screen">` +
		`<div class="vs-head">${escapeHtml(L.voteFor)}</div>` +
		`<div class="vs-digits">${digits}</div>` +
		`<div class="vs-num">${escapeHtml(L.numberHint)}</div>` +
		`<div class="cand">${photo}<b>${escapeHtml(number)}</b></div>` +
		`<div class="vs-foot">${escapeHtml(L.confirmHint)}</div>` +
		`</div>` +
		`<div class="end-screen"><div class="end-title">${escapeHtml(L.end)}</div><div class="end-sub"></div></div>` +
		`</div></div>` +
		`<div class="urn-keypad">` +
		`<div class="keys">${keys}</div>` +
		`<div class="keys-actions">` +
		`<div class="act blank">${escapeHtml(L.btnBlank)}</div>` +
		`<div class="act fix">${escapeHtml(L.btnFix)}</div>` +
		`<div class="act confirm">${escapeHtml(L.btnConfirm)}</div>` +
		`</div></div>` +
		`</div>` +
		`<div class="urn-hand">${HAND_SVG}</div>`
	);
}

/**
 * @param {HTMLElement} container #urns
 * @param {Object} config DUEL_CONFIG
 */
export function createUrns(container, config) {
	const L = config.labels;

	/** @type {Urn[]} */
	const urns = config.sides.map((side) => {
		const el = document.createElement("div");
		el.className = "urn";
		el.dataset.state = URN_STATE.IDLE;
		el.style.setProperty("--side-color", side.color);
		el.innerHTML = urnTemplate(config, side);
		container.appendChild(el);

		const keys = {};
		el.querySelectorAll(".key").forEach((k) => (keys[k.dataset.key] = k));

		return {
			el,
			hand: el.querySelector(".urn-hand"),
			keys,
			confirmBtn: el.querySelector(".act.confirm"),
			digitEls: Array.from(el.querySelectorAll(".vs-digit")),
			endSub: el.querySelector(".end-sub"),
			keypad: el.querySelector(".urn-keypad"),
			number: getSideNumber(side),
			queue: [],
			busy: false,
		};
	});

	/**
	 * Put the fingertip over `target`, or on the resting spot when null.
	 * @param {Urn} urn
	 * @param {HTMLElement|null} target element inside the urna
	 */
	function moveHand(urn, target) {
		const urnRect = urn.el.getBoundingClientRect();
		const handW = urn.hand.offsetWidth;
		const handH = urn.hand.offsetHeight;
		let x;
		let y;
		if (target) {
			const r = target.getBoundingClientRect();
			x = r.left + r.width / 2 - urnRect.left;
			y = r.top + r.height * URN.keyTargetY - urnRect.top;
		} else {
			const kp = urn.keypad.getBoundingClientRect();
			x = kp.right - urnRect.left - handW * HAND.restInsetX;
			y = urnRect.height * HAND.restY;
		}
		urn.hand.style.left = `${x - handW * HAND.tipX}px`;
		urn.hand.style.top = `${y - handH * HAND.tipY}px`;
	}

	/** Highlight a key / button for a moment while the hand "presses" it. */
	function tap(urn, el) {
		el.classList.add("pressed");
		urn.hand.classList.add("tap");
		setTimeout(() => {
			el.classList.remove("pressed");
			urn.hand.classList.remove("tap");
		}, URN.tapMs);
	}

	/**
	 * Type the number, confirm, show "FIM".
	 * @param {Urn} urn
	 * @param {number} points
	 * @param {number} speed Multiplier of every step duration (lower = faster).
	 */
	async function playVote(urn, points, speed) {
		const step = URN.stepMs;
		urn.el.dataset.state = URN_STATE.TYPING;
		urn.digitEls.forEach((d) => (d.textContent = ""));

		for (let i = 0; i < urn.number.length; i++) {
			const char = urn.number[i];
			const key = urn.keys[char];
			if (key) {
				moveHand(urn, key);
				await sleep(step.move * speed);
				tap(urn, key);
			}
			if (urn.digitEls[i]) urn.digitEls[i].textContent = char;
			await sleep(step.digit * speed);
		}

		moveHand(urn, urn.confirmBtn);
		await sleep(step.move * speed);
		tap(urn, urn.confirmBtn);
		urn.el.dataset.state = URN_STATE.CONFIRM;
		await sleep(step.confirm * speed);

		urn.endSub.textContent = `${L.confirmed} · +${points} ${L.pointWord(points)}`;
		urn.el.dataset.state = URN_STATE.DONE;
		await sleep(step.done * speed);
	}

	/** Speed factor for the current backlog. */
	function speedFor(backlog) {
		if (backlog > URN.fastBacklog) return URN.speed.fast;
		if (backlog > URN.mediumBacklog) return URN.speed.medium;
		return URN.speed.normal;
	}

	/** Play every queued vote of an urna, one after the other. */
	async function drain(urn) {
		if (urn.busy) return;
		urn.busy = true;
		try {
			while (urn.queue.length) {
				const points = urn.queue.shift();
				await playVote(urn, points, speedFor(urn.queue.length));
			}
		} finally {
			urn.el.dataset.state = URN_STATE.IDLE;
			urn.digitEls.forEach((d) => (d.textContent = ""));
			moveHand(urn, null);
			urn.busy = false;
		}
	}

	/**
	 * Queue one vote animation (the score was already counted by the engine).
	 * @param {number} sideIdx
	 * @param {number} points Points shown on the "FIM" screen.
	 */
	function enqueueVote(sideIdx, points) {
		const urn = urns[sideIdx];
		if (!urn) return;
		urn.queue.push(points);
		if (urn.queue.length > URN.maxQueue) urn.queue.shift(); // purely visual: never lag far behind
		drain(urn);
	}

	/** Put idle hands back on the resting spot (call after a resize). */
	function relayout() {
		urns.forEach((urn) => {
			if (!urn.busy) moveHand(urn, null);
		});
	}

	relayout();
	return { enqueueVote, relayout };
}
