"""
ARGO Database Export to CSV
Exports SQLite data to CSV files for faster Supabase import via SQL Editor
"""

import sqlite3
import csv

SQLITE_DB_PATH = "argo_database.db"

def export_to_csv(table_name, output_file):
    """Export a table to CSV"""
    print(f"\n📤 Exporting {table_name}...")
    
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # Get total rows
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    total = cursor.fetchone()[0]
    print(f"   Total rows: {total:,}")
    
    # Get all data
    cursor.execute(f"SELECT * FROM {table_name}")
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Write header
        headers = [description[0] for description in cursor.description]
        writer.writerow(headers)
        
        # Write data in batches
        batch_size = 50000
        rows_written = 0
        
        while True:
            batch = cursor.fetchmany(batch_size)
            if not batch:
                break
            
            writer.writerows(batch)
            rows_written += len(batch)
            
            progress = (rows_written / total) * 100
            print(f"   Progress: {rows_written:,}/{total:,} ({progress:.1f}%)")
        
        print(f"✅ Exported to: {output_file}")
    
    conn.close()
    return rows_written

def main():
    print("=" * 60)
    print("ARGO Database CSV Export")
    print("=" * 60)
    
    print("\n📊 Connecting to SQLite...")
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # Verify tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    if 'argo_profiles' not in tables or 'argo_floats' not in tables:
        print("❌ Required tables not found")
        return
    
    print(f"✅ Found tables: {', '.join([t for t in tables if t != 'sqlite_sequence'])}")
    conn.close()
    
    # Export tables
    export_to_csv('argo_floats', 'argo_floats.csv')
    export_to_csv('argo_profiles', 'argo_profiles.csv')
    
    print("\n" + "=" * 60)
    print("✅ EXPORT COMPLETE!")
    print("=" * 60)
    
    print("\n📋 Next steps - Import to Supabase via SQL Editor:")
    print("\n1. Go to Supabase Dashboard → SQL Editor")
    print("\n2. Create tables (run this SQL):")
    print("""
CREATE TABLE argo_floats (
    float_id TEXT PRIMARY KEY,
    first_timestamp TEXT,
    last_timestamp TEXT,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    total_profiles INTEGER
);

CREATE TABLE argo_profiles (
    id BIGINT,
    float_id TEXT,
    timestamp TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    depth DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    salinity DOUBLE PRECISION,
    pressure DOUBLE PRECISION
);

CREATE INDEX idx_profiles_float_id ON argo_profiles(float_id);
CREATE INDEX idx_profiles_timestamp ON argo_profiles(timestamp);
CREATE INDEX idx_profiles_lat ON argo_profiles(latitude);
CREATE INDEX idx_profiles_lon ON argo_profiles(longitude);
CREATE INDEX idx_profiles_location ON argo_profiles(latitude, longitude);
""")
    
    print("\n3. Import CSVs:")
    print("   a. Go to Table Editor → argo_floats → Insert → Import from CSV")
    print("   b. Upload argo_floats.csv")
    print("   c. Repeat for argo_profiles.csv")
    
    print("\n💡 OR use psql command (faster for large files):")
    print("   Get connection string from supabase_connection.txt")
    print("   Then run:")
    print(f"   psql <connection-string> -c \"\\COPY argo_floats FROM 'argo_floats.csv' CSV HEADER;\"")
    print(f"   psql <connection-string> -c \"\\COPY argo_profiles FROM 'argo_profiles.csv' CSV HEADER;\"")
    
    print("\n📁 Files created:")
    print("   - argo_floats.csv")
    print("   - argo_profiles.csv")

if __name__ == "__main__":
    main()
