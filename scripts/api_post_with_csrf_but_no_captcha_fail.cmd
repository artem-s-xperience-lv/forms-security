@echo off
setlocal
set "BASE=%~1"
if "%BASE%"=="" set "BASE=http://localhost:3000"

echo [1/3] Fetch page and extract CSRF token

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$html = (Invoke-WebRequest -UseBasicParsing '%BASE%/').Content; if ($html -match 'name=""csrfToken"" value=""([^""]+)""') { $matches[1] }"`) do set "CSRF=%%i"

if "%CSRF%"=="" (
  echo Failed to parse csrfToken from server-rendered form
  exit /b 1
)

echo [2/3] CSRF token: %CSRF%
echo [3/3] POST with origin+csrf but empty captcha
curl.exe -sS -i -X POST "%BASE%/api/contact" ^
  -H "Origin: %BASE%" ^
  -H "Content-Type: application/json" ^
  -H "X-CSRF-Token: %CSRF%" ^
  --data "{\"name\":\"Local Test\",\"email\":\"test@example.com\",\"message\":\"this is a local test message\",\"website\":\"\",\"csrfToken\":\"%CSRF%\",\"captchaToken\":\"\"}"

echo.
echo Expected: HTTP 400 Missing captcha token
endlocal
