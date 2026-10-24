/**
 * format.js
 * Small pure helpers shared by the UI modules.
 *
 * @module games/flavio-vs-lula/lib/format
 */

import { LOCALE } from "../constants.js";

/**
 * Escape text that is going to be placed inside `innerHTML`.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Format a count with the overlay locale (1234 → "1.234").
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
	return Math.round(value).toLocaleString(LOCALE);
}

/**
 * Format a remaining time: "2:05" above one minute, "42s" below.
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
	const total = Math.ceil(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

/**
 * Promise that resolves after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
