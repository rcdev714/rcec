import pandas as pd
import sys

print("Loading bi_compania...")
compania = pd.read_csv('data/bi_compania (1).csv', dtype=str)
compania['expediente'] = compania['expediente'].str.strip()

print("Loading bi_ranking (this takes a minute)...")
ranking = pd.read_csv('data/bi_ranking.csv', dtype=str, low_memory=False)
ranking['expediente'] = ranking['expediente'].fillna('').str.strip().str.replace(r'\.0$', '', regex=True)

print("Loading bi_segmento...")
segmento = pd.read_csv('data/bi_segmento (1).csv', dtype=str)
segmento.columns = segmento.columns.str.strip()
segmento['id_segmento'] = segmento['id_segmento'].str.strip()
segmento['segmento'] = segmento['segmento'].str.strip()

print("Loading bi_ciiu...")
ciiu = pd.read_csv('data/bi_ciiu (1).csv', dtype=str)
ciiu.columns = ciiu.columns.str.strip()
ciiu['ciiu'] = ciiu['ciiu'].str.strip()

print(f"Compania rows: {len(compania):,}")
print(f"Ranking rows: {len(ranking):,}")

# Merge ranking + compania on expediente
print("Merging ranking + compania...")
merged = ranking.merge(compania, on='expediente', how='left', suffixes=('', '_comp'))

print(f"After merge with compania: {len(merged):,} rows")

# Add CIIU description (use ciiu_n6 from ranking)
print("Adding CIIU descriptions...")
merged = merged.merge(ciiu, left_on='ciiu_n6', right_on='ciiu', how='left')

# Add segment name
print("Adding segment names...")
merged = merged.merge(segmento, left_on='cod_segmento', right_on='id_segmento', how='left')

print(f"Final rows: {len(merged):,}")

# Save to CSV
print("Saving to output/companies_full.csv...")
merged.to_csv('output/companies_full.csv', index=False)

print("Done! File: output/companies_full.csv")
print(f"Columns: {len(merged.columns)}")
print(f"Rows: {len(merged):,}")
