$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sdk  = "$env:LOCALAPPDATA\Android\Sdk"
$jdk  = "$env:LOCALAPPDATA\Android\jdk21"
$btJar = "$env:LOCALAPPDATA\Android\bundletool.jar"

$aapt2     = "$sdk\build-tools\35.0.0\aapt2.exe"
$d8        = "$sdk\build-tools\35.0.0\d8.bat"
$zipalign  = "$sdk\build-tools\35.0.0\zipalign.exe"
$apksigner = "$sdk\build-tools\35.0.0\apksigner.bat"
$androidJar = "$sdk\platforms\android-35\android.jar"

$java      = "$jdk\bin\java.exe"
$javac     = "$jdk\bin\javac.exe"
$jar       = "$jdk\bin\jar.exe"
$jarsigner = "$jdk\bin\jarsigner.exe"

$env:JAVA_HOME = $jdk

$appMain   = "$root\android\app\src\main"
$assetsDir = "$appMain\assets"
$resDir    = "$appMain\res"
$javaDir   = "$appMain\java"
$manifest  = "$appMain\AndroidManifest.xml"
$keystore  = "$root\release-key.jks"
$keyInfoFile = "$root\signing-key-info.txt"
$storePass = $env:ANDROID_KEYSTORE_PASSWORD
$keyAlias  = "currency-key"

if (-not $storePass -and (Test-Path $keyInfoFile)) {
    $keyInfoContent = Get-Content $keyInfoFile -Raw
    if ($keyInfoContent -match "storePassword\)\s*:\s*(\S+)") {
        $storePass = $Matches[1]
    }
    if ($keyInfoContent -match "keyAlias\)\s*:\s*(\S+)") {
        $keyAlias = $Matches[1]
    }
}
if (-not $storePass) {
    throw "Mot de passe du keystore introuvable. Definissez ANDROID_KEYSTORE_PASSWORD ou verifiez signing-key-info.txt."
}

$workDir   = "$root\android\build\work"
$outDir    = "$root\build-output"

Write-Output "1/6 Synchronisation des fichiers web dans assets/..."
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$webFiles = @(
    "index.html", "style.css", "app.js", "sw.js", "manifest.json",
    "privacy.html", "logo.svg", "icon-192x192.png", "icon-512x512.png",
    "icon-maskable-512x512.png", "apple-touch-icon.png"
)
foreach ($f in $webFiles) {
    Copy-Item "$root\$f" "$assetsDir\$f" -Force
}

if (Test-Path $workDir) { Remove-Item $workDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$workDir\compiled_res", "$workDir\gen", "$workDir\classes", "$workDir\dex", "$workDir\aab_base" | Out-Null
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Output "2/6 Compilation des ressources Android (aapt2)..."
& $aapt2 compile --dir $resDir -o "$workDir\compiled_res\res.zip"

# Link pour APK + génération de R.java
& $aapt2 link `
    -I $androidJar `
    --manifest $manifest `
    -A $assetsDir `
    --java "$workDir\gen" `
    --min-sdk-version 24 `
    --target-sdk-version 36 `
    --version-code 4 `
    --version-name "1.0.2" `
    -o "$workDir\unaligned.apk" `
    "$workDir\compiled_res\res.zip"

Write-Output "3/6 Compilation du code Java (javac + d8)..."
$javaSources = @(
    "$javaDir\com\landoltstudio\currencyconverter\MainActivity.java",
    "$workDir\gen\com\landoltstudio\currencyconverter\R.java"
)
& $javac --release 17 -cp $androidJar -d "$workDir\classes" $javaSources

$classFiles = Get-ChildItem -Path "$workDir\classes" -Filter "*.class" -Recurse | ForEach-Object { $_.FullName }
& $d8 --release --lib $androidJar --min-api 24 --output "$workDir\dex" $classFiles

Write-Output "4/6 Assemblage et signature du fichier .APK (pour tester sur telephone)..."
Copy-Item "$workDir\dex\classes.dex" "$workDir\classes.dex" -Force
Push-Location $workDir
& $jar u0f "$workDir\unaligned.apk" "classes.dex"
Pop-Location

$finalApk = "$outDir\Simple-Currency-Converter.apk"
if (Test-Path $finalApk) { Remove-Item $finalApk -Force }
& $zipalign -f -P 16 4 "$workDir\unaligned.apk" $finalApk
& $apksigner sign --ks $keystore --ks-key-alias $keyAlias --ks-pass "pass:$storePass" --key-pass "pass:$storePass" $finalApk
& $apksigner verify $finalApk

Write-Output "5/6 Assemblage du module de base au format Protobuf pour Google Play (.AAB)..."
& $aapt2 link `
    --proto-format `
    -I $androidJar `
    --manifest $manifest `
    -A $assetsDir `
    --min-sdk-version 24 `
    --target-sdk-version 36 `
    --version-code 4 `
    --version-name "1.0.2" `
    -o "$workDir\proto_base.zip" `
    "$workDir\compiled_res\res.zip"

Expand-Archive -Path "$workDir\proto_base.zip" -DestinationPath "$workDir\aab_base" -Force
New-Item -ItemType Directory -Force -Path "$workDir\aab_base\manifest", "$workDir\aab_base\dex" | Out-Null
Move-Item "$workDir\aab_base\AndroidManifest.xml" "$workDir\aab_base\manifest\AndroidManifest.xml" -Force
Copy-Item "$workDir\dex\classes.dex" "$workDir\aab_base\dex\classes.dex" -Force

$baseModuleZip = "$workDir\base.zip"
Push-Location "$workDir\aab_base"
& $jar cMf $baseModuleZip *
Pop-Location

Write-Output "6/6 Generation et signature du fichier .AAB (pour le Google Play Store)..."
$finalAab = "$outDir\Simple-Currency-Converter.aab"
if (Test-Path $finalAab) { Remove-Item $finalAab -Force }
$mapFile = "$workDir\proguard.map"
Set-Content -Path $mapFile -Value "# compiler: R8`n# compiler_version: 8.7`n# min_api: 24`ncom.landoltstudio.currencyconverter.MainActivity -> com.landoltstudio.currencyconverter.MainActivity:`n" -Encoding UTF8
& $java -jar $btJar build-bundle --modules=$baseModuleZip --output=$finalAab --metadata-file="com.android.tools.build.obfuscation/proguard.map:$mapFile"
& $jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore $keystore -storepass $storePass -keypass $storePass $finalAab $keyAlias

Write-Output ""
Write-Output "========================================================="
Write-Output "BUILD REUSSI !"
Get-ChildItem $outDir | Select-Object Name, Length, LastWriteTime
Write-Output "========================================================="
