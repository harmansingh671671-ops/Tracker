# Runs test_hindsight.py three times back to back and appends every run to
# hindsight-test-runs.txt. Used to check that retain/recall is reliably
# reproducible rather than passing once by luck.
$out = 'c:\PROJECTS\hindsight-test-runs.txt'
$python = 'c:\PROJECTS\.venv\Scripts\python.exe'

Remove-Item $out -Force -ErrorAction SilentlyContinue

1..3 | ForEach-Object {
    Add-Content $out "===== RUN $_ ====="
    & $python 'c:\PROJECTS\test_hindsight.py' *>> $out
    Add-Content $out "EXIT=$LASTEXITCODE"
}

Add-Content $out '===== ALL RUNS COMPLETE ====='
