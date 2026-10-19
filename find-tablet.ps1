
# 在局域网里寻找正在运行的知识图谱服务（默认端口 8777）
param([int]$Port = 8777, [switch]$NoOpen)
$ErrorActionPreference = "SilentlyContinue"

# 选“有默认路由”的那块网卡，避开 VMware / Hyper-V 虚拟网卡
$ifAlias = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1).InterfaceAlias
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias $ifAlias |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  Select-Object -First 1).IPAddress
if (-not $ip) { Write-Host "找不到本机局域网地址"; exit 1 }

$prefix = ($ip -split "\.")[0..2] -join "."
Write-Host "本机 $ip，扫描 $prefix.1-254 :$Port ..."

$items = @()
foreach ($i in 1..254) {
  $target = "$prefix.$i"
  $client = New-Object System.Net.Sockets.TcpClient
  $task = $client.ConnectAsync($target, $Port)
  $items += [pscustomobject]@{ ip = $target; client = $client; task = $task }
}

Start-Sleep -Milliseconds 600
$found = @()
foreach ($it in $items) {
  if ($it.client.Connected -and $it.ip -ne $ip) { $found += $it.ip }
  $it.client.Dispose()
}

if ($found.Count -eq 0) {
  Write-Host "只找到本机自己的服务，没有发现平板。"
  Write-Host "检查：平板 Termux 在跑吗？两台在同一个 WiFi 吗？平板 IP 在 Termux 启动输出里能看到。"
  exit 1
}
$url = "http://$($found[0]):$Port/"
Write-Host "找到：$url"
if (-not $NoOpen) { Start-Process $url }
