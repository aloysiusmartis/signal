# TODOS

## AI Gateway

### Provider guard for recipe step.model
**What:** Validate that `step.model`'s provider prefix in signal recipe JSON matches
the provider actually configured for the org (i.e., the one with an API key set).

**Why:** Once the gateway supports multiple providers, a recipe author can write
`"openai:gpt-4o"` as a step model. If `OPENAI_API_KEY` isn't set for that org, the
step fails at runtime with a confusing error. Worse: if it IS set accidentally, the
org gets billed for OpenAI calls they didn't intend.

**Pros:** Prevents surprise bills. Catches misconfigured recipes at load time rather
than at execution time.

**Cons:** Adds validation logic to the recipe loader. Needs a concept of "configured
providers per org" — may require a settings table if orgs have different providers.

**Context:** Flagged during AI gateway plan review (2026-04-29). The gateway itself
does not enforce this — it will happily call any provider whose API key is present
in process.env. The guard belongs in the recipe validator/loader.

**Depends on:** AI gateway implementation (`src/lib/ai/gateway.ts`) must be live first.
isAvailable(tier) can be extended to accept an optional provider filter.
