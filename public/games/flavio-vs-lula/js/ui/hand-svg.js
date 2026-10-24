/**
 * hand-svg.js
 * Pointing hand + sleeve drawn as inline SVG. The sleeve uses the CSS
 * variable `--side-color`, so each urna gets the color of its side.
 * The fingertip is at HAND.tipX / HAND.tipY (see constants.js).
 *
 * @module games/flavio-vs-lula/ui/hand-svg
 */

const SKIN = "#f2b48c";
const SKIN_INDEX = "#f5bc96";
const SKIN_OUTLINE = "#d99a70";
const OUTLINE_WIDTH = 1.2;

const skin = (attrs, fill = SKIN) =>
	`${attrs} fill="${fill}" stroke="${SKIN_OUTLINE}" stroke-width="${OUTLINE_WIDTH}"`;

export const HAND_SVG =
	`<svg viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg">` +
	// sleeve
	`<rect x="6" y="80" width="48" height="60" rx="6" fill="var(--side-color)"/>` +
	`<rect x="6" y="80" width="48" height="5" fill="rgba(255,255,255,0.35)"/>` +
	// palm, curled fingers, thumb
	`<rect ${skin('x="8" y="38" width="44" height="46" rx="16"')}/>` +
	`<rect ${skin('x="31" y="34" width="10" height="22" rx="5"')}/>` +
	`<rect ${skin('x="40" y="38" width="10" height="22" rx="5"')}/>` +
	`<ellipse ${skin('cx="9" cy="60" rx="6.5" ry="11" transform="rotate(-18 9 60)"')}/>` +
	// index finger (the one that presses the keys)
	`<rect ${skin('x="16" y="2" width="15" height="58" rx="7.5"', SKIN_INDEX)}/>` +
	`</svg>`;
