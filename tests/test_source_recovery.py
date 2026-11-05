import importlib.util
import io
import tempfile
import unittest
import zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('recovery',Path(__file__).parents[1]/'scripts/recover-independent-source.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class RecoveryTests(unittest.TestCase):
 def archive(self,files):
  data=io.BytesIO()
  with zipfile.ZipFile(data,'w') as z:
   for k,v in files.items():z.writestr(k,v)
  return data.getvalue()
 def check(self,files,valid):
  with tempfile.TemporaryDirectory() as t:
   if valid:r.extract(self.archive(files),Path(t))
   else:
    with self.assertRaises(ValueError):r.extract(self.archive(files),Path(t))
 def test_small_modular_admin_is_valid(self):
  self.check({'index.html':'<html><body><script src="app.js?v=1"></script></body></html>','app.js':'const ok=true;'},True)
 def test_missing_script_rejected(self):self.check({'index.html':'<html><body><script src="missing.js"></script></body></html>'},False)
 def test_missing_entry_rejected(self):self.check({'app.js':'const ok=true;'},False)
 def test_traversal_rejected(self):self.check({'../outside':'bad'},False)
 def test_apk_rejected(self):self.check({'old.apk':'bad'},False)
 def test_signing_key_rejected(self):self.check({'private.jks':'bad'},False)
 def test_visible_javascript_rejected(self):self.check({'index.html':'<html><body>'+('const secret=1; '*30)+'</body></html>'},False)
 def test_incomplete_html_rejected(self):self.check({'index.html':'<html><body>incomplete'},False)
if __name__=='__main__':unittest.main()
