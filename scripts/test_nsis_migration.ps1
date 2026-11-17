# Runs only on an ephemeral Windows packaging runner. Never launches the desktop application.
param([Parameter(Mandatory=$true)][string]$Installer)
$ErrorActionPreference = 'Stop'
$product = 'OpenBGA Toxicology LIMS'
$uninstallBase = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$current = "HKCU:\Software\OpenBGA\$product"
$pairs = @(
    @('Vibe Toxicology LIS project', 'Vibe Tox LIS'),
    @('OpenBGA', 'OpenBGA Tox'),
    @('OpenBGA', 'Steady State LIMS')
)
$programs = [Environment]::GetFolderPath('Programs')
$desktop = [Environment]::GetFolderPath('Desktop')
$fixture = Join-Path $env:RUNNER_TEMP ('nsis-rename-' + [guid]::NewGuid())
$shell = New-Object -ComObject WScript.Shell
function Assert($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Run-Installer {
    $process = Start-Process -FilePath $Installer -ArgumentList '/S','/UPDATE','/NS' -PassThru -Wait
    Assert ($process.ExitCode -eq 0) "Installer failed: $($process.ExitCode)"
}
function Uninstall($Directory) {
    $process = Start-Process -FilePath "$Directory\uninstall.exe" -ArgumentList '/S',"_?=$Directory" -PassThru -Wait
    Assert ($process.ExitCode -eq 0) 'Uninstaller failed'
    Assert (-not (Test-Path "$Directory\lis-desktop.exe")) 'Executable was not removed'
    Assert (-not (Test-Path "$uninstallBase\$product")) 'New uninstall registration remains'
    # Tauri keeps the last install location unless data deletion is selected. Clear only our fixture key.
    Assert ((Get-Item $current).GetValue('') -eq $Directory) 'Unexpected retained install location'
    Remove-Item $current -Recurse -Force
}
# Refuse to touch any pre-existing installation or shortcut on a reused runner.
foreach ($pair in $pairs) {
    Assert (-not (Test-Path "HKCU:\Software\$($pair[0])\$($pair[1])")) 'Legacy registration already exists'
    Assert (-not (Test-Path "$uninstallBase\$($pair[1])")) 'Legacy uninstall registration already exists'
    foreach ($directory in @($programs,$desktop)) {
        Assert (-not (Test-Path "$directory\$($pair[1]).lnk")) 'Legacy shortcut already exists'
    }
}
foreach ($location in @($programs,$desktop)) {
    Assert (-not (Test-Path "$location\$product.lnk")) 'Current shortcut already exists'
}
Assert (-not (Test-Path $current)) 'Current installation already exists'
Assert (-not (Test-Path "$uninstallBase\$product")) 'Current uninstall registration already exists'
Assert (-not (Test-Path "$env:LOCALAPPDATA\$product")) 'Fresh installation directory already exists'
$data = "$env:APPDATA\org.vibetox.lis"
Assert (-not (Test-Path $data)) 'Application data already exists'
New-Item -ItemType Directory -Path $data | Out-Null
Set-Content "$data\rename-sentinel" 'Synthetic application data'
New-Item -ItemType Directory -Path $fixture | Out-Null
foreach ($pair in $pairs) {
    $publisher, $name = $pair
    $directory = Join-Path $fixture $name
    New-Item -ItemType Directory -Path $directory | Out-Null
    Set-Content "$directory\lis-desktop.exe" 'Synthetic previous executable; never execute'
    Set-Content "$directory\uninstall.exe" 'Synthetic previous uninstaller; never execute'
    Set-Content "$directory\data-sentinel" 'Preserve user data'
    $installKey = "HKCU:\Software\$publisher\$name"
    $arp = "$uninstallBase\$name"
    New-Item $installKey -Force | Out-Null
    Set-Item $installKey $directory
    New-Item $arp -Force | Out-Null
    New-ItemProperty $arp -Name Publisher -Value $publisher | Out-Null
    New-ItemProperty $arp -Name MainBinaryName -Value 'lis-desktop.exe' | Out-Null
    New-ItemProperty $arp -Name DisplayVersion -Value '0.1.1' | Out-Null
    New-ItemProperty $arp -Name UninstallString -Value "`"$directory\uninstall.exe`"" | Out-Null
    foreach ($location in @($programs,$desktop)) {
        $link = $shell.CreateShortcut("$location\$name.lnk")
        $link.TargetPath = "$directory\lis-desktop.exe"
        $link.Save()
    }
    Run-Installer
    Assert ((Get-Item $current).GetValue('') -eq $directory) 'Upgrade changed the registered directory'
    Assert ((Get-Item "$directory\lis-desktop.exe").Length -gt 100000) 'Legacy executable was not replaced'
    Assert (-not (Test-Path $arp)) 'Legacy uninstall entry remains'
    Assert (-not (Test-Path $installKey)) 'Legacy installation entry remains'
    foreach ($location in @($programs,$desktop)) {
        Assert (-not (Test-Path "$location\$name.lnk")) 'Legacy shortcut remains'
        Assert ($shell.CreateShortcut("$location\$product.lnk").TargetPath -eq "$directory\lis-desktop.exe") 'Shortcut points to wrong executable'
    }
    Run-Installer
    Assert ((Get-Item $current).GetValue('') -eq $directory) 'Repeated upgrade moved the installation'
    Assert (Test-Path "$directory\data-sentinel") 'Upgrade removed user data'
    Uninstall $directory
    Assert (Test-Path "$directory\data-sentinel") 'Uninstall removed non-package user data'
    Assert ((Get-Content "$data\rename-sentinel") -eq 'Synthetic application data') 'Application data changed'
}
# Fresh install follows the normal current-name path, without any former registration.
Run-Installer
$fresh = (Get-Item $current).GetValue('')
Assert ($fresh -eq "$env:LOCALAPPDATA\$product") 'Unexpected fresh installation location'
Uninstall $fresh
Assert ((Get-Content "$data\rename-sentinel") -eq 'Synthetic application data') 'Fresh uninstall changed data'
Remove-Item $data -Recurse -Force
Remove-Item $fixture -Recurse -Force
Write-Output 'All three legacy identities, custom directories, repeated upgrades, fresh install and uninstall passed.'
