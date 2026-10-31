"use strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Conservative desktop responsiveness fixes.
 * These edits intentionally avoid changing accounting calculations, storage,
 * synchronization intervals, or any Supabase requests.
 */
export function applyPerformancePatch(webRoot, mode) {
  const report = { mode, applied: [], skipped: [] };
  const indexPath = path.join(webRoot, "index.html");

  if (mode === "one") {
    let html = fs.readFileSync(indexPath, "utf8");
    const oldHandler = "document.addEventListener('input',e=>{if(e.target.id==='searchInput')updateSearch(e.target.value)});";
    const newHandler = "let zaviSearchDebounceTimer;document.addEventListener('input',e=>{if(e.target.id==='searchInput'){clearTimeout(zaviSearchDebounceTimer);const value=e.target.value;zaviSearchDebounceTimer=setTimeout(()=>updateSearch(value),140)}});";
    if (!html.includes(oldHandler)) {
      throw new Error("Performance patch could not find the expected ZAVI ONE search handler; refusing an unsafe partial patch.");
    }
    html = html.replace(oldHandler, newHandler);
    fs.writeFileSync(indexPath, html);
    report.applied.push("Debounced search re-render by 140ms to avoid rebuilding large result tables on every keystroke.");
  }

  if (mode === "admin") {
    const changes = [
      ["account-control.js", "setInterval(init,2000)", "setInterval(init,5000)", "Reduced repeated account-controls DOM polling from 2s to 5s."],
      ["admin-portal.js", "setInterval(ensure,1700)", "setInterval(ensure,5000)", "Reduced repeated admin portal DOM polling from 1.7s to 5s."]
    ];
    for (const [file, before, after, description] of changes) {
      const p = path.join(webRoot, file);
      if (!fs.existsSync(p)) throw new Error("Performance patch expected file is missing: " + file);
      const source = fs.readFileSync(p, "utf8");
      if (!source.includes(before)) throw new Error("Performance patch could not find expected polling timer in " + file + "; refusing an unsafe partial patch.");
      fs.writeFileSync(p, source.replace(before, after));
      report.applied.push(description);
    }
  }

  if (!report.applied.length) throw new Error("No performance changes applied for mode: " + mode);
  fs.writeFileSync(path.join(webRoot, "PERFORMANCE_PATCH_REPORT.json"), JSON.stringify({
    title: "ZAVI Windows conservative responsiveness patch",
    mode,
    generatedAt: new Date().toISOString(),
    applied: report.applied,
    safety: "Accounting logic, stored records, authentication, and cloud sync intervals were not changed.",
    note: "These changes target search typing and repeated DOM polling. They do not by themselves guarantee that every database or device bottleneck is resolved."
  }, null, 2));
  return report;
}
