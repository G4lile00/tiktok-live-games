/**
 * tiktokEventNormalizer.js
 * Pure functions that normalize raw tiktok-live-connector payloads
 * into a consistent shape for downstream consumers (games, bridge, debug).
 *
 * @module lib/tiktokEventNormalizer
 */

/**
 * Extract consistent user object from raw TikTok data.
 * @param {Object} raw - Raw event data from tiktok-live-connector
 * @returns {{uniqueId: string, nickname: string, profilePictureUrl: string}}
 */
export function normalizeUser(raw) {
	// v2 events nest the user under `raw.user`; v1 events were flat.
	const u = raw?.user ?? raw ?? {};
	return {
		uniqueId: u.uniqueId || "",
		nickname: u.nickname || u.uniqueId || "Anonymous",
		profilePictureUrl:
			u.profilePictureUrl ||
			u.profilePicture?.url ||
			u.profilePicture?.urls?.[0] ||
			"",
	};
}

/**
 * Normalize chat event.
 * @param {Object} raw - Raw chat event
 * @returns {{user: Object, comment: string, timestamp: number}}
 */
export function normalizeChat(raw) {
    return {
        user: normalizeUser(raw),

        comment: String(
            raw?.comment ??
            raw?.content ??
            raw?.message ??
            raw?.text ??
            ""
        ).trim().toLowerCase(),

        timestamp: Date.now(),
    };
}
/**
 * Normalize like event.
 * @param {Object} raw - Raw like event
 * @returns {{user: Object, likeCount: number, totalLikeCount: number, timestamp: number}}
 */
export function normalizeLike(raw) {
	return {
		user: normalizeUser(raw),
		likeCount: raw.likeCount || 0,
		totalLikeCount: raw.totalLikeCount || 0,
		timestamp: Date.now(),
	};
}

/**
 * Normalize share event.
 * @param {Object} raw - Raw social event (filtered for shares only)
 * @returns {{user: Object, timestamp: number}}
 */
export function normalizeShare(raw) {
	return {
		user: normalizeUser(raw),
		timestamp: Date.now(),
	};
}

/**
 * Categorize gift by diamond value.
 * @param {number} value - Diamond count
 * @returns {"small"|"medium"|"large"}
 */
export function categorizeGift(value) {
	if (value >= 100) return "large";
	if (value >= 10) return "medium";
	return "small";
}

/**
 * Normalize gift event — the canonical shape for all consumers.
 * Adds giftId which was previously missing.
 *
 * @param {Object} raw - Raw gift event from tiktok-live-connector
 * @returns {{user: Object, giftId: number, giftName: string, giftValue: number, repeatCount: number, giftType: string, timestamp: number}}
 */
export function normalizeGift(raw = {}) {
    // Compatibilidade com diferentes formatos do TikTok Live Connector.
    const gift = raw.gift ?? {};
    const details = raw.giftDetails ?? {};
    const ext = raw.extendedGiftInfo ?? {};

    const toNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === "") {
            return fallback;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };

    // ID original do presente: ex. Rose = 5655.
    const giftId =
        raw.giftId ??
        gift.id ??
        details.giftId ??
        details.id ??
        ext.giftId ??
        ext.id ??
        0;

    // Nome do presente.
    const giftName =
        gift.name ??
        details.giftName ??
        details.name ??
        ext.name ??
        raw.giftName ??
        "Unknown Gift";

    // Valor unitário em diamantes.
    const giftValue = toNumber(
        gift.diamondCount ??
        details.diamondCount ??
        ext.diamond_count ??
        ext.diamondCount ??
        raw.diamondCount ??
        raw.giftValue,
        0
    );

    const repeatCount = Math.max(
        1,
        toNumber(raw.repeatCount, 1)
    );

    // Tipo original do presente, conforme os dados da biblioteca.
    const rawGiftType =
        gift.type ??
        details.giftType ??
        raw.giftType ??
        null;

    return {
        user: normalizeUser(raw),

        giftId: String(giftId),
        giftName: String(giftName),

        giftValue,

        repeatCount,

        // Valor total de diamantes para a quantidade recebida.
        totalValue: giftValue * repeatCount,

        // Mantém o tipo original separado da classificação por valor.
        giftType: rawGiftType === null
            ? categorizeGift(giftValue)
            : String(rawGiftType),

        // Classificação original, caso o frontend já utilize esse conceito.
        giftCategory: categorizeGift(giftValue),

        repeatEnd: Boolean(raw.repeatEnd),

        isStreakable:
            gift.combo === true ||
            Number(rawGiftType) === 1,

        timestamp: Date.now(),
    };
}
