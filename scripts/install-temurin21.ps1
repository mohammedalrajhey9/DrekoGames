$dest = "$env:USERPROFILE\Downloads\temurin21.zip"
$uri = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse'
Write-Host "Downloading $uri to $dest"
Invoke-WebRequest -Uri $uri -OutFile $dest -UseBasicParsing
$destDir = "$env:LOCALAPPDATA\Programs\Temurin\jdk-21"
Write-Host "Extracting to $destDir"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null
Expand-Archive -Path $dest -DestinationPath $destDir -Force
$jdkPath = Get-ChildItem -Directory $destDir | Select-Object -First 1 | ForEach-Object { $_.FullName }
Write-Host "Detected JDK path: $jdkPath"
[Environment]::SetEnvironmentVariable('JAVA_HOME',$jdkPath,'User')
$currentPath = [Environment]::GetEnvironmentVariable('PATH','User')
if(-not $currentPath.Contains($jdkPath + '\\bin')){
    [Environment]::SetEnvironmentVariable('PATH',$currentPath + ';' + $jdkPath + '\\bin','User')
}
Write-Host "JAVA_HOME and PATH updated for current user. Verifying java -version..."
java -version
