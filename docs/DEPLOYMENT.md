# Deployment and signing

- Network: GenLayer Studionet, chain ID 61999
- Studio: https://studio.genlayer.com/?import-contract=0x78bf9E1210effc384A2A15DB602bee50e16ac245
- Contract: [0x78bf9E1210effc384A2A15DB602bee50e16ac245](https://explorer-studio.genlayer.com/address/0x78bf9E1210effc384A2A15DB602bee50e16ac245)
- [Finalized deployment transaction](https://explorer-studio.genlayer.com/tx/0x5f27fb41e728cd12000283379ee910985bd31cf822931a8766c3ea863ddbd128)

## Submit with the Studio account

1. Open the Studio link above to import the shared deployment. Studio should open an editor tab called `imported_0x78bf9E12.py`.
2. Open **Run and Debug** and confirm the deployed address matches the shared instance. Select **Normal (Full Consensus)** and use Studio’s built-in account. To deploy a separate instance, import the [contract source](../contracts/tariff_trail.py) and deploy it from **Run and Debug**.
3. Expand **classify**. Enter the dashboard's prepared values for `case_id`, `construction`, `cotton_pct`, and `details`. Click **Send Transaction**.
4. Copy the full transaction hash from Studio, paste it under **Track consensus**, and wait for **FINALIZED · SUCCESS**. The dashboard decodes the shared instance's classification call and loads the case from finalized state. For a separate instance, read the case with Studio's **get_case** method and its **Finalized** state setting, or point a local dashboard at your own deployment in `web/deployment.js`.

The dashboard also offers an optional EIP-1193 browser-wallet flow targeting Studionet. The recorded live transactions were signed with the Studio account.

## Rebuild the dashboard

Run `npm ci && npm run build` and serve `dist/` over HTTPS. The compiled site only needs public Studionet RPC access. Studio signing is a handoff with copied arguments, and the dashboard uses the public RPC for tracking and finalized reads.
