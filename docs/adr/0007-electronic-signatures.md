# ADR-0007: Evidence-based e-signatures behind a provider adapter

**Status:** Proposed. **Date:** 2026-11-07

## Context
Employment contracts must be reviewed and signed digitally. A typed or drawn signature alone may not
satisfy every legal requirement, and the provider must stay configurable.

## Decision
- A `SignatureProvider` interface with a **built-in provider** for launch:
  1. The final contract is rendered to PDF and its **SHA-256 hash** is stored. The version is then frozen.
  2. The signer authenticates (an existing session) and confirms with an **email OTP**.
  3. The signer reviews the document (a viewed event is recorded) and gives explicit **consent** to sign
     electronically. The consent text version is stored.
  4. A signature mark (typed or drawn) is captured. The server records timestamp (server clock), IP, user
     agent, user ID and document hash.
  5. After all parties sign, the server produces a final PDF with an **audit certificate page** and stores
     its hash. The signed file is immutable, in a private bucket.
- External providers (for example Dropbox Sign, DocuSign or a Nigerian provider) can be added later as
  alternative implementations, configured per company or per plan.
- The product does not claim legal equivalence in any jurisdiction until counsel has reviewed it.

## Consequences
- Usable at launch with no third-party cost, and the evidence trail is strong.
- Legal review is required before marketing claims are made.
