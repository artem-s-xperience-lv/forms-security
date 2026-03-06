@echo off
setlocal
set BASE=%1
if "%BASE%"=="" set BASE=http://localhost:3000

echo [GET same-origin check] %BASE%/api/contact
curl.exe -sS -i -H "Origin: %BASE%" "%BASE%/api/contact"

echo.
echo Expected: HTTP 200 with endpoint metadata
endlocal