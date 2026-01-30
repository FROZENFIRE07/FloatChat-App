"""
Quick Supabase Connection Tester
Tests your Supabase connection string
"""

import sys
from getpass import getpass
from urllib.parse import quote_plus

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

print("=" * 60)
print("Supabase Connection Test")
print("=" * 60)

print("\n📋 Go to your Supabase project:")
print("   1. Project Settings → Database")
print("   2. Find 'Connection string' section")
print("   3. Select 'Connection pooling' tab")
print("   4. Copy the URI (should start with postgres://)")
print()
print("Example format:")
print("postgres://postgres.PROJECT:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres")
print()

conn_string = input("📎 Paste your connection string here: ").strip()

if not conn_string:
    print("❌ Connection string required")
    sys.exit(1)

# Check if password placeholder exists
if "[YOUR-PASSWORD]" in conn_string or "password" in conn_string.lower():
    password = getpass("🔐 Enter your database password: ")
    # Replace placeholder with actual password
    conn_string = conn_string.replace("[YOUR-PASSWORD]", quote_plus(password))
    conn_string = conn_string.replace("password", quote_plus(password))

print(f"\n🔗 Testing connection...")
print(f"   Host: {conn_string.split('@')[1].split('/')[0] if '@' in conn_string else 'unknown'}")

try:
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()
    cursor.execute("SELECT version()")
    version = cursor.fetchone()[0]
    
    print(f"\n✅ CONNECTION SUCCESSFUL!")
    print(f"   PostgreSQL: {version.split(',')[0]}")
    
    # Check if tables exist
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_name IN ('argo_profiles', 'argo_floats')
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    if tables:
        print(f"\n📊 Existing tables found: {', '.join(tables)}")
        print("   ⚠️  These will be dropped and recreated during migration")
    else:
        print(f"\n📊 No existing ARGO tables found (good for fresh migration)")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("✅ Ready to migrate! Save this connection string:")
    print("=" * 60)
    print(f"\n{conn_string}\n")
    
    # Save to file for migration script
    with open("supabase_connection.txt", "w") as f:
        f.write(conn_string)
    print("💾 Saved to: supabase_connection.txt")
    
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("1. Verify the connection string is correct")
    print("2. Check your Supabase project is active")
    print("3. Ensure you're using 'Connection pooling' URI, not 'Direct connection'")
    sys.exit(1)
