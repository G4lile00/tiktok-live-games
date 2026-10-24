/**
 * events.js
 * Connects the TikTok bridge (Socket.io → events) to the DuelEngine.
 * Only place that knows the shape of the raw TikTok payloads.
 *
 * @module games/flavio-vs-lula/bridge/events
 */

import { createLogger } from "../lib/logger.js";

/** @typedef {import("../types.js").GiftEvent} GiftEvent */

/** Name shown for gifts sent by users without a nickname. */
const ANONYMOUS_NICKNAME = "Anônimo";
const ANONYMOUS_ID = "anonymous";

/**
 * Normalize a raw gift payload from the bridge.
 * @param {any} data
 * @returns {GiftEvent}
 */
export function normalizeGift(data) {
	return {
		giftId: Number(data.giftId ?? 0),
		giftName: data.giftName ?? data.gift?.name ?? "",
		giftValue: Number(data.giftValue ?? data.gift?.diamondCount ?? 0),
		repeatCount: Number(data.repeatCount ?? 1),
		user: {
			uniqueId: data.user?.uniqueId ?? ANONYMOUS_ID,
			nickname: data.user?.nickname ?? ANONYMOUS_NICKNAME,
		},
	};
}

/**
 * Forward bridge events to the engine.
 * @param {{on: (event: string, cb: (data: any) => void) => void}} bridge window.TikTokBridge
 * @param {import("../engine/duel-engine.js").DuelEngine} engine
 * @param {{debug?: boolean}} config
 */
export function connectBridgeToEngine(bridge, engine, config) {
	const logger = createLogger("DUEL", Boolean(config.debug));

	bridge.on("gift", (data) => {
		logger.log("Gift recebido:", data);
		const gift = normalizeGift(data);
		logger.log("Gift normalizado:", gift);
		engine.handleGift(gift);
	});

	bridge.on("chat", (data) => {
		logger.log("Chat recebido:", data);
		engine.handleChat(data);
	});
}
