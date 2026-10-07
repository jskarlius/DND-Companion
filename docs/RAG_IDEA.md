# Local Knowledge Assistant Idea

Status: Parked future idea; not part of the implementation plan  
Last updated: 2026-10-07

## Idea

Offer an optional, entirely local assistant that answers questions about the
installed public and private knowledge base, for example:

> What does the Grappled condition do?

The knowledge base remains the factual source. A language model, if enabled,
only turns retrieved passages into a conversational answer and cites the local
content records it used.

## Proposed shape

```text
Question
   ↓
Local search/retrieval
   ↓
Relevant installed content passages
   ↓
Optional local text generator
   ↓
Answer with source references
```

The first useful version should be deterministic knowledge search without a
language model. Retrieval-augmented generation (RAG) is considered only after
that search is accurate and the native packages are stable.

Possible boundaries are:

- `KnowledgeRetriever`: finds relevant local entities/passages;
- `TextGenerator`: optional platform-specific local generation;
- `KnowledgeAssistant`: coordinates retrieval, prompting, citations, and
  not-found behavior.

The assistant must be able to answer by showing direct search results when no
model is installed or supported.

## Constraints

- Entirely offline after an optional model has been installed.
- No character, private content, question, or answer is sent to a remote API.
- Answers cite the installed content records used as context.
- If relevant source material is absent, the assistant says so rather than
  filling the gap from model memory.
- Model artifacts are optional user-managed files, not part of the base app,
  content database, backups, or installers.
- Device capability, model size, memory use, speed, model license, and Windows
  and Android support must be measured before selecting a runtime or model.
- The feature remains useful without generative AI.

## Candidate implementation experiments

After Tauri packaging is complete, separately evaluate:

1. lexical/full-text retrieval over the actual knowledge base;
2. whether embeddings materially improve common D&D queries;
3. browser/WebGPU inference for the PWA;
4. native local inference for Windows and Android; and
5. answer grounding, citations, latency, memory pressure, and model-management
   user experience.

No runtime, model, delivery date, or implementation slice is selected yet.

## Preconditions for reconsideration

- The content repository and private-pack system are complete.
- Content entities contain clean searchable text and source references.
- Import/export and database migrations are stable.
- Windows and Android Tauri packages work reliably offline.
- Representative devices and minimum hardware expectations are known.

When these conditions are met, this note should be replaced by a reviewed design
and a new architecture checkpoint before implementation begins.
