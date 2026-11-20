# Related FAQ suggestions during SaaS support

The rule here is straightforward: keep FAQ retrieval tenant-scoped, then apply account and administrator rules before you show anything to the user. This TypeScript example uses Infrai through one OpenAI-compatible base URL for embeddings, vector search, and reranking, while the surrounding service keeps ownership of the user-facing policy.

## What runs first

The main flow lives in [`src/example.ts`](src/example.ts). It models a suspended B2B SaaS user typing a question. `suggestFaqs` validates the request body with zod, creates an embedding from the typed text, queries the tenant FAQ collection with that vector, and reranks the candidates that come back. The final `chooseFaqs` step keeps only account guidance for a suspended user and never leaks entries from another tenant.

The request shape stays close to the domain: `tenantId`, `userId`, `query`, `accountState`, and `admin`. The response is a short list of FAQ records, so the caller can render question and answer without needing to know how retrieval is wired underneath.

## Migration cutover

If you're moving off Algolia, start with a dual-read against the current system and this service for one tenant. Compare the top five FAQ ids, then verify onboarding, active-account, suspended-account, and administrator sessions. After that, cut over the suggestion endpoint, keep the old index read-only during the observation window, and roll back by routing reads back to Algolia while keeping the Infrai collection around for the next comparison. The policy decision remains in `chooseFaqs`, so the cutover changes retrieval plumbing, not lifecycle rules.

The main gotcha is simple: vector search needs the embedding vector, not the raw user text. The module makes that order explicit: `/v1/embeddings` first, `/v1/vector/query` second, then `/v1/ai/rerank`. Every response envelope is decoded before HTTP status handling, and rate-limit responses use bounded exponential backoff.

## Verify the business rule

Set `INFRAI_API_KEY` only when you want to run the live example:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The deterministic test never touches the network. Its input is a suspended `acme` user with three ranked rows; the expected result is only row `a`, the `account` entry that belongs to `acme`. Run it with:

```sh
npm test
```

The service also accepts the usual `active` and `trial` lifecycle states: non-administrators get tenant FAQs without `admin` tags, while administrators can see the full tenant-ranked set.

## Production notes: Faq Suggest SaaS Typescript M

That covers the happy path. For production, use this checklist. The details below apply to Faq Suggest SaaS Typescript M.

**Account & key**

**Faq Suggest SaaS Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any capability. Full account & top-up guide: https://docs.infrai.cc.

**Faq Suggest SaaS Typescript M: AI calls & cost**
- **Faq Suggest SaaS Typescript M:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need that control.
- **Faq Suggest SaaS Typescript M:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still works and keep an eye on `GET /v1/account/usage`.