import importlib.util
import unittest
from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / "tools" / "v6662" / "upgrade_preflight.py"
spec = importlib.util.spec_from_file_location("zavi_upgrade_preflight", TARGET)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def badging(package="com.zavione.one", code=6623, name="66.23"):
    return f"package: name='{package}' versionCode='{code}' versionName='{name}'\n"

def signer(digest="a" * 64):
    return f"Verifies\nSigner #1 certificate SHA-256 digest: {digest}\n"

class UpgradeIdentitySafetyTests(unittest.TestCase):
    def test_compatible_identity_and_newer_code(self):
        out = mod.check(badging(), signer(), badging(code=6624), signer())
        self.assertTrue(out["safe_in_place_upgrade"])
        self.assertEqual(out["reasons"], [])
        self.assertFalse(out["backup_restoration_verified"])

    def test_separate_qa_package_cannot_see_existing_app_data(self):
        out = mod.check(badging(), signer(),
                        badging("com.zavione.one.legacyqa", 6681), signer())
        self.assertFalse(out["safe_in_place_upgrade"])
        self.assertTrue(any("PACKAGE_MISMATCH" in s for s in out["reasons"]))

    def test_signer_mismatch_denied_even_if_code_increases(self):
        out = mod.check(badging(), signer("a"*64),
                        badging(code=6681), signer("b"*64))
        self.assertFalse(out["safe_in_place_upgrade"])
        self.assertTrue(any("SIGNER_MISMATCH" in s for s in out["reasons"]))

    def test_downgrade_or_same_code_denied(self):
        for code in (6622, 6623):
            with self.subTest(code=code):
                out = mod.check(badging(), signer(), badging(code=code), signer())
                self.assertFalse(out["safe_in_place_upgrade"])
                self.assertTrue(any("NON_INCREASING_VERSION_CODE" in s for s in out["reasons"]))

    def test_missing_or_ambiguous_signature_denied(self):
        for sig in ("", signer() + signer("b"*64), "Signer #1 cert digest unknown"):
            with self.subTest(sig=sig[:20]):
                out = mod.check(badging(), signer(), badging(code=7000), sig)
                self.assertFalse(out["safe_in_place_upgrade"])
                self.assertTrue(any("unambiguous" in s for s in out["reasons"]))

    def test_missing_badging_denied(self):
        out = mod.check("not a package", signer(), badging(code=6681), signer())
        self.assertFalse(out["safe_in_place_upgrade"])
        self.assertTrue(any("aapt" in s for s in out["reasons"]))

    def test_admin_has_independent_certificate_identity(self):
        old = badging("com.zavione.one.admin", 4054, "1.4.54")
        qa = badging("com.zavione.one.admin.legacyqa", 4171, "1.4.54-original-design-qa1-debug")
        out = mod.check(old, signer("1"*64), qa, signer("2"*64))
        self.assertFalse(out["safe_in_place_upgrade"])
        self.assertEqual(len(out["reasons"]), 2)

if __name__ == "__main__":
    unittest.main()
