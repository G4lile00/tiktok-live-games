/**
 * game.js
 * Flavio vs Lula — Canvas renderer + TikTokBridge wiring.
 * Reads state from DuelEngine, draws the floating points on Canvas and updates
 * the DOM HUD: scoreboard cards, urnas (voting machines) with the typing hand,
 * event feed and result screen.
 *
 * @module games/flavio-vs-lula/game
 */

(() => {
	// ==========================================
	// SETUP
	// ==========================================
	const config = window.DUEL_CONFIG;
	const engine = new DuelEngine(config);
	const L = config.labels;

	const canvas = document.getElementById("duelCanvas");
	const ctx = canvas.getContext("2d");

	// DOM HUD elements
	const phaseBanner = document.getElementById("phaseBanner");
	const gameTitle = document.getElementById("gameTitle");
	const phaseText = document.getElementById("phaseText");
	const phaseTimer = document.getElementById("phaseTimer");
	const sideCardsDiv = document.getElementById("sideCards");
	const urnsDiv = document.getElementById("urns");
	const totalLabel = document.getElementById("totalLabel");
	const totalScoreEl = document.getElementById("totalScore");
	const diffLabel = document.getElementById("diffLabel");
	const diffScoreEl = document.getElementById("diffScore");
	const leaderPill = document.getElementById("leaderPill");
	const eventFeedDiv = document.getElementById("eventFeed");
	const winnerOverlay = document.getElementById("winnerOverlay");
	const winnerBadge = document.getElementById("winnerBadge");
	const winnerName = document.getElementById("winnerName");
	const winnerScore = document.getElementById("winnerScore");
	const winnerSupporters = document.getElementById("winnerSupporters");

	gameTitle.textContent = L.title;
	totalLabel.textContent = L.total;
	diffLabel.textContent = L.diff;

	// ==========================================
	// CANVAS SIZING
	// ==========================================
	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	window.addEventListener("resize", resize);
	resize();
// ==========================================
// BRIDGE → ENGINE WIRING
// ==========================================

TikTokBridge.on("gift", (data) => {
    console.log("[DUEL] Gift recebido:", data);

    const gift = {
        giftId: Number(data.giftId ?? 0),
        giftName: data.giftName ?? data.gift?.name ?? "",
        giftValue: Number(
            data.giftValue ??
            data.gift?.diamondCount ??
            0
        ),
        repeatCount: Number(data.repeatCount ?? 1),
        user: {
            uniqueId: data.user?.uniqueId ?? "anonymous",
            nickname: data.user?.nickname ?? "Anônimo",
        },
    };

    console.log("[DUEL] Gift normalizado:", gift);

    engine.handleGift(gift);
});
TikTokBridge.on("chat", (data) => {
    console.log("[DUEL] Chat recebido:", data);
    engine.handleChat(data);
});

	// ==========================================
	// ANIMATION STATE (purely visual)
	// ==========================================
	/** Score shown on screen (eases toward the real score) */
	const shownScore = config.sides.map(() => 0);
	/** Share of the left side shown on the bar (eases toward the real share) */
	let shownShare = 0.5;
	/** Floating "+N" popups drawn on the canvas */
	const popups = [];

	/** Gifts counted per side in the current round (shown as "N presentes") */
	const presents = config.sides.map(() => 0);

	/** Escape text that goes into innerHTML (names come from config, but be safe). */
	function esc(str) {
		return String(str ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	}

	/** Candidate number typed on the urna (falls back to side position). */
	function sideNumber(side) {
		return String(side.number ?? side.id + 1);
	}

	// ==========================================
	// BUILD SIDE CARDS (scoreboard on top of each side)
	// ==========================================
	function buildSideCards() {
		sideCardsDiv.innerHTML = "";
		config.sides.forEach((side) => {
			const el = document.createElement("div");
			el.className = "side-card";
			el.id = `side-card-${side.id}`;
			el.style.setProperty("--side-color", side.color);

			const avatar = side.photo
				? `<img src="${esc(side.photo)}" alt="" />`
				: esc(side.short.charAt(0).toUpperCase());

			const gifts = config
				.getSideGifts(side.id)
				.map((g) => `<span class="gift-chip">${g.emoji}<small>${g.coins}</small></span>`)
				.join("");

			el.innerHTML =
				`<div class="side-top">` +
				`<span class="side-number">${esc(sideNumber(side))}</span>` +
				`<span class="lead-badge">${esc(L.leading)}</span>` +
				`<span class="side-name">${esc(side.name)}</span>` +
				`<div class="side-avatar">${avatar}</div>` +
				`</div>` +
				`<div class="side-score" id="score-${side.id}">0</div>` +
				`<div class="side-label">${esc(L.scoreLabel)}</div>` +
				`<div class="side-bar"><i id="bar-${side.id}"></i></div>` +
				`<div class="side-foot">` +
				`<span class="side-share" id="share-${side.id}">50%</span>` +
				`<span class="side-rounds" id="rounds-${side.id}">${esc(L.rounds)}: 0</span>` +
				`<span class="side-presents">🎁 <span id="presents-${side.id}">0</span> ${esc(L.presents)}</span>` +
				`</div>` +
				`<div class="side-gifts">${gifts}` +
				(config.chatPoints > 0
					? `<span class="side-vote">${esc(L.voteHint(sideNumber(side)))}</span>`
					: "") +
				`</div>`;
			sideCardsDiv.appendChild(el);
		});
	}
	buildSideCards();

	// ==========================================
	// URNAS (voting machines) — the hand types the candidate number on every
	// score event, then confirms: "FIM · CONFIRMADO · +N ponto(s)".
	// ==========================================
	const HAND_SVG =
		`<svg viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg">` +
		`<rect class="sleeve" x="6" y="80" width="48" height="60" rx="6" fill="var(--side-color)"/>` +
		`<rect x="6" y="80" width="48" height="5" fill="rgba(255,255,255,0.35)"/>` +
		`<rect x="8" y="38" width="44" height="46" rx="16" fill="#f2b48c" stroke="#d99a70" stroke-width="1.2"/>` +
		`<rect x="31" y="34" width="10" height="22" rx="5" fill="#f2b48c" stroke="#d99a70" stroke-width="1.2"/>` +
		`<rect x="40" y="38" width="10" height="22" rx="5" fill="#f2b48c" stroke="#d99a70" stroke-width="1.2"/>` +
		`<ellipse cx="9" cy="60" rx="6.5" ry="11" transform="rotate(-18 9 60)" fill="#f2b48c" stroke="#d99a70" stroke-width="1.2"/>` +
		`<rect x="16" y="2" width="15" height="58" rx="7.5" fill="#f5bc96" stroke="#d99a70" stroke-width="1.2"/>` +
		`</svg>`;
	/** Fingertip position inside the hand SVG (fraction of width / height). */
	const TIP_X = 23.5 / 60;
	const TIP_Y = 4 / 130;

	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	/** @type {{el:HTMLElement,hand:HTMLElement,keys:Object,confirmBtn:HTMLElement,digitEls:HTMLElement[],endSub:HTMLElement,keypad:HTMLElement,number:string,queue:number[],busy:boolean}[]} */
	const urns = [];

	function buildUrns() {
		urnsDiv.innerHTML = "";
		urns.length = 0;
		config.sides.forEach((side) => {
			const number = sideNumber(side);
			const el = document.createElement("div");
			el.className = "urn";
			el.dataset.state = "idle";
			el.style.setProperty("--side-color", side.color);

			const digits = number
				.split("")
				.map(() => `<div class="vs-digit"></div>`)
				.join("");
			const keys = "1234567890"
				.split("")
				.map((k) => `<div class="key" data-key="${k}">${k}</div>`)
				.join("");
			const photo = side.photo ? `<img src="${esc(side.photo)}" alt="" />` : "";

			el.innerHTML =
				`<div class="urn-top"></div>` +
				`<div class="urn-body">` +
				`<div class="urn-brand">${esc(L.urnBrand)}</div>` +
				`<div class="urn-screen"><div class="urn-screen-inner">` +
				`<div class="vote-screen">` +
				`<div class="vs-head">${esc(L.voteFor)}</div>` +
				`<div class="vs-digits">${digits}</div>` +
				`<div class="vs-num">${esc(L.numberHint)}</div>` +
				`<div class="cand">${photo}<b>${esc(number)}</b></div>` +
				`<div class="vs-foot">${esc(L.confirmHint)}</div>` +
				`</div>` +
				`<div class="end-screen"><div class="end-title">${esc(L.end)}</div><div class="end-sub"></div></div>` +
				`</div></div>` +
				`<div class="urn-keypad">` +
				`<div class="keys">${keys}</div>` +
				`<div class="keys-actions">` +
				`<div class="act blank">${esc(L.btnBlank)}</div>` +
				`<div class="act fix">${esc(L.btnFix)}</div>` +
				`<div class="act confirm">${esc(L.btnConfirm)}</div>` +
				`</div></div>` +
				`</div>` +
				`<div class="urn-hand">${HAND_SVG}</div>`;
			urnsDiv.appendChild(el);

			const keyEls = {};
			el.querySelectorAll(".key").forEach((k) => (keyEls[k.dataset.key] = k));
			urns.push({
				el,
				hand: el.querySelector(".urn-hand"),
				keys: keyEls,
				confirmBtn: el.querySelector(".act.confirm"),
				digitEls: Array.from(el.querySelectorAll(".vs-digit")),
				endSub: el.querySelector(".end-sub"),
				keypad: el.querySelector(".urn-keypad"),
				number,
				queue: [],
				busy: false,
			});
		});
		urns.forEach((u) => moveHand(u, null));
	}

	/** Move the fingertip over `target` (an element inside the urn) or to the rest spot. */
	function moveHand(u, target) {
		const ur = u.el.getBoundingClientRect();
		const hw = u.hand.offsetWidth;
		const hh = u.hand.offsetHeight;
		let cx;
		let cy;
		if (target) {
			const tr = target.getBoundingClientRect();
			cx = tr.left + tr.width / 2 - ur.left;
			cy = tr.top + tr.height * 0.55 - ur.top;
		} else {
			const kr = u.keypad.getBoundingClientRect();
			cx = kr.right - ur.left - hw * 0.15;
			cy = ur.height * 0.92;
		}
		u.hand.style.left = `${cx - hw * TIP_X}px`;
		u.hand.style.top = `${cy - hh * TIP_Y}px`;
	}

	function tap(u, el) {
		el.classList.add("pressed");
		u.hand.classList.add("tap");
		setTimeout(() => {
			el.classList.remove("pressed");
			u.hand.classList.remove("tap");
		}, 110);
	}

	async function playVote(u, points, speed) {
		u.el.dataset.state = "typing";
		u.digitEls.forEach((d) => (d.textContent = ""));
		for (let i = 0; i < u.number.length; i++) {
			const ch = u.number[i];
			const key = u.keys[ch];
			if (key) {
				moveHand(u, key);
				await sleep(150 * speed);
				tap(u, key);
			}
			if (u.digitEls[i]) u.digitEls[i].textContent = ch;
			await sleep(170 * speed);
		}
		moveHand(u, u.confirmBtn);
		await sleep(150 * speed);
		tap(u, u.confirmBtn);
		u.el.dataset.state = "confirm";
		await sleep(260 * speed);
		u.endSub.textContent = `${L.confirmed} · +${points} ${L.pointWord(points)}`;
		u.el.dataset.state = "done";
		await sleep(520 * speed);
	}

	async function runUrn(u) {
		if (u.busy) return;
		u.busy = true;
		try {
			while (u.queue.length) {
				const points = u.queue.shift();
				// Many gifts at once: play faster instead of falling behind
				const speed = u.queue.length > 3 ? 0.4 : u.queue.length > 1 ? 0.7 : 1;
				await playVote(u, points, speed);
			}
		} finally {
			u.el.dataset.state = "idle";
			u.digitEls.forEach((d) => (d.textContent = ""));
			moveHand(u, null);
			u.busy = false;
		}
	}

	/** Queue one vote animation (the score itself is already counted by the engine). */
	function enqueueVote(sideIdx, points) {
		const u = urns[sideIdx];
		if (!u) return;
		u.queue.push(points);
		if (u.queue.length > 8) u.queue.shift(); // purely visual: never lag far behind
		runUrn(u);
	}

	buildUrns();
	window.addEventListener("resize", () => urns.forEach((u) => !u.busy && moveHand(u, null)));

	// Every score event: popup + counter bump + urna typing
	engine.on("scoreAdd", ({ sideIdx, points, side }) => {
		const scoreEl = document.getElementById(`score-${sideIdx}`);
		const rect = scoreEl
			? scoreEl.getBoundingClientRect()
			: { left: sideIdx === 0 ? 200 : canvas.width - 400, width: 200, top: canvas.height * 0.3, height: 100 };
		const jitter = (Math.random() - 0.5) * rect.width * 0.5;
		popups.push({
			x: rect.left + rect.width / 2 + jitter,
			y: rect.top + rect.height * 0.55,
			size: Math.max(16, rect.height * 0.2),
			vy: -0.8 - Math.random() * 0.6,
			text: `+${points}`,
			color: side.color,
			life: 1,
		});

		// Gifts counter ("N presentes"); chat votes only animate the urna
		if (engine.state.recentEvents[0]?.type === "gift") presents[sideIdx]++;

		// Bump the counter
		if (scoreEl) {
			scoreEl.classList.remove("bump");
			void scoreEl.offsetWidth; // restart CSS animation
			scoreEl.classList.add("bump");
		}

		enqueueVote(sideIdx, points);
	});

	// Rebuild cards when a new round starts (keeps DOM clean)
let prevPhase = null;
engine.on("phaseChange", ({ phase }) => {
  if (phase === "playing") {     // <- era "waiting"
    shownScore.fill(0);
    shownShare = 0.5;
    popups.length = 0;
    // New round (not the countdown → playing step): restart the gift counters
    if (prevPhase !== "countdown") presents.fill(0);
  }
  prevPhase = phase;
});
	// ==========================================
	// RENDER LOOP
	// ==========================================
	let lastFeedKey = "";

	function frame() {
		const state = engine.tick();
		animate(state);
		drawScene();
		updateHUD(state);
		requestAnimationFrame(frame);
	}

	/** Ease the visual values toward the real ones. */
	function animate(state) {
		state.sides.forEach((side, i) => {
			const diff = side.score - shownScore[i];
			shownScore[i] = Math.abs(diff) < 0.5 ? side.score : shownScore[i] + diff * 0.15;
		});
		shownShare += (engine.getShare() - shownShare) * 0.08;
	}

	// ==========================================
	// CANVAS DRAWING
	// ==========================================
	function drawScene() {
		const W = canvas.width;
		const H = canvas.height;
		ctx.clearRect(0, 0, W, H);

		// Floating "+N" popups
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (let i = popups.length - 1; i >= 0; i--) {
			const p = popups[i];
			p.y += p.vy;
			p.life -= 0.016;
			if (p.life <= 0) {
				popups.splice(i, 1);
				continue;
			}
			ctx.globalAlpha = Math.min(0.7, p.life * 1.2);
			ctx.font = `900 ${p.size}px sans-serif`;
			ctx.lineWidth = Math.max(3, p.size * 0.15);
			ctx.strokeStyle = "rgba(0,0,0,0.55)";
			ctx.strokeText(p.text, p.x, p.y);
			ctx.fillStyle = "#fff";
			ctx.fillText(p.text, p.x, p.y);
		}
		ctx.globalAlpha = 1;
	}

	// ==========================================
	// HUD UPDATE
	// ==========================================
	function formatTime(ms) {
		const total = Math.ceil(ms / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
	}

	function updateHUD(state) {
		// Phase text + timer
		phaseText.textContent = L[state.phase] || state.phase;

		const remaining = engine.phaseRemaining();
		if (remaining !== Infinity && remaining > 0 && state.phase !== "cooldown") {
			phaseTimer.textContent = formatTime(remaining);
		} else {
			phaseTimer.textContent = "";
		}

		phaseBanner.classList.toggle("countdown", state.phase === "countdown");

		// Status bar: total, difference and who is ahead
		const [a, b] = state.sides;
		const shownTotal = shownScore[0] + shownScore[1];
		totalScoreEl.textContent = Math.round(shownTotal).toLocaleString("pt-BR");
		diffScoreEl.textContent = Math.round(Math.abs(shownScore[0] - shownScore[1])).toLocaleString("pt-BR");
		if (a.score === b.score) {
			leaderPill.style.setProperty("--side-color", "#5b6b8c");
			leaderPill.textContent = L.tie;
		} else {
			const lead = a.score > b.score ? a : b;
			leaderPill.style.setProperty("--side-color", lead.color);
			leaderPill.textContent = `${sideNumber(lead)} ${L.leading}`;
		}

		// Counters, shares, rounds won, leader glow
		state.sides.forEach((side, i) => {
			const scoreEl = document.getElementById(`score-${side.id}`);
			const shareEl = document.getElementById(`share-${side.id}`);
			const roundsEl = document.getElementById(`rounds-${side.id}`);
			const cardEl = document.getElementById(`side-card-${side.id}`);
			const barEl = document.getElementById(`bar-${side.id}`);
			const presentsEl = document.getElementById(`presents-${side.id}`);

			if (scoreEl) scoreEl.textContent = Math.round(shownScore[i]).toLocaleString("pt-BR");
			if (shareEl) {
				const leftPct = Math.round(shownShare * 100);
				const pct = i === 0 ? leftPct : 100 - leftPct;
				shareEl.textContent = `${pct}%`;
				if (barEl) barEl.style.width = `${pct}%`;
			}
			if (presentsEl) presentsEl.textContent = presents[i].toLocaleString("pt-BR");
			if (roundsEl) roundsEl.textContent = `${L.rounds}: ${state.roundsWon[side.id]}`;
			if (cardEl) {
				const isLeading = a.score !== b.score && side.score > state.sides[1 - i].score;
				cardEl.classList.toggle("leading", isLeading);
			}
		});

		// Event feed (re-render only when something new arrived)
		const newest = state.recentEvents[0];
		const feedKey = newest ? `${newest.timestamp}-${state.recentEvents.length}` : "";
		if (feedKey !== lastFeedKey) {
			lastFeedKey = feedKey;
			renderFeed(state.recentEvents.slice(0, 3));
		}

		// Result overlay
		if (state.phase === "finished") {
			showResult(state);
		} else {
			winnerOverlay.classList.add("hidden");
		}
	}

	/** Feed uses textContent only, so nicknames can never inject HTML. */
	function renderFeed(events) {
		eventFeedDiv.innerHTML = "";
		events.forEach((evt) => {
			const el = document.createElement("div");
			el.className = "feed-item " + evt.type;
			if (evt.type === "gift" || evt.type === "vote") {
				el.style.borderLeftColor = evt.color;
				el.textContent = `${evt.giftEmoji} ${evt.nickname} → ${evt.sideShort} (+${evt.points} ${L.points})`;
			} else if (evt.type === "chat") {
				el.textContent = `💬 ${evt.nickname}: ${evt.text}`;
			}
			eventFeedDiv.appendChild(el);
		});
	}

	function showResult(state) {
		winnerOverlay.classList.remove("hidden");

		const [a, b] = state.sides;
		winnerScore.textContent = `${a.short} ${a.score.toLocaleString("pt-BR")} × ${b.score.toLocaleString("pt-BR")} ${b.short}`;

		if (state.isTie || !state.winner) {
			winnerBadge.textContent = "🤝";
			winnerBadge.style.background = "#555";
			winnerName.textContent = L.tie;
			winnerName.style.color = "#fff";
			winnerSupporters.textContent = "";
			return;
		}

		const w = state.winner;
		winnerBadge.innerHTML = "";
		if (w.photo) {
			const img = document.createElement("img");
			img.src = w.photo;
			img.alt = "";
			winnerBadge.appendChild(img);
		} else {
			winnerBadge.textContent = w.short.charAt(0).toUpperCase();
		}
		winnerBadge.style.background = w.color;
		winnerName.textContent = `${w.name} ${L.wins}`;
		winnerName.style.color = w.color;

		// Top 3 supporters of the winning side
		const supporters = Array.from(w.supporters.values())
			.sort((x, y) => y.totalContrib - x.totalContrib)
			.slice(0, 3);

		winnerSupporters.textContent = supporters.length
			? `${L.topSupporters} ` +
				supporters.map((s) => `${s.nickname} (${s.totalContrib})`).join(", ")
			: "";
	}

	// ==========================================
	// START
	// ==========================================
	requestAnimationFrame(frame);
	console.log("[FlavioVsLula] Game loaded, waiting for TikTokBridge connection...");
})();
