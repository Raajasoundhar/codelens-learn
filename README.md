# CodeLens Learn

**From “it works” to “I get it.”**

An open-source code explanation tool for learners. Paste a small snippet and get a plain-language overview, a walkthrough of the source lines, key concepts, pitfalls, and a practice question. Connect your own Claude API key to explain custom snippets, or explore the two included lessons without an account.

**Status: working local prototype, v0.1.** Sample lessons are prewritten and clearly labeled. Live explanations use Anthropic's Messages API. There is no hosted service, user account system, or claim of startup-program acceptance.

## What you can do

- Explore JavaScript array transformations and Python word counting for free.
- Explain your own snippets with Claude at beginner or intermediate level.
- Select from 12 language categories, including Python, JavaScript, SQL, and Rust.
- Review line references, concepts, caveats, and a comprehension question.
- Copy or download an explanation as Markdown.
- Keep your API key on your local server; it is never sent to the browser.

The app explains code; **it never executes it**. AI explanations can be wrong and are not a substitute for tests or a security review.

## Start in two minutes

Install [Node.js](https://nodejs.org/) **22 or later** and [Git](https://git-scm.com/downloads), then open a terminal:

```sh
git clone https://github.com/Raajasoundhar/codelens-learn.git
cd codelens-learn
npm start
```

Open **http://127.0.0.1:3000**. Click **Explain this example** to try the JavaScript lesson. Choose the Python lesson from the sidebar or the **Try an example** dropdown on smaller screens.

There are no third-party packages to install and no build step. No API key or payment is needed for sample mode. Sample mode only explains the exact bundled examples; it does not pretend to generate answers for arbitrary code.

## Connect Claude

1. Sign in to the [Claude Console](https://platform.claude.com/). You need API access and available credits; a chat subscription alone does not configure API access for this app.
2. Create an API key in the Console. Keep it private. Do not paste it into GitHub issues or chat messages.
3. Copy the configuration template:

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   **macOS / Linux**
   ```sh
   cp .env.example .env
   # Open .env in your preferred text editor.
   ```

4. Set `ANTHROPIC_API_KEY` in `.env` to your key. The default model is `claude-sonnet-4-6`; you can set `ANTHROPIC_MODEL` to a model available in your account. If your key requires an explicit workspace, also set `ANTHROPIC_WORKSPACE_ID`.
5. Stop the app with Ctrl+C and run `npm start` again. Refresh the page.
6. Choose **Claude API** under **Explanation source**, select the language and learning level, paste a snippet, then click **Explain with Claude**.

“Claude configured” means the local server has a key, not that billing or the key has been verified. The first explanation will report credential, model, or quota problems without revealing credentials.

Each live explanation sends the code snippet, language, and learning level to Anthropic. API usage can incur charges. Set appropriate limits in your Claude Console. The app limits snippets to 12,000 characters, output to 4,000 tokens, and live requests to 10 per minute with one at a time. These are application limits, not a guaranteed spending cap. No paid API call is made just by opening the page or using a sample.

## Privacy and deployment scope

- Sample explanations stay in the browser. Live snippets are sent to Anthropic and are subject to Anthropic's applicable data policies.
- This app does not write snippets or explanations to disk, keep a history, or log request bodies. Downloading an explanation explicitly saves a copy to your computer.
- `.env` is excluded from Git. Static file serving uses an explicit allowlist, so it cannot serve your key or server source.
- The server listens on `127.0.0.1` only and checks request Host and Origin. **This prototype is for local, single-user use.**
- Do not expose this server through a tunnel or public reverse proxy. A public service needs authentication, per-user quotas, HTTPS, persistent abuse controls, and an appropriate privacy policy.
- Do not submit passwords, tokens, private customer data, or code you lack permission to send to Anthropic.
- The `public/` folder can be served as a static sample demo. A static host such as GitHub Pages cannot run the Claude backend. Never put API keys into client-side JavaScript to work around this.

## Development

```sh
npm test
npm run check
```

The test suite exercises validation, sample shapes, the Claude request format, mocked successful responses, upstream failures, timeouts, file access restrictions, cross-site protections, concurrency, and rate limits. Tests never call the real Claude API and require no key. A real API integration check must be performed separately with your own credentials and credits.

```text
public/             Browser app, styles, and free sample lessons
lib/explain.mjs     Input validation and Claude integration
server.mjs          Local HTTP server and API protections
test/app.test.mjs   Node's built-in test suite
.env.example        Configuration template (no credentials)
```

### Troubleshooting

| Problem | What to do |
| --- | --- |
| `node` or `npm` is not recognized | Install Node.js 22+ and reopen your terminal. |
| Port is already in use | Set `PORT=3001` in `.env`, restart, and open the printed URL. |
| Claude option is disabled | Add your key to `.env` in the project folder, restart the server, and refresh. |
| Credentials or workspace rejected | Check the key and workspace in the Console; do not post the key in an issue. |
| Model or credit error | Verify `ANTHROPIC_MODEL` is available and the account has API credits. |
| Sample cannot explain edited code | Reload a bundled example, or use Claude mode for custom code. |
| Explanation is incomplete | Try a shorter snippet. The app deliberately caps response length. |

## Roadmap

- More free lessons and language-specific examples.
- Streaming explanations and optional follow-up questions.
- Better language-specific prompts and learning exercises.
- Accessible syntax highlighting without executing submitted code.
- A hosted version only after adding accounts, quotas, and operational safeguards.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and improvements to beginner explanations are welcome. Include only synthetic examples in public issues.

## Project description

CodeLens Learn is an open-source developer education tool that helps learners understand small code snippets through structured explanations and practice questions. Its local prototype integrates the Claude API for custom explanations and includes free sample lessons that work without credentials.

This describes the implementation today. It does not imply users, revenue, incorporation, funding, or acceptance into any startup credits program.

## References

- [Claude API overview](https://platform.claude.com/docs/en/api/overview)
- [API versioning](https://platform.claude.com/docs/en/api/versioning)
- [Claude Sonnet 4.6](https://platform.claude.com/docs/en/models/sonnet-4-6/overview)

## License

[MIT](LICENSE) © 2026 Raajasoundhar. Independent project; not affiliated with or endorsed by Anthropic.
