import pandas as pd
from supabase import create_client
from tqdm import tqdm

SUPABASE_URL = ""
SUPABASE_KEY = ""

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Loading CSV...")
df = pd.read_csv('output/companies_final.csv', dtype=str, low_memory=False)
df = df.replace({pd.NA: None, 'nan': None, '': None})

print(f"Total rows: {len(df):,}")

BATCH_SIZE = 500
successful = 0

for i in tqdm(range(0, len(df), BATCH_SIZE), desc="Uploading"):
    batch = df.iloc[i:i+BATCH_SIZE].to_dict('records')
    try:
        supabase.table('companies').insert(batch).execute()
        successful += len(batch)
    except Exception as e:
        print(f"\nError at row {i}: {e}")
        print("First record in failed batch:", batch[0] if batch else "empty")
        break

print(f"\nDone! Uploaded {successful:,} rows")
