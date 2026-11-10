# Studionet evidence

All three classifications were sent with Studio's built-in account in Normal (Full Consensus) mode. The live verification script checks successful execution and finalized contract state.

| Case | Observed result | Transaction |
| --- | --- | --- |
| Contract deployment | Finalized · Success | [Deployment](https://explorer-studio.genlayer.com/tx/0x5f27fb41e728cd12000283379ee910985bd31cf822931a8766c3ea863ddbd128) |
| `tt-plain-demo` | Recommended · 6109.10 | [Plain jersey](https://explorer-studio.genlayer.com/tx/0x0ccaaf25b694cdafcf29cdb722f813da156580777a19d411d52cef852deaf36e) |
| `tt-slub-demo` | Recommended · 6110.20 | [Slub jersey](https://explorer-studio.genlayer.com/tx/0xe6fb3fe643054201857472f1a4d7e4a383319d965b990bfaf33562274f6c7f37) |
| `tt-incomplete-demo` | Inconclusive · no code | [Incomplete evidence](https://explorer-studio.genlayer.com/tx/0x5d704cd38741983c44b8adaae198a5ae072622710d6d871a46ef06dabea8476e) |

Source pack: `us-knit-cotton-v1` · `ac64d48525fc5c3b834a44a1b0bdc9a10c8b4686ae4c0d8bc4c9f64dd412a4be`. The six-digit comparators are derived from [CBP ruling N350231](https://rulings.cbp.gov/api/getdoc/ny/2025/N350231.pdf). Re-run `npm run test:live` against the public RPC.
