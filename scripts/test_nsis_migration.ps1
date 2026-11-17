# Ephemeral Windows packaging runners only; never launches the desktop application.
param([Parameter(Mandatory=$true)][string]$Installer)
$ErrorActionPreference = 'Stop'
$product = 'OpenBGA Toxicology LIMS'
$uninstallBase = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$current = "HKCU:\Software\OpenBGA\$product"
$pairs = @(@('Vibe Toxicology LIS project','Vibe Tox LIS'),@('OpenBGA','OpenBGA Tox'),@('OpenBGA','Steady State LIMS'))
$programs = [Environment]::GetFolderPath('Programs')
$desktop = [Environment]::GetFolderPath('Desktop')
$fixture = Join-Path $env:RUNNER_TEMP ('nsis-rename-' + [guid]::NewGuid())
$shell = New-Object -ComObject WScript.Shell
function Assert($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Link($Path, $Target) {
    $link = $shell.CreateShortcut($Path)
    $link.TargetPath = $Target
    $link.Save()
}
function Run-Installer([bool]$Update=$true, [bool]$Failure=$false, [string]$Directory='') {
    $arguments = @('/S','/NS')
    if ($Update) { $arguments += '/UPDATE' }
    if ($Directory) { $arguments += "/D=$Directory" } # NSIS requires /D last, without quotes.
    $process = Start-Process -FilePath $Installer -ArgumentList $arguments -PassThru -Wait
    Assert (($process.ExitCode -eq 0) -ne $Failure) "Unexpected installer exit $($process.ExitCode), expected failure: $Failure"
}
function Seed($Pair, [string]$Suffix='') {
    $publisher,$name = $Pair
    $directory = Join-Path $fixture ($name + $Suffix)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Set-Content "$directory\lis-desktop.exe" 'Synthetic previous executable; never execute'
    Set-Content "$directory\uninstall.exe" 'Synthetic previous uninstaller; never execute'
    Set-Content "$directory\data-sentinel" 'Preserve user data'
    $key = "HKCU:\Software\$publisher\$name"
    New-Item $key -Force | Out-Null
    Set-Item $key $directory
    $arp = "$uninstallBase\$name"
    New-Item $arp -Force | Out-Null
    New-ItemProperty $arp -Name Publisher -Value $publisher -Force | Out-Null
    New-ItemProperty $arp -Name MainBinaryName -Value 'lis-desktop.exe' -Force | Out-Null
    New-ItemProperty $arp -Name DisplayVersion -Value '0.1.1' -Force | Out-Null
    New-ItemProperty $arp -Name UninstallString -Value "`"$directory\uninstall.exe`"" -Force | Out-Null
    foreach ($location in @($programs,$desktop)) { Link "$location\$name.lnk" "$directory\lis-desktop.exe" }
    return $directory
}
function Remove-Seed($Pair) {
    $publisher,$name = $Pair
    Remove-Item "HKCU:\Software\$publisher\$name","$uninstallBase\$name" -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($location in @($programs,$desktop)) { Remove-Item "$location\$name.lnk" -Force -ErrorAction SilentlyContinue }
}
function Uninstall($Directory) {
    $process = Start-Process -FilePath "$Directory\uninstall.exe" -ArgumentList '/S',"_?=$Directory" -PassThru -Wait
    Assert ($process.ExitCode -eq 0) 'Uninstaller failed'
    Assert (-not (Test-Path "$Directory\lis-desktop.exe")) 'Executable was not removed'
    Assert (-not (Test-Path "$uninstallBase\$product")) 'Uninstall registration remains'
    # Stock Tauri retains the last installation path unless app-data deletion is selected.
    Assert ((Get-Item $current).GetValue('') -eq $Directory) 'Unexpected retained install location'
    Remove-Item $current -Recurse -Force
}
# Refuse to touch any existing installation, shortcut or application data on a reused runner.
foreach ($pair in $pairs) {
    Assert (-not (Test-Path "HKCU:\Software\$($pair[0])\$($pair[1])")) 'Legacy registration exists'
    Assert (-not (Test-Path "$uninstallBase\$($pair[1])")) 'Legacy uninstall registration exists'
    foreach ($location in @($programs,$desktop)) { Assert (-not (Test-Path "$location\$($pair[1]).lnk")) 'Legacy shortcut exists' }
}
foreach ($location in @($programs,$desktop)) { Assert (-not (Test-Path "$location\$product.lnk")) 'Current shortcut exists' }
Assert (-not (Test-Path $current)) 'Current installation exists'
Assert (-not (Test-Path "$uninstallBase\$product")) 'Current uninstall registration exists'
Assert (-not (Test-Path "$env:LOCALAPPDATA\$product")) 'Fresh installation directory exists'
$data = "$env:APPDATA\org.vibetox.lis"
Assert (-not (Test-Path $data)) 'Application data exists'
New-Item -ItemType Directory -Path $data,$fixture | Out-Null
Set-Content "$data\rename-sentinel" 'Synthetic application data'
# Every historical identity, through both the updater and manually downloaded installer.
foreach ($update in @($true,$false)) {
    foreach ($pair in $pairs) {
        $directory = Seed $pair
        $publisher,$name = $pair
        Run-Installer -Update $update
        Assert ((Get-Item $current).GetValue('') -eq $directory) 'Upgrade changed installation directory'
        Assert ((Get-Item "$directory\lis-desktop.exe").Length -gt 100000) 'Executable was not replaced'
        Assert (-not (Test-Path "$uninstallBase\$name")) 'Legacy uninstall entry remains'
        Assert (-not (Test-Path "HKCU:\Software\$publisher\$name")) 'Legacy installation entry remains'
        foreach ($location in @($programs,$desktop)) {
            Assert (-not (Test-Path "$location\$name.lnk")) 'Legacy shortcut remains'
            Assert ($shell.CreateShortcut("$location\$product.lnk").TargetPath -eq "$directory\lis-desktop.exe") 'Wrong shortcut target'
        }
        Run-Installer
        Assert ((Get-Item $current).GetValue('') -eq $directory) 'Repeat upgrade moved installation'
        Uninstall $directory
        Assert (Test-Path "$directory\data-sentinel") 'User data was removed'
        Assert ((Get-Content "$data\rename-sentinel") -eq 'Synthetic application data') 'Application data changed'
    }
}
# Distinct old roots and explicit unrelated /D paths must fail before replacing executable bytes.
$first = Seed $pairs[1] '-ambiguity'
$second = Seed $pairs[2] '-ambiguity'
Run-Installer -Failure $true
Assert ((Get-Content "$first\lis-desktop.exe") -match '^Synthetic') 'Ambiguous installation changed'
Assert ((Get-Content "$second\lis-desktop.exe") -match '^Synthetic') 'Ambiguous installation changed'
Remove-Seed $pairs[1]
Remove-Seed $pairs[2]
$directory = Seed $pairs[2] '-different'
Run-Installer -Failure $true -Directory (Join-Path $fixture 'different explicit directory')
Run-Installer -Failure $true -Directory "$env:LOCALAPPDATA\$product"
Assert ((Get-Content "$directory\lis-desktop.exe") -match '^Synthetic') 'Explicit path overwrote legacy executable'
Remove-Seed $pairs[2]
# A foreign current-name shortcut is never overwritten (manual or updater install).
$directory = Seed $pairs[2] '-shortcut'
Link "$programs\$product.lnk" "$fixture\foreign.exe"
foreach ($update in @($true,$false)) { Run-Installer -Update $update -Failure $true }
Assert ($shell.CreateShortcut("$programs\$product.lnk").TargetPath -eq "$fixture\foreign.exe") 'Foreign shortcut changed'
Assert ((Get-Content "$directory\lis-desktop.exe") -match '^Synthetic') 'Shortcut collision changed installation'
Remove-Item "$programs\$product.lnk" -Force
Remove-Seed $pairs[2]
# Reject malformed identity metadata as migration candidates, preserving that directory.
foreach ($field in @('Publisher','MainBinaryName','UninstallString')) {
    $directory = Seed $pairs[2] ('-invalid-' + $field)
    Set-ItemProperty "$uninstallBase\Steady State LIMS" -Name $field -Value 'Foreign registration'
    Run-Installer
    $fresh = (Get-Item $current).GetValue('')
    Assert ($fresh -eq "$env:LOCALAPPDATA\$product") 'Malformed registration selected'
    Assert ((Get-Content "$directory\lis-desktop.exe") -match '^Synthetic') 'Foreign executable changed'
    Uninstall $fresh
    Remove-Seed $pairs[2]
}
# Fresh installation plus a canonical-name registration takes priority over a separate former root.
Run-Installer -Update $false
$fresh = (Get-Item $current).GetValue('')
$directory = Seed $pairs[2] '-priority'
Run-Installer
Assert ((Get-Item $current).GetValue('') -eq $fresh) 'Canonical installation lost priority'
Assert ((Get-Content "$directory\lis-desktop.exe") -match '^Synthetic') 'Other legacy root changed'
Uninstall $fresh
Remove-Seed $pairs[2]
Assert ((Get-Content "$data\rename-sentinel") -eq 'Synthetic application data') 'Fresh uninstall changed data'
Remove-Item $data,$fixture -Recurse -Force
Write-Output 'NSIS legacy/manual/updater/repeat/uninstall and negative migration cases passed.'
