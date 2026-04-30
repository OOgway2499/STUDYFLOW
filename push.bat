@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PWA support and mobile optimization"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~30 seconds.
echo You can close this window.
pause
