import importlib.util,tempfile,unittest
from pathlib import Path

def load(name):
 p=Path(__file__).resolve().parents[1]/'scripts'/f'{name}.py';s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
metrics=load('metrics');audit=load('audit')
class ToolsTest(unittest.TestCase):
 def test_missing_is_not_zero(self):
  with tempfile.TemporaryDirectory() as d:
   a=Path(d)/'a.csv';b=Path(d)/'b.csv';header='period_start,period_end,query,impressions,clicks\n'
   a.write_text(header+'2026-10-01,2026-10-07,세종탁송,100,5\n');b.write_text(header+'2026-10-08,2026-10-14,부산탁송,200,10\n')
   r=metrics.compare(a,b);self.assertTrue(all(q['clickDelta'] is None for q in r['queries']))
 def test_delta_and_equal_period(self):
  with tempfile.TemporaryDirectory() as d:
   a=Path(d)/'a.csv';b=Path(d)/'b.csv';header='period_start,period_end,query,impressions,clicks\n'
   a.write_text(header+'2026-10-01,2026-10-07,세종 탁송,100,5\n');b.write_text(header+'2026-10-08,2026-10-14,세종탁송,200,12\n')
   r=metrics.compare(a,b)['queries'][0];self.assertEqual(r['clickDelta'],7);self.assertEqual(r['ctrDeltaPoints'],1)
   b.write_text(header+'2026-10-08,2026-10-15,세종탁송,200,12\n');self.assertRaises(ValueError,metrics.compare,a,b)
 def test_korean_canonical_equivalence(self):
  self.assertEqual(audit.normalized_url('https://example.com/강남/'),audit.normalized_url('https://example.com/%EA%B0%95%EB%82%A8/'))
  self.assertNotEqual(audit.normalized_url('https://example.com/a%2Fb/'),audit.normalized_url('https://example.com/a/b/'))
 def test_audit_html_parser(self):
  p=audit.Parser();p.feed('<title>지역 &amp; 요금</title><link href="https://example.com/" rel="canonical"><meta content="noindex" name="robots"><h1>지역</h1><a href="tel:18114294">전화</a><script type="application/ld+json">{"@type":"Service"}</script>')
  self.assertEqual(''.join(p.title),'지역 & 요금');self.assertEqual(p.canonical,['https://example.com/']);self.assertEqual(p.meta['robots'],'noindex');self.assertEqual(len(p.schema),1);self.assertNotIn('Service',' '.join(p.text))
if __name__=='__main__':unittest.main()
