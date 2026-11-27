# SmartMessageSplit (Vencord plugin)

When your Discord message is longer than the character limit (2000, or 4000 with Nitro), this plugin:

- **splits it into up to 4 messages** (you can set 2, 3 or 4 in the plugin settings),
- **cuts at sensible places**: between paragraphs first, then at line breaks, then at the end of sentences, then between words. It only cuts in the middle of a word if there is no other choice.
- **keeps code blocks working**: if a ``` code block has to be split, it is closed at the end of one message and re-opened in the next one,
- **sends all the parts automatically**, one after another.

If the text is too long even for 4 messages (more than 8000 characters, or 16000 with Nitro), nothing is sent.
You see a red pop-up message instead, and your text stays in the chat box so you don't lose it.

## Installing

Vencord only lets you add your own plugins if you **build Vencord yourself** from its source code.
The normal Vencord installer can't load custom plugins. This takes about 10 minutes the first time.

### 1. Install the tools you need (one time only)

1. **Git**: download it from https://git-scm.com/downloads and install it with the default options.
2. **Node.js** (the "LTS" version): download it from https://nodejs.org and install it.
3. **pnpm**: open a terminal and run:
   ```bash
   npm install -g pnpm
   ```
   (To open a terminal on Windows, press the Windows key, type `cmd` and press Enter.
   On Mac, open the "Terminal" app.)

### 2. Download Vencord's source code

In the terminal, run these commands one at a time:

```bash
git clone https://github.com/Vendicated/Vencord.git
```

```bash
cd Vencord
```

```bash
pnpm install --frozen-lockfile
```

### 3. Add this plugin

1. Inside the `Vencord` folder you just downloaded, open the `src` folder.
2. Create a new folder inside `src` called `userplugins` (if it isn't already there).
3. Copy the whole **`smartMessageSplit`** folder from this repository into `userplugins`.

When you're done it should look like this:

```
Vencord/
└── src/
    └── userplugins/
        └── smartMessageSplit/
            ├── index.ts
            └── splitMessage.ts
```

### 4. Build Vencord and put it into Discord

Still in the terminal, inside the `Vencord` folder, run:

```bash
pnpm build
```

```bash
pnpm inject
```

`pnpm inject` opens the Vencord installer. Pick your Discord install and click **Install**
(or **Repair** if Vencord is already installed). Then fully close Discord (also from the system tray) and open it again.

### 5. Turn the plugin on

1. In Discord, open **User Settings** (the gear icon at the bottom left).
2. Scroll down to the **Vencord** section and click **Plugins**.
3. Search for **SmartMessageSplit** and switch it on.
4. Click the gear icon next to it if you want to change the settings.

## Settings

| Setting   | What it does                                                          | Default |
|-----------|-----------------------------------------------------------------------|---------|
| Max parts | The most messages one long message can be split into (2-4).           | 4       |
| Delay     | Seconds to wait between parts, so Discord doesn't rate-limit you.     | 0.5     |

## Good to know

- With this plugin on, pasting a very long text no longer turns it into a `.txt` file. It stays as text, so it can be split.
- If you reply to someone, only the **first** part is sent as the reply. The other parts follow it as normal messages.
- In channels with **slowmode**, splitting is blocked (unless you're a moderator), because Discord wouldn't let the extra parts through.
- Editing an old message to make it longer than the limit isn't split. Only new messages are.

## Updating Vencord later

Your `userplugins` folder stays put when you update. In the `Vencord` folder, run:

```bash
git pull
```

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

Then restart Discord.
