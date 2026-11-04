param(
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Model,
    [ValidateRange(1,65535)][int]$DbPort = 55433,
    [string]$Materials
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Checked {
    param([scriptblock]$Command)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar: $Command" }
}

if (-not (Test-Path -LiteralPath '.env.docker')) { throw 'Execute npm run docker:setup primeiro.' }
$env:CHATGPT_TEST_DB_PORT = "$DbPort"
$json = node -e "const {readFileSync}=require('node:fs'); const {parseEnv}=require('node:util'); const cfg=parseEnv(readFileSync('.env.docker','utf8')); const url=new URL(cfg.DATABASE_URL); url.hostname='127.0.0.1'; url.port=process.env.CHATGPT_TEST_DB_PORT; const hostUrl=url.href; url.port='5432'; process.stdout.write(JSON.stringify({hostUrl,workerUrl:url.href,db:decodeURIComponent(url.pathname.slice(1)),secret:cfg.BETTER_AUTH_SECRET,email:cfg.DEMO_USER_EMAIL,password:cfg.DEMO_USER_PASSWORD}));"
if ($LASTEXITCODE -ne 0) { throw 'Confira DATABASE_URL no .env.docker.' }
$cfg = $json | ConvertFrom-Json
if (-not ($cfg.db -and $cfg.secret -and $cfg.email -and $cfg.password)) { throw 'Confira as credenciais demo e do banco no .env.docker.' }

$env:CHATGPT_TEST_SESSION_DIR = Join-Path $env:USERPROFILE '.travessia-chatgpt-test'
if (-not (Test-Path -LiteralPath (Join-Path $env:CHATGPT_TEST_SESSION_DIR 'session.json'))) {
    throw 'Conecte a conta em http://127.0.0.1:1455 antes de iniciar.'
}
if (-not $Materials) { $Materials = Join-Path $env:LOCALAPPDATA 'TravessiaChatGPT\materials' }
$env:CHATGPT_TEST_MATERIAL_DIR = (New-Item -ItemType Directory -Path $Materials -Force).FullName
$env:CHATGPT_TEST_WORKER_DB_URL = $cfg.workerUrl
$env:CHATGPT_MODEL = $Model

Invoke-Checked { docker compose --env-file .env.docker -f compose.yaml -f compose.chatgpt-local.yaml up -d --wait db }

$env:DATABASE_URL = $cfg.hostUrl
$env:DIRECT_URL = $cfg.hostUrl
$env:DEMO_DATABASE_NAME = $cfg.db
$env:DEMO_USER_EMAIL = $cfg.email
$env:DEMO_USER_PASSWORD = $cfg.password
$env:BETTER_AUTH_SECRET = $cfg.secret
$env:BETTER_AUTH_URL = 'http://127.0.0.1:3000'
$env:TRUSTED_WEB_ORIGIN = $env:BETTER_AUTH_URL
$env:NODE_ENV = 'development'
$env:DEMO_MODE = 'true'
$env:DEMO_ONLY = 'true'
$env:AI_ENABLED = 'true'
$env:API_HOST = '127.0.0.1'
$env:PORT = '3001'
$env:MATERIAL_STORAGE_DIR = $env:CHATGPT_TEST_MATERIAL_DIR
Remove-Item Env:SUPABASE_URL, Env:SUPABASE_STORAGE_SECRET -ErrorAction SilentlyContinue
Invoke-Checked { npm run db:migrate }
Invoke-Checked { npm run db:seed:demo }
Invoke-Checked { docker compose --env-file .env.docker -f compose.yaml -f compose.chatgpt-local.yaml up -d --wait --build material-worker }
Invoke-Checked { npm run dev:api }
