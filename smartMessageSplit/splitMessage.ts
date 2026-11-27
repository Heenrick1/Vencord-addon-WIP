/*
 * SmartMessageSplit - a Vencord user plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Splits a long message into pieces that each fit within `limit` characters.
 *
 * It tries to cut at the most natural place it can, in this order:
 *   1. blank line (between paragraphs)
 *   2. line break
 *   3. end of a sentence (". ", "! ", "? ")
 *   4. any space (between words)
 *   5. anywhere (last resort, never in the middle of an emoji)
 *
 * If a cut lands inside a ``` code block, the block is closed at the end of
 * that piece and re-opened (with the same language) at the start of the next,
 * so the formatting still looks right in every message.
 *
 * Returns null when the text cannot fit in `maxParts` messages.
 */
export function splitMessage(text: string, limit: number, maxParts: number): string[] | null {
    text = text.trim();
    if (text.length <= limit) return [text];

    // First try to find "pretty" cut points (allowing pieces to be shorter).
    // If that needs too many messages, require each piece to be fuller and try again.
    for (const minFill of [0.4, 0.65, 0.85, 0.95]) {
        const parts = splitWithFill(text, limit, minFill, maxParts);
        if (parts) return parts;
    }
    return null;
}

const FENCE_CLOSE = "\n```";

interface FenceState {
    open: boolean;
    lang: string;
}

/** Works out whether position `end` of `text` is inside a ``` code block. */
function fenceStateAt(text: string, end: number): FenceState {
    const state: FenceState = { open: false, lang: "" };
    const fence = /```([\w+#.-]*)/g;
    let match: RegExpExecArray | null;

    while ((match = fence.exec(text)) && match.index + 3 <= end) {
        if (state.open) {
            state.open = false;
            state.lang = "";
            // a closing fence never has a language, so don't eat a word after it
            fence.lastIndex = match.index + 3;
        } else {
            state.open = true;
            // only count the language if the fence's word fully fits before the cut
            state.lang = match.index + match[0].length <= end ? match[1] : "";
        }
    }
    return state;
}

function isHighSurrogate(code: number) {
    return code >= 0xD800 && code <= 0xDBFF;
}

/**
 * Finds where to cut `text` so the first piece is at most `max` characters.
 * Returns [endOfPiece, startOfNext] - the gap between them is whitespace
 * that gets dropped.
 */
function findCut(text: string, max: number, minFill: number): [number, number] {
    const minPos = Math.floor(max * minFill);
    const window = text.slice(0, max + 1); // +1 so a break right at the limit counts

    // 1 & 2: paragraph break, then line break
    for (const sep of ["\n\n", "\n"]) {
        const idx = window.lastIndexOf(sep, max);
        if (idx >= minPos && idx > 0) return [idx, idx + sep.length];
    }

    // 3: end of a sentence
    const sentenceEnd = /[.!?][)"'*_~]*\s+/g;
    let best = -1;
    let bestNext = -1;
    let m: RegExpExecArray | null;
    while ((m = sentenceEnd.exec(window))) {
        const end = m.index + m[0].trimEnd().length;
        if (end > max) break;
        best = end;
        bestNext = m.index + m[0].length;
    }
    if (best >= minPos && best > 0) return [best, bestNext];

    // 4: between words
    for (let i = max; i >= minPos && i > 0; i--) {
        if (/\s/.test(text[i])) return [i, i + 1];
    }

    // 5: hard cut, but don't break an emoji / special character in half
    let cut = max;
    if (isHighSurrogate(text.charCodeAt(cut - 1))) cut--;
    return [cut, cut];
}

function splitWithFill(text: string, limit: number, minFill: number, maxParts: number): string[] | null {
    const parts: string[] = [];
    let rest = text;

    while (rest.length > limit) {
        if (parts.length >= maxParts - 1) return null; // would need too many messages

        // Leave room to close a code block in case the cut lands inside one.
        let max = limit - FENCE_CLOSE.length;
        let [end, next] = findCut(rest, max, minFill);
        let fence = fenceStateAt(rest, end);

        if (!fence.open) {
            // Not in a code block - we can use the full limit.
            max = limit;
            [end, next] = findCut(rest, max, minFill);
            fence = fenceStateAt(rest, end);
            if (fence.open) {
                // the bigger window landed inside a code block, go back to the safe one
                max = limit - FENCE_CLOSE.length;
                [end, next] = findCut(rest, max, minFill);
                fence = fenceStateAt(rest, end);
            }
        }

        let piece = rest.slice(0, end).trimEnd();
        rest = rest.slice(next);

        if (fence.open) {
            piece += FENCE_CLOSE;
            rest = "```" + fence.lang + "\n" + rest.replace(/^\n/, "");
        } else {
            rest = rest.replace(/^\s*\n/, ""); // drop leftover blank lines at the start
        }

        if (piece.trim()) parts.push(piece);
    }

    if (rest.trim()) parts.push(rest);
    return parts.length <= maxParts ? parts : null;
}
