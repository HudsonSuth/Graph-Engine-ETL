# Email/meeting summarizer (phase L2 demo)

Meeting notes (`.md`, `.txt`) and emails (`.eml`) in `inbox/` → summary, category, people and action items in the graph. Every model output is stamped `grokbot/meeting-summarizer/<step>` and marked unverified.

```bash
npm run demo:summarizer              # local Ollama (default); picks an installed chat model
npm run demo:summarizer -- --fake    # deterministic fake model, no network (CI)
```
See [docs/llm-etl.md](../../docs/llm-etl.md) for every option.
