# Step 1: Create tables in Supabase
Write-Host "Step 1: Creating tables in Supabase..." -ForegroundColor Cyan

$connectionString = Get-Content "supabase_connection.txt"

# Run schema creation
psql "$connectionString" -f supabase_schema.sql

Write-Host "`n✅ Tables created!" -ForegroundColor Green

# Step 2: Import argo_floats (small file)
Write-Host "`nStep 2: Importing argo_floats (2,072 rows)..." -ForegroundColor Cyan
psql "$connectionString" -c "\COPY argo_floats FROM 'argo_floats.csv' CSV HEADER;"

Write-Host "✅ argo_floats imported!" -ForegroundColor Green

# Step 3: Import argo_profiles (large file)
Write-Host "`nStep 3: Importing argo_profiles (1,328,385 rows)..." -ForegroundColor Cyan
Write-Host "This may take 5-10 minutes..." -ForegroundColor Yellow

psql "$connectionString" -c "\COPY argo_profiles FROM 'argo_profiles.csv' CSV HEADER;"

Write-Host "`n✅ argo_profiles imported!" -ForegroundColor Green

# Step 4: Verify
Write-Host "`nStep 4: Verifying import..." -ForegroundColor Cyan
psql "$connectionString" -c "SELECT 'argo_floats' as table_name, COUNT(*) as row_count FROM argo_floats UNION ALL SELECT 'argo_profiles', COUNT(*) FROM argo_profiles;"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "MIGRATION COMPLETE! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
