"""Offline branch and storage tests using an explicit GenLayer test double."""
import hashlib
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


genlayer = types.ModuleType("genlayer")
genlayer.TreeMap = dict
genlayer.u256 = int
genlayer.gl = types.SimpleNamespace(
    Contract=object,
    public=types.SimpleNamespace(view=lambda fn: fn, write=lambda fn: fn),
    message=types.SimpleNamespace(sender_address="0x" + "A" * 40),
    nondet=types.SimpleNamespace(exec_prompt=Mock()),
    eq_principle=types.SimpleNamespace(strict_eq=Mock()),
)
spec = importlib.util.spec_from_file_location(
    "tariff_trail", Path(__file__).parents[1] / "contracts" / "tariff_trail.py"
)
module = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"genlayer": genlayer}):
    spec.loader.exec_module(module)

gl = genlayer.gl
DETAILS = "Cotton jersey crew-neck top with hemmed sleeves and bottom."


class TariffTrailTests(unittest.TestCase):
    def setUp(self):
        self.trail = module.TariffTrail()
        self.trail.cases = {}
        gl.nondet.exec_prompt.reset_mock()
        gl.nondet.exec_prompt.return_value = "PLAIN"
        gl.eq_principle.strict_eq.reset_mock()
        gl.eq_principle.strict_eq.side_effect = lambda review: review()

    def submit(self, construction="knit", cotton=100, details=DETAILS, case_id="case-001"):
        self.trail.classify(case_id, construction, cotton, details)
        return json.loads(self.trail.get_case(case_id))

    def test_plain_matches_official_comparator(self):
        self.assertEqual(self.submit()["hs6"], "6109.10")
        gl.eq_principle.strict_eq.assert_called_once()
        self.assertIn("UNTRUSTED OBSERVATIONS:", gl.nondet.exec_prompt.call_args.args[0])

    def test_slub_maps_to_pullover(self):
        gl.nondet.exec_prompt.return_value = "  SLUB\n"
        self.assertEqual(self.submit()["hs6"], "6110.20")

    def test_arbitrary_model_code_never_commits(self):
        for index, value in enumerate(("UNCERTAIN", "9999.99", '{"answer":"PLAIN"}')):
            with self.subTest(value=value):
                gl.nondet.exec_prompt.return_value = value
                receipt = self.submit(case_id=f"sample-{index}")
                self.assertEqual(receipt["verdict"], "INCONCLUSIVE")
                self.assertIsNone(receipt["hs6"])

    def test_woven_and_blended_material_skip_model(self):
        self.assertEqual(self.submit("woven")["verdict"], "OUT_OF_SCOPE")
        self.assertEqual(self.submit(cotton=99, case_id="blended")["verdict"], "OUT_OF_SCOPE")
        gl.nondet.exec_prompt.assert_not_called()

    def test_unknown_construction_skips_model(self):
        self.assertEqual(self.submit("unknown")["verdict"], "INCONCLUSIVE")
        gl.nondet.exec_prompt.assert_not_called()

    def test_receipt_is_immutable(self):
        first = self.submit()
        with self.assertRaisesRegex(ValueError, "already used"):
            self.submit(details=DETAILS + " Changed.")
        self.assertEqual(json.loads(self.trail.get_case("case-001")), first)

    def test_missing_case_returns_null(self):
        self.assertIsNone(json.loads(self.trail.get_case("absent")))

    def test_invalid_inputs_store_nothing(self):
        for args in (("bad id", "knit", 100, DETAILS), ("valid-id", "other", 100, DETAILS),
                     ("valid-id", "knit", 101, DETAILS), ("valid-id", "knit", 100, "too short")):
            with self.subTest(args=args), self.assertRaises(ValueError):
                self.trail.classify(*args)
        self.assertEqual(self.trail.cases, {})

    def test_unresolved_consensus_leaves_no_receipt(self):
        gl.eq_principle.strict_eq.side_effect = RuntimeError("No agreement")
        with self.assertRaisesRegex(RuntimeError, "No agreement"):
            self.submit()
        self.assertEqual(self.trail.cases, {})

    def test_receipt_and_rule_pack_digests(self):
        receipt = self.submit(details=DETAILS + " Tissu écru.")
        pack = json.loads(self.trail.get_rules())
        self.assertEqual(receipt["submitted_by"], "0x" + "a" * 40)
        for content, digest in ((receipt, receipt.pop("receipt_sha256")),
                                (pack["rules"], pack["rules_sha256"])):
            payload = json.dumps(content, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
            self.assertEqual(hashlib.sha256(payload.encode()).hexdigest(), digest)
