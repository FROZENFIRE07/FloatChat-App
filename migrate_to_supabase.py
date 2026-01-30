"""
ARGO Database Migration: SQLite → Supabase PostgreSQL
Uses the verified connection string from supabase_connection.txt
"""

import sqlite3
import sys

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("Installing psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2
    from psycopg2 import sql

SQLITE_DB_PATH = "argo_database.db"

def load_connection_string():
    """Load verified connection string from file"""
    try:
        with open("supabase_connection.txt", "r") as f:
            conn_str = f.read().strip()
        if not conn_str:
            raise ValueError("Connection string file is empty")
        return conn_str
    except FileNotFoundError:
        print("❌ supabase_connection.txt not found!")
        print("💡 Run 'python test_supabase_connection.py' first to save your connection string")
        sys.exit(1)

def connect_sqlite():
    """Connect to SQLite database"""
    print(f"📊 Connecting to SQLite: {SQLITE_DB_PATH}")
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        if 'argo_profiles' not in tables or 'argo_floats' not in tables:
            print("❌ Required tables not found")
            sys.exit(1)
        
        print(f"✅ SQLite connected. Tables: {', '.join(tables)}")
        return conn
    except Exception as e:
        print(f"❌ SQLite connection failed: {e}")
        sys.exit(1)

def connect_postgres(conn_string):
    """Connect to Supabase PostgreSQL"""
    print(f"🐘 Connecting to Supabase...")
    try:
        conn = psycopg2.connect(conn_string)
        conn.autocommit = False
        print("✅ PostgreSQL connected")
        return conn
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        sys.exit(1)

def create_tables(pg_conn):
    """Create PostgreSQL tables"""
    print("\n🏗️  Creating tables...")
    cursor = pg_conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS argo_profiles CASCADE")
        cursor.execute("DROP TABLE IF EXISTS argo_floats CASCADE")
        
        cursor.execute("""
            CREATE TABLE argo_floats (
                float_id TEXT PRIMARY KEY,
                first_timestamp TEXT,
                last_timestamp TEXT,
                last_latitude DOUBLE PRECISION,
                last_longitude DOUBLE PRECISION,
                total_profiles INTEGER
            )
        """)
        print("✅ Created: argo_floats")
        
        cursor.execute("""
            CREATE TABLE argo_profiles (
                id BIGSERIAL,
                float_id TEXT,
                timestamp TEXT,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                depth DOUBLE PRECISION,
                temperature DOUBLE PRECISION,
                salinity DOUBLE PRECISION,
                pressure DOUBLE PRECISION
            )
        """)
        print("✅ Created: argo_profiles")
        
        print("\n📇 Creating indexes...")
        cursor.execute("CREATE INDEX idx_profiles_float_id ON argo_profiles(float_id)")
        cursor.execute("CREATE INDEX idx_profiles_timestamp ON argo_profiles(timestamp)")
        cursor.execute("CREATE INDEX idx_profiles_lat ON argo_profiles(latitude)")
        cursor.execute("CREATE INDEX idx_profiles_lon ON argo_profiles(longitude)")
        cursor.execute("CREATE INDEX idx_profiles_location ON argo_profiles(latitude, longitude)")
        print("✅ Indexes created")
        
        pg_conn.commit()
    except Exception as e:
        pg_conn.rollback()
        print(f"❌ Table creation failed: {e}")
        raise

def migrate_data(sqlite_conn, pg_conn, table_name, batch_size=10000):
    """Migrate data in batches"""
    print(f"\n📤 Migrating {table_name}...")
    
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    total_rows = sqlite_cursor.fetchone()[0]
    print(f"   Total rows: {total_rows:,}")
    
    sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in sqlite_cursor.fetchall()]
    col_names = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))
    
    offset = 0
    rows_inserted = 0
    
    while offset < total_rows:
        sqlite_cursor.execute(f"SELECT {col_names} FROM {table_name} LIMIT {batch_size} OFFSET {offset}")
        batch = sqlite_cursor.fetchall()
        
        if not batch:
            break
        
        insert_query = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"
        pg_cursor.executemany(insert_query, batch)
        pg_conn.commit()
        
        rows_inserted += len(batch)
        offset += batch_size
        
        progress = (rows_inserted / total_rows) * 100
        print(f"   Progress: {rows_inserted:,}/{total_rows:,} ({progress:.1f}%)")
    
    print(f"✅ {table_name}: {rows_inserted:,} rows migrated")
    return rows_inserted

def verify_migration(sqlite_conn, pg_conn):
    """Verify row counts match"""
    print("\n🔍 Verifying migration...")
    
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    all_good = True
    for table in ['argo_profiles', 'argo_floats']:
        sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table}")
        sqlite_count = sqlite_cursor.fetchone()[0]
        
        pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
        pg_count = pg_cursor.fetchone()[0]
        
        if sqlite_count == pg_count:
            print(f"✅ {table}: {sqlite_count:,} rows (match)")
        else:
            print(f"❌ {table}: SQLite={sqlite_count:,}, PostgreSQL={pg_count:,} (MISMATCH)")
            all_good = False
    
    return all_good

def main():
    print("=" * 60)
    print("ARGO Database Migration: SQLite → Supabase PostgreSQL")
    print("=" * 60)
    
    conn_string = load_connection_string()
    print(f"\n� Using saved connection string")
    
    sqlite_conn = connect_sqlite()
    pg_conn = connect_postgres(conn_string)
    
    try:
        create_tables(pg_conn)
        
        migrate_data(sqlite_conn, pg_conn, 'argo_floats', batch_size=2000)
        migrate_data(sqlite_conn, pg_conn, 'argo_profiles', batch_size=5000)
        
        if verify_migration(sqlite_conn, pg_conn):
            print("\n" + "=" * 60)
            print("✅ MIGRATION SUCCESSFUL!")
            print("=" * 60)
            print(f"\n📋 Add to your .env:")
            print(f"USE_SUPABASE=true")
            print(f"SUPABASE_DATABASE_URL={conn_string}")
        else:
            print("\n❌ Migration completed with errors")
    
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        sqlite_conn.close()
        pg_conn.close()
        print("\n🔌 Connections closed")

if __name__ == "__main__":
    main()
