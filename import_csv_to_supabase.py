"""
ARGO Database CSV Import to Supabase
Uses PostgreSQL COPY command for fast bulk loading
"""

import psycopg2
import sys

def load_connection_string():
    """Load connection string from file"""
    try:
        with open("supabase_connection.txt", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("❌ supabase_connection.txt not found!")
        sys.exit(1)

def import_csv(conn_string):
    """Import CSVs using PostgreSQL COPY"""
    
    print("=" * 60)
    print("ARGO CSV Import to Supabase")
    print("=" * 60)
    
    print(f"\n🔗 Connecting to Supabase...")
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    print("✅ Connected")
    
    try:
        # Step 1: Create tables
        print("\n🏗️  Creating tables...")
        with open("supabase_schema.sql", "r") as f:
            schema_sql = f.read()
        cursor.execute(schema_sql)
        conn.commit()
        print("✅ Tables created")
        
        # Step 2: Import argo_floats
        print(f"\n📤 Importing argo_floats.csv...")
        with open("argo_floats.csv", "r",encoding="utf-8") as f:
            cursor.copy_expert("COPY argo_floats FROM STDIN CSV HEADER", f)
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM argo_floats")
        count = cursor.fetchone()[0]
        print(f"✅ Imported {count:,} rows")
        
        # Step 3: Import argo_profiles
        print(f"\n📤 Importing argo_profiles.csv...")
        print("⏱️  This will take 5-10 minutes...")
        
        with open("argo_profiles.csv", "r", encoding="utf-8") as f:
            cursor.copy_expert("COPY argo_profiles FROM STDIN CSV HEADER", f)
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM argo_profiles")
        count = cursor.fetchone()[0]
        print(f"✅ Imported {count:,} rows")
        
        # Step 4: Verify
        print("\n🔍 Verifying...")
        cursor.execute("""
            SELECT 'argo_floats' as table_name, COUNT(*) as row_count FROM argo_floats
            UNION ALL
            SELECT 'argo_profiles', COUNT(*) FROM argo_profiles
        """)
        
        results = cursor.fetchall()
        for table, count in results:
            print(f"   {table}: {count:,} rows")
        
        # Test query
        print("\n🧪 Testing sample query...")
        cursor.execute("""
            SELECT COUNT(*) FROM argo_profiles
            WHERE latitude BETWEEN 8 AND 25
              AND longitude BETWEEN 50 AND 75
        """)
        test_count = cursor.fetchone()[0]
        print(f"   Sample region: {test_count:,} profiles")
        
        print("\n" + "=" * 60)
        print("✅ IMPORT SUCCESSFUL!")
        print("=" * 60)
        
        print(f"\n📋 Add to backend/.env:")
        print(f"USE_SUPABASE=true")
        print(f"SUPABASE_DATABASE_URL={conn_string}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Connection closed")

if __name__ == "__main__":
    conn_string = load_connection_string()
    import_csv(conn_string)
