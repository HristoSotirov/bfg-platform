# Post-processing script to add @NotNull validation to UUID path parameters in generated API interfaces
# This script runs after OpenAPI Generator creates the API interfaces

$apiDir = Join-Path $PSScriptRoot "..\..\..\..\target\generated-sources\openapi\src\main\java\com\bfg\platform\gen\api"
$importLine = "import jakarta.validation.constraints.NotNull;"

# Mapping of parameter names to validation message keys
$uuidParamMessages = @{
    "userUuid" = "user.uuid.required"
    "clubUuid" = "club.uuid.required"
    "athleteUuid" = "athlete.uuid.required"
    "accreditationUuid" = "accreditation.uuid.required"
    "coachUuid" = "clubCoach.uuid.required"
    "photoUuid" = "athletePhoto.uuid.required"
}

if (-not (Test-Path $apiDir)) {
    Write-Host "API directory not found: $apiDir"
    exit 1
}

$filesModified = 0

Get-ChildItem -Path $apiDir -Filter "*Api.java" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    $lines = Get-Content $file
    $modified = $false
    $needsImport = $false
    
    # Check if file contains UUID path parameters
    if ($content -match '@PathVariable\("(\w+Uuid)"\)\s+UUID\s+\1') {
        $newLines = @()
        $importAdded = $false
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            
            # Check if this line contains a UUID path parameter
            if ($line -match '@PathVariable\("(\w+Uuid)"\)\s+UUID\s+\1') {
                $paramName = $matches[1]
                
                # Get validation message key
                $messageKey = $uuidParamMessages[$paramName]
                if (-not $messageKey) {
                    # Default message key if not found in mapping
                    $messageKey = "$($paramName -replace 'Uuid$', '').uuid.required"
                }
                
                # Check if @NotNull is already present
                if ($line -notmatch '@NotNull') {
                    # Add @NotNull annotation before @PathVariable
                    $annotation = "@NotNull(message = `"{$messageKey}`") "
                    $line = $line -replace '(@PathVariable)', "$annotation`$1"
                    $modified = $true
                    $needsImport = $true
                }
            }
            
            # Add import after the last import statement
            if (-not $importAdded -and $needsImport -and $line -match '^import ' -and $i + 1 -lt $lines.Count -and $lines[$i + 1] -notmatch '^import ') {
                # Check if import already exists
                if ($content -notmatch [regex]::Escape($importLine)) {
                    $newLines += $line
                    $newLines += $importLine
                    $importAdded = $true
                    continue
                }
            }
            
            $newLines += $line
        }
        
        if ($modified) {
            $newLines | Set-Content $file -Encoding UTF8
            $filesModified++
            Write-Host "Added @NotNull validation to UUID parameters in: $($_.Name)"
        }
    }
}

if ($filesModified -eq 0) {
    Write-Host "No files needed modification."
} else {
    Write-Host "Post-processing completed. Modified $filesModified file(s)."
}

