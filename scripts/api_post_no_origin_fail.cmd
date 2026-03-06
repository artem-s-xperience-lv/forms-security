@echo off
setlocal
set BASE=%1
if "%BASE%"=="" set BASE=http://localhost:3000

echo [POST no Origin header] %BASE%/api/contact
curl.exe -sS -i -X POST "%BASE%/api/contact" ^
  -H "Content-Type: application/json" ^
  --data "{\"name\":\"Bot\",\"email\":\"bot@example.com\",\"message\":\"hello hello hello\",\"website\":\"\",\"captchaToken\":\"x\"}"

echo.
echo Expected: HTTP 403 Origin not allowed
endlocal