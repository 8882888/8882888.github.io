import gzip, importlib.util, json, pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect-keywords.py'); collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
class InventoryTests(unittest.TestCase):
 def test_inventory_integrity(self):
  summary=json.loads((ROOT/'data/keywords/summary.json').read_text()); regions={r['slug'] for r in collector.regions()};seen=set();count=0
  with gzip.open(ROOT/'data/keywords/inventory.jsonl.gz','rt') as source:
   for line in source:
    row=json.loads(line); normalized=collector.key(row['term']);self.assertNotIn(normalized,seen);seen.add(normalized)
    if row['origin']=='generated': self.assertIn(row['region'],regions)
    else:
     self.assertTrue(all(s in regions for s in row['regions']))
     if row['state']=='linked': self.assertTrue(row['regions'])
    count+=1
  self.assertEqual(count,summary['stored']);self.assertEqual(summary['generated'],len(regions)*len(collector.THEMES))
 def test_name_normalization_and_ids(self):
  self.assertEqual(collector.ident('산정 호수'),collector.ident('산정호수'))
  self.assertEqual(collector.category('영덕해맞이공원 자전거 종주'),'자전거길')
  self.assertEqual(collector.category('설악산'),'산행')
 def test_source_state_is_honest(self):
  summary=json.loads((ROOT/'data/keywords/summary.json').read_text())
  self.assertEqual(summary['naverDirect'],'not-connected');self.assertEqual(summary['snsDirect'],'not-connected')
  self.assertEqual(summary['searchExposure'],'not-measured')
  self.assertEqual(summary['collected'],summary['seedKeywords']+summary['feedKeywords'])
if __name__=='__main__': unittest.main()
