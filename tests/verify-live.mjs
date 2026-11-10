import assert from 'node:assert/strict';
import { abi, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { contract } from '../web/deployment.js';
import { samples } from '../web/samples.js';

const demos = [
  ['plain', '0x0ccaaf25b694cdafcf29cdb722f813da156580777a19d411d52cef852deaf36e', 'RECOMMENDED', '6109.10'],
  ['slub', '0xe6fb3fe643054201857472f1a4d7e4a383319d965b990bfaf33562274f6c7f37', 'RECOMMENDED', '6110.20'],
  ['incomplete', '0x5d704cd38741983c44b8adaae198a5ae072622710d6d871a46ef06dabea8476e', 'INCONCLUSIVE', null],
];
const client = createClient({ chain: studionet });
const read = async (functionName, args = []) => JSON.parse(await client.readContract({
  address: contract, functionName, args, transactionHashVariant: 'finalized',
}));
const rules = await read('get_rules');
assert.equal(rules.rules.reference, 'CBP N350231, June 27, 2025');
const deploy = await client.getTransaction({ hash: '0x5f27fb41e728cd12000283379ee910985bd31cf822931a8766c3ea863ddbd128' });
assert.equal(deploy.statusName, 'FINALIZED');
assert.equal(deploy.consensus_data.leader_receipt[0].execution_result, 'SUCCESS');

for (const [sample, hash, verdict, hs6] of demos) {
  const id = 'tt-' + sample + '-demo';
  const [tx, record] = await Promise.all([client.getTransaction({ hash }), read('get_case', [id])]);
  assert.equal(tx.statusName, 'FINALIZED');
  assert.equal(tx.consensus_data.leader_receipt[0].execution_result, 'SUCCESS');
  assert.equal(tx.to_address.toLowerCase(), contract.toLowerCase());
  assert.equal(tx.leader_only, false);
  const call = abi.calldata.decode(Uint8Array.from(tx.data.calldata.raw));
  assert.equal(call.get('method'), 'classify');
  assert.deepEqual(call.get('args'), [id, 'knit', 100n, samples[sample]]);
  assert.equal(record.details, samples[sample]);
  assert.equal(record.verdict, verdict);
  assert.equal(record.hs6, hs6);
  assert.equal(record.rules_sha256, rules.rules_sha256);
  assert.equal(record.submitted_by, tx.from_address.toLowerCase());
  assert.match(record.receipt_sha256, /^[a-f0-9]{64}$/);
  console.log(id + ' · FINALIZED · SUCCESS · ' + verdict + (hs6 ? ' · ' + hs6 : ''));
}
