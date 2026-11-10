# TariffTrail

TariffTrail gives importers and brokers a shared evidence trail when visually similar products could fall under different tariff codes. The initial U.S. rule pack covers a narrow case: adult 100% cotton knit tops comparable to the two garments in [CBP ruling N350231](https://rulings.cbp.gov/api/getdoc/ny/2025/N350231.pdf).

## Try the live cases

Open the dashboard, select **Plain demo**, **Slub demo**, or **Incomplete demo** under **Read a finalized case**, then export the JSON receipt. Each demo reads GenLayer Studionet state. To reproduce a classification, load a sample under **Review a product**, prepare Studio signing, and send the copied arguments with the built-in account. Paste the transaction hash back into the dashboard to follow consensus and open the result once finalized.

| Case ID | Outcome | HS6 |
| --- | --- | --- |
| `tt-plain-demo` | Recommended | `6109.10` |
| `tt-slub-demo` | Recommended | `6110.20` |
| `tt-incomplete-demo` | Inconclusive | — |

[Deployment and signing instructions](docs/DEPLOYMENT.md) · [Finalized evidence](docs/EVIDENCE.md) · [Project Explorer notes](docs/SUBMISSION.md)

## How it works

1. The contract validates the ID, construction, cotton percentage and length of the product observations. Woven or blended garments are out of scope. Unknown construction yields an inconclusive result.
2. Each participating validator independently compares the submitted observations to the same fixed, versioned CBP evidence summary. GenLayer's strict equivalence rule requires agreement on a bounded comparator label. The model cannot directly choose a tariff code or write a rationale.
3. The contract maps a supported comparator to a fixed six-digit code and stores a single, immutable receipt per case ID. Each receipt records the observations, submitting address, rule version, official reference, rule pack digest and receipt digest. If consensus fails to produce a successful write, no new receipt is available.
4. The dashboard tracks the transaction separately from execution success and reads the resulting case from finalized state. Users can export it as JSON.

The rule pack pins a curated summary of a published 2025 decision. The official ruling and [current U.S. tariff schedule](https://hts.usitc.gov/) are linked for broker review. The digest binds the embedded summary, while the public ruling is external. Recommendations use six-digit screening codes. Brokers still need the current national tariff schedule and the facts for the shipment before filing. The contract assesses submitted observations, and the signer address records who supplied them. Submit only public, non-confidential product information.

For continued use, a new deployment can add independently sourced, versioned comparator packs for further product families. Existing receipts preserve the rule version used at decision time.

## Run locally

Use Node.js 22 and Python 3.10 or later.

```sh
npm ci
npm test
npm run build
npm run dev
npm run test:live
```

The offline suite uses an explicit GenLayer test double for branching, output bounds and immutable receipts. The live suite reads the deployed rule pack, checks the four finalized transactions and validates the three case receipts against actual transaction calldata.
