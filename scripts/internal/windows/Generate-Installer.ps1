param (
    
    # appname
    [string]$appname = 'MyApp'
)
$WixRoot = "$PSScriptRoot\wix311"
$tempAppRoot= "$PSScriptRoot\temp\$appname"
$appArtifacts = "$tempAppRoot\appArtifacts"
$installArtifacts = "$tempAppRoot\installArtifacts"
$installScripts = "$tempAppRoot\installScripts"
$Rootwsx = "$installScripts\Root.wxs"
$RootFragmentwsx = "$installScripts\RootFragment.wxs"


$RootWixObj = "$installScripts\Root.wixobj"
$RootFragWixObj = "$installScripts\RootFrag.wixobj"



pushd "$WixRoot"
.\heat.exe dir $appArtifacts -o  $installScripts\RootFragment.wxs -scom -frag -srd -sreg -gg -cg ApplicationFiles -dr ApplicationRootDirectory
.\candle.exe $Rootwsx  -ext WixUtilExtension -o "$installScripts\Root.wixobj" 
.\candle.exe $RootFragmentwsx -ext WixUtilExtension -o "$installScripts\RootFrag.wixobj"
.\light.exe $RootWixObj $RootFragWixObj  -ext WixUtilExtension -b "$appArtifacts" -b "$appArtifacts\Dependencies" -b "installArtifacts\InstallAppResources" -o "$tempAppRoot\$appname.msi" 
popd

