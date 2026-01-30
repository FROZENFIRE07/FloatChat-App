"""
Bulk import CSV data to Supabase PostgreSQL database
Uses COPY command for fastest possible import of large files
"""
import psycopg2
import os
import time

# Parse connection string from file
def get_connection():
    with open('supabase_connection.txt', 'r') as f:
        connection_string = f.read().strip()
    return psycopg2.connect(connection_string)

def create_schema(conn):
    """Create tables in Supabase"""
    print("\n" + "="*50)
    print("STEP 1: Creating tables...")
    print("="*50)
    
    with open('supabase_schema.sql', 'r') as f:
        schema_sql = f.read()
    
    cur = conn.cursor()
    cur.execute(schema_sql)
    conn.commit()
    cur.close()
    print("✅ Tables created successfully!")

def import_argo_floats(conn):
    """Import small argo_floats.csv file"""
    print("\n" + "="*50)
    print("STEP 2: Importing argo_floats.csv (~2,072 rows)...")
    print("="*50)
    
    csv_path = os.path.abspath('argo_floats.csv')
    file_size = os.path.getsize(csv_path) / 1024  # KB
    print(f"   File size: {file_size:.1f} KB")
    
    cur = conn.cursor()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Skip header line
        next(f)
        cur.copy_expert(
            "COPY argo_floats(float_id, first_timestamp, last_timestamp, last_latitude, last_longitude, total_profiles) FROM STDIN WITH CSV",
            f
        )
    
    conn.commit()
    
    # Verify count
    cur.execute("SELECT COUNT(*) FROM argo_floats")
    count = cur.fetchone()[0]
    cur.close()
    
    print(f"✅ Imported {count:,} rows to argo_floats!")

def import_argo_profiles(conn):
    """Import large argo_profiles.csv file using COPY"""
    print("\n" + "="*50)
    print("STEP 3: Importing argo_profiles.csv (~1.3M rows)...")
    print("="*50)
    
    csv_path = os.path.abspath('argo_profiles.csv')
    file_size = os.path.getsize(csv_path) / (1024 * 1024)  # MB
    print(f"   File size: {file_size:.1f} MB")
    print("   ⏳ This may take 5-10 minutes...")
    
    start_time = time.time()
    
    cur = conn.cursor()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Skip header line
        next(f)
        cur.copy_expert(
            "COPY argo_profiles(id, float_id, timestamp, latitude, longitude, depth, temperature, salinity, pressure) FROM STDIN WITH CSV",
            f
        )
    
    conn.commit()
    
    elapsed = time.time() - start_time
    
    # Verify count
    cur.execute("SELECT COUNT(*) FROM argo_profiles")
    count = cur.fetchone()[0]
    cur.close()
    
    print(f"✅ Imported {count:,} rows to argo_profiles!")
    print(f"   Time taken: {elapsed/60:.1f} minutes")

def verify_import(conn):
    """Verify the import was successful"""
    print("\n" + "="*50)
    print("STEP 4: Verifying import...")
    print("="*50)
    
    cur = conn.cursor()
    
    # Get counts
    cur.execute("SELECT COUNT(*) FROM argo_floats")
    floats_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM argo_profiles")
    profiles_count = cur.fetchone()[0]
    
    # Get sample data
    cur.execute("SELECT * FROM argo_floats LIMIT 3")
    sample_floats = cur.fetchall()
    
    cur.execute("SELECT * FROM argo_profiles LIMIT 3")
    sample_profiles = cur.fetchall()
    
    cur.close()
    
    print(f"\n📊 Table Row Counts:")
    print(f"   argo_floats:   {floats_count:,} rows")
    print(f"   argo_profiles: {profiles_count:,} rows")
    
    print(f"\n📋 Sample from argo_floats:")
    for row in sample_floats:
        print(f"   {row}")
    
    print(f"\n📋 Sample from argo_profiles:")
    for row in sample_profiles:
        print(f"   {row}")
    
    return floats_count, profiles_count

def main():
    print("\n" + "🌊"*25)
    print("   SUPABASE BULK DATA IMPORT")
    print("   FloatChat ARGO Database Migration")
    print("🌊"*25)
    
    try:
        print("\n⏳ Connecting to Supabase PostgreSQL...")
        conn = get_connection()
        print("✅ Connected!")
        
        # Run all steps
        create_schema(conn)
        import_argo_floats(conn)
        import_argo_profiles(conn)
        floats_count, profiles_count = verify_import(conn)
        
        conn.close()
        
        print("\n" + "="*50)
        print("🎉 MIGRATION COMPLETE!")
        print("="*50)
        print(f"   argo_floats:   {floats_count:,} rows imported")
        print(f"   argo_profiles: {profiles_count:,} rows imported")
        print("\n   Your data is now live in Supabase! 🚀")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise

if __name__ == "__main__":
    main()
