$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api"
$pass = 0; $fail = 0
function Check($name, $cond, $detail) {
  if ($cond) { Write-Output "PASS  $name"; $script:pass++ }
  else { Write-Output "FAIL  $name  ($detail)"; $script:fail++ }
}
function Api($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers; ErrorAction = "Stop" }
  if ($body -ne $null) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Depth 10) }
  return Invoke-RestMethod @params
}

# 1. Health
$h = Api GET "/health" $null
Check "health" ($h.status -eq "ok" -and $h.db -eq "connected") $h.status

# 2. Unauthenticated access rejected
try { Api GET "/intelligence/dashboard" $null; Check "auth-guard-401" $false "was allowed" }
catch { Check "auth-guard-401" ($_.Exception.Response.StatusCode.value__ -eq 401) $_.Exception.Response.StatusCode }

# 3. Register a brand-new organization
$email = "flow.test.$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@test.dev"
$reg = Api POST "/auth/register" $null @{
  name = "Flow Tester"; email = $email; password = "testpass123"
  organizationName = "Flow Test Org"
}
Check "register" ($reg.token -and $reg.user.email -eq $email) "no token"

# 4. Login with new credentials
$login = Api POST "/auth/login" $null @{ email = $email; password = "testpass123" }
Check "login-new-org" ($login.token -and $login.user.role -eq "ORG_ADMIN") $login.user.role

# 5. New org has empty dashboard (no crash on empty state)
$d = Api GET "/intelligence/dashboard" $login.token
Check "empty-dashboard" ($d.totals.roles -eq 0 -and $d.totals.recommendations -eq 0) "roles=$($d.totals.roles)"

# 6. New org - intelligence endpoints return empty arrays, no errors
$fs = Api GET "/intelligence/future-skills" $login.token
$ds = Api GET "/intelligence/declining-skills" $login.token
$rs = Api GET "/intelligence/reskilling" $login.token
$rc = Api GET "/recommendations" $login.token
Check "empty-future-skills" ($fs.futureSkills.Count -eq 0) "count=$($fs.futureSkills.Count)"
Check "empty-declining" ($ds.decliningSkills.Count -eq 0) "count=$($ds.decliningSkills.Count)"
Check "empty-reskilling" ($rs.reskilling.Count -eq 0) "count=$($rs.reskilling.Count)"
Check "empty-recs" ($rc.recommendations.Count -eq 0) "count=$($rc.recommendations.Count)"

# 7. New org - assistant query works with template fallback
$a = Api POST "/assistant/query" $login.token @{ question = "What is our reskilling priority?" }
Check "assistant-empty-org" ($a.answer -and $a.provider -eq "template") "provider=$($a.provider)"

# 8. New org - recompute on empty data is safe
$rr = Api POST "/intelligence/recompute" $login.token
Check "recompute-empty" ($rr.ok -eq $true) "ok=$($rr.ok)"

# 9. Meta endpoints
$ind = Api GET "/meta/industries" $login.token
Check "industries" ($ind.industries.Count -gt 0) "count=$($ind.industries.Count)"
$cls = Api GET "/meta/classifications" $login.token
Check "classifications" ($cls.classifications.Count -gt 0) "count=$($cls.classifications.Count)"

# 10. Import into the new org (role-skills CSV) - full flow
$csv = "role,skill`nFlow Engineer,Python`nFlow Engineer,Flow Automation"
$imp = Api POST "/data/import" $login.token @{ entityType = "role-skills"; filename = "flow.csv"; content = $csv }
Check "import-execute" ($imp.status -eq "COMPLETED" -and $imp.validRows -eq 2) "status=$($imp.status)"
$imps = Api GET "/data/imports" $login.token
Check "import-history" ($imps.imports.Count -eq 1) "count=$($imps.imports.Count)"

# 11. Import created role-skill links (role-skills import does not create processes)
$roles = Api GET "/roles" $login.token
Check "roles-after-import" ($roles.roles.Count -ge 1) "count=$($roles.roles.Count)"
$skills = Api GET "/skills" $login.token
Check "skills-after-import" ($skills.skills.Count -ge 1) "count=$($skills.skills.Count)"

# 12. Now demo admin - rich data flow
$adminLogin = Api POST "/auth/login" $null @{ email = "admin@novatech.demo"; password = "demo1234" }
$t = $adminLogin.token
$dash = Api GET "/intelligence/dashboard" $t
Check "dashboard-rich" ($dash.totals.roles -eq 5 -and $dash.totals.recommendations -gt 0) "roles=$($dash.totals.roles) recs=$($dash.totals.recommendations)"

$fs2 = Api GET "/intelligence/future-skills" $t
Check "future-skills-rich" ($fs2.futureSkills.Count -gt 0) "count=$($fs2.futureSkills.Count)"
$ds2 = Api GET "/intelligence/declining-skills" $t
Check "declining-rich" ($ds2.decliningSkills.Count -gt 0) "count=$($ds2.decliningSkills.Count)"
$rs2 = Api GET "/intelligence/reskilling" $t
Check "reskilling-rich" ($rs2.reskilling.Count -gt 0) "count=$($rs2.reskilling.Count)"
$rc2 = Api GET "/recommendations" $t
Check "recommendations-rich" ($rc2.recommendations.Count -gt 0) "count=$($rc2.recommendations.Count)"

# 13. Recommendation detail with reasoning chain + evidence
$det = Api GET "/recommendations/$($rc2.recommendations[0].id)" $t
Check "recommendation-detail" ($det.reasoningChain.Count -gt 0 -and $det.evidence.Count -gt 0) "chain=$($det.reasoningChain.Count) ev=$($det.evidence.Count)"

# 14. Role intelligence
$roles = Api GET "/roles" $t
$ri = Api GET "/intelligence/role/$($roles.roles[0].id)" $t
Check "role-intelligence" ($ri.currentSkills.Count -gt 0 -and $ri.reskilling.score -gt 0) "skills=$($ri.currentSkills.Count)"

# 15. Process intelligence
$procs = Api GET "/processes" $t
$pi = Api GET "/intelligence/process/$($procs.processes[0].id)" $t
Check "process-intelligence" ($pi.activities.Count -gt 0) "activities=$($pi.activities.Count)"

# 16. Explorer
$ex = Api GET "/explorer" $t
Check "explorer" ($ex.processes.Count -ge 1) "processes=$($ex.processes.Count)"

# 17. Assistant rich query
$a2 = Api POST "/assistant/query" $t @{ question = "Which future skills should a QA Engineer learn?" }
Check "assistant-rich" ($a2.answer -and $a2.provider -eq "template") "provider=$($a2.provider)"

# 18. Interactions logged
$int = Api GET "/assistant/interactions" $t
Check "interactions" ($int.interactions.Count -gt 0) "count=$($int.interactions.Count)"

# 19. Knowledge list
$k = Api GET "/knowledge" $t
Check "knowledge-list" ($k.sources.Count -gt 0) "count=$($k.sources.Count)"

# 20. Admin endpoints (ORG_ADMIN is super admin)
$m = Api GET "/admin/metrics" $t
Check "admin-metrics" ($m.counts -ne $null -and $m.counts.organizations -gt 0) "orgs=$($m.counts.organizations)"
$logs = Api GET "/admin/logs" $t
Check "admin-logs" ($logs.logs.Count -gt 0) "count=$($logs.logs.Count)"
$fb = Api GET "/admin/feedback" $t
Check "admin-feedback" ($fb.stats -ne $null -and $fb.stats.total -ge 0) "total=$($fb.stats.total)"

# 21. Bad login rejected
try { Api POST "/auth/login" $null @{ email = "admin@novatech.demo"; password = "wrong" }; Check "bad-login" $false "was allowed" }
catch { Check "bad-login" ($_.Exception.Response.StatusCode.value__ -eq 401) $_.Exception.Response.StatusCode }

# 22. Validation error handled gracefully (import missing columns)
try { Api POST "/data/import" $t @{ entityType = "role-skills"; filename = "bad.csv"; content = "foo,bar`n1,2" }; Check "import-validation" $false "was allowed" }
catch { Check "import-validation" ($_.Exception.Response.StatusCode.value__ -eq 400) $_.Exception.Response.StatusCode }

Write-Output ""
Write-Output "====================="
Write-Output "TOTAL: $pass passed, $fail failed"
Write-Output "====================="
if ($fail -gt 0) { exit 1 }
