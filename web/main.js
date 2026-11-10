import { abi, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { contract, explorer } from './deployment.js';
import { samples } from './samples.js';

const reader = createClient({ chain: studionet });
const get = id => document.getElementById(id);
const form = get('classification');
const lookup = get('lookup');
const tracker = get('track');
const wallet = get('connect');
const status = get('tx-status');
const caseIdPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const storageKey = 'tarifftrail:61999:' + contract.toLowerCase();
let readSequence = 0;
let trackSequence = 0;
let signing = false;

get('contract-link').href = explorer + '/address/' + contract;
const errorText = error => error.shortMessage || error.message || String(error);
const read = (functionName, args = []) => reader.readContract({
  address: contract, functionName, args, transactionHashVariant: 'finalized',
}).then(JSON.parse);

read('get_rules').then(pack => {
  get('rule-state').textContent = 'Finalized rule pack · ' + pack.rules.version + ' · SHA-256 ' + pack.rules_sha256;
}).catch(error => {
  get('rule-state').textContent = 'Could not read the deployed rule pack. ' + errorText(error);
});

function append(parent, tag, value, className = '') {
  const element = document.createElement(tag);
  element.textContent = value;
  element.className = className;
  parent.append(element);
  return element;
}

function exportReceipt(record) {
  const json = JSON.stringify({ chainId: studionet.id, contract, receipt: record }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = record.case_id + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readCase(id) {
  const request = ++readSequence;
  const panel = get('case-result');
  if (!caseIdPattern.test(id)) {
    panel.textContent = 'Enter a valid case ID using lowercase letters, digits or hyphens.';
    return;
  }
  lookup.elements.caseId.value = id;
  panel.textContent = 'Reading finalized Studionet state…';
  try {
    const record = await read('get_case', [id]);
    if (request !== readSequence) return;
    if (!record) {
      panel.textContent = 'No finalized record exists for this ID yet.';
      return;
    }
    panel.replaceChildren();
    const card = append(panel, 'article', '', 'record');
    append(card, 'p', record.verdict.replaceAll('_', ' '), 'section-label');
    if (record.hs6) append(card, 'p', record.hs6, 'result-code');
    append(card, 'p', record.reason);
    const details = append(card, 'dl', '');
    const fields = {
      Case: record.case_id,
      Observations: record.details,
      'Reported construction': record.construction,
      'Reported cotton': record.cotton_pct + '%',
      'Evidence pack': record.rule_version,
      'Rule SHA-256': record.rules_sha256,
      'Receipt SHA-256': record.receipt_sha256,
      'Submitted by': record.submitted_by,
    };
    for (const [label, value] of Object.entries(fields)) {
      append(details, 'dt', label);
      append(details, 'dd', value);
    }
    const actions = append(card, 'div', '', 'actions');
    const ruling = append(actions, 'a', record.reference + ' ↗');
    ruling.href = 'https://rulings.cbp.gov/api/getdoc/ny/2025/N350231.pdf';
    ruling.target = '_blank';
    ruling.rel = 'noopener';
    const download = append(actions, 'button', 'Export receipt JSON', 'secondary');
    download.type = 'button';
    download.addEventListener('click', () => exportReceipt(record));
  } catch (error) {
    if (request === readSequence) panel.textContent = errorText(error);
  }
}

function setWallet(accounts = []) {
  const account = accounts[0];
  wallet.textContent = account ? account.slice(0, 6) + '…' + account.slice(-4) : 'Connect browser wallet';
}

async function connect() {
  const provider = window.ethereum;
  if (!provider) throw Error('No browser wallet found. Choose Prepare Studio signing to use the built-in account.');
  const chainId = '0x' + studionet.id.toString(16);
  if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({ method: 'wallet_addEthereumChain', params: [{
        chainId, chainName: studionet.name, nativeCurrency: studionet.nativeCurrency,
        rpcUrls: studionet.rpcUrls.default.http, blockExplorerUrls: [explorer],
      }] });
    }
    if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
      throw Error('Switch your wallet to GenLayer Studionet (61999), then retry.');
    }
  }
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts[0]) throw Error('The browser wallet did not provide an account.');
  setWallet(accounts);
  return createClient({ chain: studionet, account: accounts[0], provider });
}

function saveTracking(hash, id) {
  try { localStorage.setItem(storageKey, JSON.stringify({ hash, id })); }
  catch { /* The visible hash and explorer link remain usable. */ }
}

function caseFromTransaction(transaction) {
  try {
    const payload = Uint8Array.from(transaction.data.calldata.raw);
    const call = abi.calldata.decode(payload);
    const id = call.get('args')?.[0];
    return call.get('method') === 'classify' && caseIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function track(hash, id = null) {
  const current = ++trackSequence;
  if (!hashPattern.test(hash)) {
    status.textContent = 'Enter a valid 32-byte transaction hash.';
    return;
  }
  tracker.elements.hash.value = hash;
  const link = get('tx-link');
  link.href = explorer + '/tx/' + hash;
  link.hidden = false;
  saveTracking(hash, id);
  for (let attempt = 0; attempt < 90 && current === trackSequence; attempt++) {
    let transaction;
    try {
      transaction = await reader.getTransaction({ hash });
    } catch (error) {
      if (current !== trackSequence) return;
      status.textContent = 'Waiting for a receipt or RPC recovery. ' + errorText(error);
    }
    if (current !== trackSequence) return;
    if (transaction) {
      const target = transaction.to_address || transaction.recipient;
      if (target && target.toLowerCase() !== contract.toLowerCase()) {
        status.textContent = 'This transaction targets a different contract.';
        return;
      }
      const phase = String(transaction.statusName || transaction.status || 'unknown').toUpperCase();
      const leader = transaction.consensus_data?.leader_receipt;
      const execution = (Array.isArray(leader) ? leader[0] : leader)?.execution_result
        || transaction.txExecutionResultName;
      status.textContent = phase + (execution ? ' · ' + execution : '');
      if (phase === 'FINALIZED') {
        const confirmedId = caseFromTransaction(transaction) || id;
        if (execution === 'SUCCESS' && confirmedId) await readCase(confirmedId);
        else if (execution === 'SUCCESS') status.textContent += ' · Read the case by its ID to inspect the finalized recommendation.';
        else if (!execution) status.textContent += ' · Execution outcome unavailable. Inspect the explorer receipt.';
        return;
      }
      if (['CANCELED', 'CANCELLED'].includes(phase)) return;
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  if (current === trackSequence) status.textContent = 'Tracking paused. Use the same hash to resume without resubmitting.';
}

function showHandoff(id, construction, cotton, details) {
  const args = get('args');
  args.replaceChildren();
  for (const [name, value] of Object.entries({ case_id: id, construction, cotton_pct: cotton, details })) {
    const row = append(args, 'div', '', 'argument');
    append(row, 'code', name + ' = ' + value);
    const copy = append(row, 'button', 'Copy', 'secondary');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(String(value));
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Select text to copy';
      }
    });
  }
  get('handoff').hidden = false;
  lookup.elements.caseId.value = id;
}

function setSigning(active) {
  signing = active;
  wallet.disabled = active;
  form.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = active; });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (signing) return;
  const fields = new FormData(form);
  const id = fields.get('caseId');
  const construction = fields.get('construction');
  const cotton = Number(fields.get('cotton'));
  const details = fields.get('details').trim();
  if (!caseIdPattern.test(id) || details.length < 25 || details.length > 800
      || !Number.isInteger(cotton) || cotton < 0 || cotton > 100) {
    status.textContent = 'Check the case ID, cotton percentage and observation length.';
    return;
  }
  if (event.submitter?.dataset.sign !== 'wallet') {
    showHandoff(id, construction, cotton, details);
    return;
  }
  setSigning(true);
  ++trackSequence;
  status.textContent = 'Waiting for the browser wallet signature…';
  try {
    const signer = await connect();
    const hash = await signer.writeContract({
      address: contract, functionName: 'classify', args: [id, construction, BigInt(cotton), details], value: 0n,
    });
    status.textContent = 'Submitted · ' + hash;
    void track(hash, id);
  } catch (error) {
    status.textContent = errorText(error);
    showHandoff(id, construction, cotton, details);
  } finally {
    setSigning(false);
  }
});

wallet.addEventListener('click', async () => {
  if (signing) return;
  setSigning(true);
  try {
    await connect();
    status.textContent = 'Browser wallet connected to Studionet.';
  } catch (error) {
    status.textContent = errorText(error);
    get('transaction').scrollIntoView({ block: 'nearest' });
  } finally {
    setSigning(false);
  }
});
window.ethereum?.on?.('accountsChanged', setWallet);
window.ethereum?.on?.('chainChanged', () => setWallet());
lookup.addEventListener('submit', event => {
  event.preventDefault();
  void readCase(lookup.elements.caseId.value.trim());
});
tracker.addEventListener('submit', event => {
  event.preventDefault();
  void track(tracker.elements.hash.value.trim());
});
for (const button of document.querySelectorAll('[data-case]')) {
  button.addEventListener('click', () => void readCase(button.dataset.case));
}
for (const button of document.querySelectorAll('[data-sample]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.sample;
    form.elements.caseId.value = 'tt-' + key + '-' + crypto.randomUUID().slice(0, 8);
    form.elements.construction.value = 'knit';
    form.elements.cotton.value = '100';
    form.elements.details.value = samples[key];
    get('handoff').hidden = true;
  });
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && hashPattern.test(saved.hash)) void track(saved.hash, saved.id);
} catch { /* A fresh session can always track a pasted hash. */ }
