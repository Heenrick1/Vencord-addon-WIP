/*
 * SmartMessageSplit - a Vencord user plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, PermissionsBits, PermissionStore, showToast, UserStore } from "@webpack/common";

import { splitMessage } from "./splitMessage";

const logger = new Logger("SmartMessageSplit");

const NORMAL_LIMIT = 2000;
const NITRO_LIMIT = 4000;

const settings = definePluginSettings({
    maxParts: {
        type: OptionType.SLIDER,
        description: "The most messages one long message is allowed to be split into.",
        markers: [2, 3, 4],
        default: 4,
        stickToMarkers: true,
    },
    delay: {
        type: OptionType.SLIDER,
        description: "Seconds to wait between sending each part (helps avoid Discord's rate limit).",
        markers: [0.25, 0.5, 1, 1.5, 2],
        default: 0.5,
        stickToMarkers: true,
    },
});

function getLimit() {
    // premiumType 2 = full Nitro, which raises the limit to 4000
    return UserStore.getCurrentUser()?.premiumType === 2 ? NITRO_LIMIT : NORMAL_LIMIT;
}

function blockedBySlowmode(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel?.rateLimitPerUser) return false;
    // Mods can ignore slowmode
    const canBypass = PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel)
        || PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel);
    return !canBypass;
}

async function sendRemaining(channelId: string, parts: string[]) {
    for (let i = 0; i < parts.length; i++) {
        await sleep(settings.store.delay * 1000);
        try {
            await sendMessage(channelId, { content: parts[i] });
        } catch (e) {
            logger.error("Failed to send part", i + 2, e);
            showToast({ text: `Failed to send part ${i + 2}. The rest was not sent.`, variant: "critical" });
            return;
        }
    }
}

const onSend: MessageSendListener = (channelId, message) => {
    const limit = getLimit();
    if (message.content.length <= limit) return; // short message, nothing to do

    const maxParts = settings.store.maxParts;
    const parts = splitMessage(message.content, limit, maxParts);

    if (!parts) {
        showToast({
            text: `Message too long: it doesn't fit in ${maxParts} messages (max ${limit * maxParts} characters).`,
            variant: "critical",
        });
        return { cancel: true }; // keeps your text in the box so nothing is lost
    }

    if (blockedBySlowmode(channelId)) {
        showToast({ text: "Can't split this message: the channel has slowmode on.", variant: "critical" });
        return { cancel: true };
    }

    // Discord sends the first part like a normal message (so replies etc. still work),
    // then we send the rest one after another.
    message.content = parts[0];
    void sendRemaining(channelId, parts.slice(1));
};

export default definePlugin({
    name: "SmartMessageSplit",
    description: "When a message is over Discord's character limit, splits it at sensible places into up to 4 messages and sends them automatically.",
    authors: [{ name: "Heenrick1", id: 0n }],
    dependencies: ["MessageEventsAPI"],
    settings,

    onBeforeMessageSend: onSend,

    patches: [
        // Stop Discord from blocking messages that are over the limit
        {
            find: 'type:"MESSAGE_LENGTH_UPSELL"',
            replacement: {
                match: /if\(\i.length>\i/,
                replace: "if(false",
            },
        },
        // Stop Discord from turning long pasted text into a .txt file
        {
            find: ".onHideAutocomplete?",
            replacement: {
                match: /(?<=getData\(\i\.type\);)if\(\i.length>\i\)/,
                replace: "if(false)",
            },
        },
    ],
});
