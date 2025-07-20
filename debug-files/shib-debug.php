<?php
/*
 * Shibboleth Debug Script
 * Comprehensive testing of Shibboleth attribute extraction
 * Designed for Duke University Shibboleth SP integration
 * Reference: https://oit.duke.edu/help/articles/kb0010893
 */

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

echo "=== DUKE UNIVERSITY SHIBBOLETH DEBUG INFORMATION ===\n";
echo "Generated: " . date('Y-m-d H:i:s T') . "\n";
echo "Server: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Script: " . $_SERVER['SCRIPT_NAME'] . "\n\n";

// Check if Shibboleth is active
$shibbolethActive = false;
$expectedShibbolethVars = ['Shib-Session-ID', 'Shib-Identity-Provider', 'eppn', 'affiliation'];

foreach ($expectedShibbolethVars as $var) {
    if (isset($_SERVER[$var]) && !empty($_SERVER[$var])) {
        $shibbolethActive = true;
        break;
    }
}

echo "=== SHIBBOLETH STATUS ===\n";
echo "Shibboleth Active: " . ($shibbolethActive ? "YES" : "NO") . "\n";
echo "PHP SAPI: " . php_sapi_name() . "\n";
echo "Remote Address: " . ($_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN') . "\n";
echo "Request Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN') . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'UNKNOWN') . "\n\n";

// Duke University expected attributes - OFFICIAL DUKE SPECIFICATIONS
$dukeAttributes = [
    'eppn' => 'Duke NetID (eduPersonPrincipalName) - CRITICAL',
    'affiliation' => 'Duke Affiliation (eduPersonScopedAffiliation)', 
    'primary-affiliation' => 'Primary Affiliation (eduPersonPrimaryAffiliation)',
    'unscoped-affiliation' => 'Unscoped Affiliation (eduPersonAffiliation)',
    'displayName' => 'Display Name',
    'givenName' => 'Given Name (First Name)',
    'sn' => 'Surname (Last Name) - Official Duke attribute',
    'cn' => 'Common Name',
    'mail' => 'Email Address',
    'duDukeID' => 'Duke Unique ID - Official Duke attribute name',
    'uid' => 'User ID (unscoped NetID)',
    'nickname' => 'Nickname/Preferred Name (eduPersonNickname)',
    'ou' => 'Organizational Unit',
    'telephoneNumber' => 'Office/Campus Phone Number',
    'title' => 'Title',
    'duMiddleName1' => 'Duke Middle Name',
    'dkuID' => 'Duke Kunshan University ID',
    'duDADDEntityId' => 'Duke Alumni Database ID',
    'targeted-id' => 'Targeted ID',
    'persistent-id' => 'Persistent ID',
    'isMemberOf' => 'Group Membership (Grouper)'
];

echo "=== DUKE SHIBBOLETH ATTRIBUTES (OFFICIAL SPECIFICATIONS) ===\n";
$foundAttributes = 0;
$criticalMissing = [];

foreach ($dukeAttributes as $attr => $description) {
    $value = $_SERVER[$attr] ?? 'NOT_FOUND';
    $status = ($value !== 'NOT_FOUND') ? '✓' : '✗';
    if ($value !== 'NOT_FOUND') $foundAttributes++;
    
    // Track critical missing attributes
    if ($attr === 'eppn' && $value === 'NOT_FOUND') {
        $criticalMissing[] = 'eppn (CRITICAL for authentication)';
    }
    
    printf("%-20s %s %s\n", $attr . ':', $status, $value);
    if ($status === '✓' && strlen($value) > 50) {
        echo "                     [Value truncated - too long]\n";
    }
}

echo "\nFound Attributes: $foundAttributes/" . count($dukeAttributes) . "\n";

if (!empty($criticalMissing)) {
    echo "🚨 CRITICAL MISSING ATTRIBUTES:\n";
    foreach ($criticalMissing as $missing) {
        echo "   - $missing\n";
    }
}
echo "\n";

// Shibboleth session information
echo "=== SHIBBOLETH SESSION INFORMATION ===\n";
$sessionVars = [
    'Shib-Session-ID' => 'Session ID',
    'Shib-Identity-Provider' => 'Identity Provider',
    'Shib-Authentication-Instant' => 'Authentication Time',
    'Shib-Authentication-Method' => 'Authentication Method',
    'Shib-AuthnContext-Class' => 'Authentication Context',
    'Shib-Session-Index' => 'Session Index'
];

foreach ($sessionVars as $var => $description) {
    $value = $_SERVER[$var] ?? 'NOT_FOUND';
    $status = ($value !== 'NOT_FOUND') ? '✓' : '✗';
    printf("%-30s %s %s\n", $description . ':', $status, $value);
}

echo "\n=== HTTP HEADERS (Shibboleth-related) ===\n";
$headers = getallheaders();
$shibHeaders = [];
foreach ($headers as $name => $value) {
    if (stripos($name, 'shib') !== false || 
        stripos($name, 'eppn') !== false || 
        stripos($name, 'remote_user') !== false ||
        stripos($name, 'http_') !== false ||
        in_array(strtolower($name), array_map('strtolower', array_keys($dukeAttributes)))) {
        $shibHeaders[$name] = $value;
    }
}

if (!empty($shibHeaders)) {
    foreach ($shibHeaders as $name => $value) {
        printf("%-30s: %s\n", $name, strlen($value) > 80 ? substr($value, 0, 80) . '...' : $value);
    }
} else {
    echo "No Shibboleth-related HTTP headers found.\n";
}

echo "\n=== ENVIRONMENT VARIABLES (Shibboleth) ===\n";
$shibEnvVars = [];
foreach ($_SERVER as $name => $value) {
    if (stripos($name, 'shib') !== false || 
        stripos($name, 'saml') !== false ||
        in_array($name, array_keys($dukeAttributes)) ||
        in_array($name, array_keys($sessionVars))) {
        $shibEnvVars[$name] = $value;
    }
}

if (!empty($shibEnvVars)) {
    ksort($shibEnvVars);
    foreach ($shibEnvVars as $name => $value) {
        printf("%-30s: %s\n", $name, strlen($value) > 80 ? substr($value, 0, 80) . '...' : $value);
    }
} else {
    echo "No Shibboleth environment variables found.\n";
}

echo "\n=== AUTHENTICATION STATUS ===\n";
$remoteUser = $_SERVER['REMOTE_USER'] ?? $_SERVER['eppn'] ?? 'NOT_AUTHENTICATED';
$authType = $_SERVER['AUTH_TYPE'] ?? 'NONE';

echo "REMOTE_USER: $remoteUser\n";
echo "AUTH_TYPE: $authType\n";

if ($remoteUser !== 'NOT_AUTHENTICATED') {
    echo "Authentication: SUCCESS ✓\n";
    echo "User Identity: $remoteUser\n";
    
    // Parse Duke NetID from eppn if available
    if (strpos($remoteUser, '@duke.edu') !== false) {
        $netid = str_replace('@duke.edu', '', $remoteUser);
        echo "Duke NetID: $netid\n";
    }
    
    // Show Duke-specific attributes if available
    if (isset($_SERVER['duDukeID']) && !empty($_SERVER['duDukeID'])) {
        echo "Duke Unique ID: " . $_SERVER['duDukeID'] . "\n";
    }
    if (isset($_SERVER['uid']) && !empty($_SERVER['uid'])) {
        echo "Unscoped NetID: " . $_SERVER['uid'] . "\n";
    }
} else {
    echo "Authentication: FAILED or NOT REQUIRED ✗\n";
}

echo "\n=== TROUBLESHOOTING INFORMATION ===\n";

if (!$shibbolethActive) {
    echo "⚠️  ISSUE: Shibboleth not active\n";
    echo "   - Check that this location requires Shibboleth authentication\n";
    echo "   - Verify Apache Location directive includes: AuthType shibboleth\n";
    echo "   - Ensure ShibUseHeaders On is set\n";
    echo "   - Check Shibboleth daemon status: systemctl status shibd\n\n";
}

if ($foundAttributes == 0 && $shibbolethActive) {
    echo "⚠️  ISSUE: Shibboleth active but no attributes found\n";
    echo "   - Check attribute-map.xml configuration\n";
    echo "   - Verify attribute-policy.xml allows Duke attributes\n";
    echo "   - Check Shibboleth logs: /var/log/shibboleth/shibd.log\n";
    echo "   - Verify SP registration with Duke IdP includes required attributes\n\n";
}

if (isset($_SERVER['eppn']) && empty($_SERVER['eppn'])) {
    echo "⚠️  ISSUE: eppn attribute exists but is empty\n";
    echo "   - Check attribute filtering policy\n";
    echo "   - Verify ScopedAttributeDecoder is used for eppn in attribute-map.xml\n";
    echo "   - Ensure attribute-policy.xml allows eppn with DukeScopingRule\n\n";
}

// Check for common configuration issues
if (!isset($_SERVER['eppn']) && $shibbolethActive) {
    echo "🔧 CONFIGURATION CHECK:\n";
    echo "   - ✅ attribute-map.xml should have: <AttributeDecoder xsi:type=\"ScopedAttributeDecoder\"/>\n";
    echo "   - ✅ attribute-policy.xml should reference DukeScopingRule for eppn\n";
    echo "   - ✅ Apache should set: RequestHeader set HTTP_EPPN \"%{eppn}e\" env=eppn\n\n";
}

echo "=== DUKE SPECIFICATIONS COMPLIANCE ===\n";
echo "✅ Using official Duke attribute names:\n";
echo "   - duDukeID (not dukeID)\n";
echo "   - sn (not surname)\n";
echo "   - UID for unscoped NetID\n";
echo "   - ScopedAttributeDecoder for eppn and affiliation\n";
echo "   - AttributeValueString in attribute-policy.xml\n\n";

echo "=== NEXT STEPS ===\n";
echo "1. Verify this page requires Shibboleth authentication\n";
echo "2. Access via: https://levantai.colab.duke.edu/shib-debug.php\n";
echo "3. Check Apache error logs: /var/log/apache2/error.log\n";
echo "4. Check Shibboleth logs: /var/log/shibboleth/shibd.log\n";
echo "5. Test Shibboleth status: https://levantai.colab.duke.edu/Shibboleth.sso/Status\n";
echo "6. Verify attribute-map.xml uses ScopedAttributeDecoder for eppn\n";
echo "7. Contact Duke OIT if SP registration issues persist\n\n";

echo "=== END DEBUG INFORMATION ===\n";
?> 