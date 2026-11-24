/**
 * preview.js — Inventory preview slider module
 *
 * Exports modular component functions for inventory preview DOM content
 * and button click handling.
 */

// ─── Inline styles for the standalone PDF tab ────────────────────────────────
const PDF_STYLES = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#182b25;padding:32px 40px;background:#fff}
h1{font-size:26px;text-transform:uppercase;margin:4px 0}
.eyebrow{font-size:11px;font-weight:850;letter-spacing:.13em;text-transform:uppercase;color:#2d7a5f;margin-bottom:4px}
.manifest-heading{text-align:center;padding-bottom:16px;margin-bottom:18px;border-bottom:2px solid #182b25}
.manifest-heading div{text-transform:uppercase;color:#445950;margin-top:4px}
.manifest-meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px;font-size:12px;color:#445950}
.summary{margin-bottom:18px;font-size:13px;line-height:1.7}
table{width:100%;border-collapse:collapse;font-size:12px}
th{padding:9px 12px;background:#f2f7f4;color:#445950;font-size:10px;letter-spacing:.06em;text-align:left;text-transform:uppercase;border-bottom:1px solid #d1ddd8}
td{padding:9px 12px;border-bottom:1px solid #e8eeeb;vertical-align:top}
td small{display:block;color:#65756f;font-size:10px;margin-top:3px}
tr:last-child td{border-bottom:none}
strong{font-weight:700}
.muted{color:#65756f}
@media print{
  body{padding:16px 20px}
  @page{margin:16mm 14mm;size:A4 landscape}
}
`.trim();

// ─── Shared row builder used by both slider and PDF tab ───────────────────────
function buildRows(entries = [], activeDriveId, { locationName, escapeHtml, formatPrice }) {
  return entries
    .filter(entry => entry.drive_id === activeDriveId)
    .map(entry => {
      const bookOrCategory = String(entry.title || `${entry.category} batch`).toUpperCase();
      const labelParts = [entry.reading_level, entry.condition].filter(Boolean);
      if (entry.parent_entry_id) labelParts.push('split row');
      const labelDetails = labelParts.join(' · ').toUpperCase();
      const donarName    = String(entry.donar_name || '—').toUpperCase();
      const originName   = String(locationName(entry.origin_location_id) || '').toUpperCase();
      const currentName  = String(locationName(entry.current_location_id) || '').toUpperCase();
      const decision     = String(entry.decision || '').toUpperCase();
      return (
        `<tr>` +
        `<td><strong>${escapeHtml(bookOrCategory)}</strong>` +
          (labelDetails ? `<small>${escapeHtml(labelDetails)}</small>` : '') +
        `</td>` +
        `<td>${entry.quantity}</td>` +
        `<td>${escapeHtml(originName)}</td>` +
        `<td>${escapeHtml(currentName)}</td>` +
        `<td>${formatPrice(entry.price)}</td>` +
        `<td><span style="font-size:15px;font-weight:600">${escapeHtml(decision)}</span></td>` +
        `<td>${escapeHtml(donarName)}</td>` +
        `</tr>`
      );
    })
    .join('');
}

// ─── Standalone full-page HTML for the "Open for PDF" new tab ────────────────
export function buildInventoryPreviewHtml({ drive = {}, metrics = {}, entries = [], activeDriveId, locationName, escapeHtml, formatPrice }) {
  const rows        = buildRows(entries, activeDriveId, { locationName, escapeHtml, formatPrice });
  const driveName   = escapeHtml(String(drive.name || '').toUpperCase());
  const partnerName = escapeHtml(String(drive.partner_name || '').toUpperCase());
  const destination = escapeHtml(String(drive.destination_description || '').toUpperCase());
  const count       = entries.length;

  return (
    `<!DOCTYPE html><html lang="en"><head>` +
    `<meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Inventory Report – ${driveName}</title>` +
    `<style>${PDF_STYLES}</style>` +
    `</head><body>` +
    `<header class="manifest-heading">` +
      `<p class="eyebrow">Book drive inventory</p>` +
      `<h1>${driveName}</h1>` +
      (partnerName ? `<div>${partnerName}</div>` : '') +
      (destination ? `<div>${destination}</div>` : '') +
    `</header>` +
    `<div class="manifest-meta">` +
      `<div><strong>Inventory report</strong> &nbsp;·&nbsp; ${count} record${count === 1 ? '' : 's'}</div>` +
      `<div>Generated: ${new Date().toLocaleString()}</div>` +
    `</div>` +
    `<p class="summary">` +
      `<strong>Total books:</strong> ${metrics.received ?? 0} &nbsp;&nbsp; ` +
      `<strong>Accepted:</strong> ${metrics.accepted ?? 0} &nbsp;&nbsp; ` +
      `<strong>Pending:</strong> ${metrics.pending ?? 0} &nbsp;&nbsp; ` +
      `<strong>Rejected:</strong> ${metrics.rejected ?? 0}` +
    `</p>` +
    `<table>` +
      `<thead><tr>` +
        `<th>Book / category</th><th>Qty</th><th>Origin</th>` +
        `<th>Current location</th><th>Price</th><th>Decision</th><th>Donar name</th>` +
      `</tr></thead>` +
      `<tbody>${rows || '<tr><td colspan="7" class="muted">No inventory records yet.</td></tr>'}</tbody>` +
    `</table>` +
    `</body></html>`
  );
}

// ─── Slider DOM content (injected into the side-slider modal) ─────────────────
export function buildPreviewSliderContent({ drive = {}, metrics = {}, entries = [], activeDriveId, locationName, escapeHtml, formatPrice }) {
  const rows        = buildRows(entries, activeDriveId, { locationName, escapeHtml, formatPrice });
  const driveName   = escapeHtml(String(drive.name || '').toUpperCase());
  const partnerName = escapeHtml(String(drive.partner_name || '').toUpperCase());
  const destination = escapeHtml(String(drive.destination_description || '').toUpperCase());
  const count       = entries.length;

  return (
    `<div class="manifest">` +
      `<header class="manifest-heading">` +
        `<p class="eyebrow">Book drive inventory</p>` +
        `<h1>${driveName}</h1>` +
        `<div>${partnerName}</div>` +
        `<div>${destination}</div>` +
      `</header>` +
      `<div class="manifest-meta">` +
        `<div><strong>Inventory report</strong><br>${count} record${count === 1 ? '' : 's'}</div>` +
        `<div>Generated: ${new Date().toLocaleString()}</div>` +
      `</div>` +
      `<p><strong>Total books:</strong> ${metrics.received ?? 0} &nbsp; ` +
        `<strong>Accepted:</strong> ${metrics.accepted ?? 0} &nbsp; ` +
        `<strong>Pending:</strong> ${metrics.pending ?? 0} &nbsp; ` +
        `<strong>Rejected:</strong> ${metrics.rejected ?? 0}</p>` +
      `<div class="table-wrap"><table>` +
        `<thead><tr>` +
          `<th>Book / category</th><th>Quantity</th><th>Origin</th>` +
          `<th>Current location</th><th>Price</th><th>Decision</th><th>Donar name</th>` +
        `</tr></thead>` +
        `<tbody>${rows || '<tr><td colspan="7" class="muted">No inventory records yet.</td></tr>'}</tbody>` +
      `</table></div>` +
      `<div class="form-actions no-print">` +
        `<button class="button" type="button" id="close-inventory-preview">Close</button>` +
        `<button class="button primary" type="button" id="open-preview-tab">Open for PDF</button>` +
      `</div>` +
    `</div>`
  );
}

// ─── Button click handlers wired to the rendered slider DOM ──────────────────
export function bindPreviewHandlers({ closeBoxModal, buildHtml }) {
  const closeButton = document.querySelector('#close-inventory-preview');
  if (closeButton) {
    closeButton.addEventListener('click', closeBoxModal);
  }

  const openTabButton = document.querySelector('#open-preview-tab');
  if (openTabButton) {
    openTabButton.addEventListener('click', () => {
      const html = buildHtml();
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const tab  = window.open(url, '_blank');
      if (tab) tab.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
}

// ─── Main factory: sets up preview click handler and DOM integration ─────────
export function initPreview({
  activeDrive,
  calculateMetrics,
  getEntries,
  locationName,
  escapeHtml,
  formatPrice,
  showBoxModal,
  closeBoxModal,
  ACTIVE_DRIVE_ID,
  button = document.querySelector('#preview-inventory'),
}) {
  function openInventoryPreview() {
    const drive   = activeDrive ? activeDrive() : {};
    const metrics = calculateMetrics ? calculateMetrics() : {};
    const entries = getEntries ? getEntries() : [];
    const ctx     = { drive, metrics, entries, activeDriveId: ACTIVE_DRIVE_ID, locationName, escapeHtml, formatPrice };

    const sliderContent = buildPreviewSliderContent(ctx);
    showBoxModal('Inventory preview', 'Book drive report', sliderContent, true);

    bindPreviewHandlers({
      closeBoxModal,
      buildHtml: () => buildInventoryPreviewHtml(ctx),
    });
  }

  const btn = typeof button === 'string' ? document.querySelector(button) : button;
  if (btn) {
    btn.addEventListener('click', openInventoryPreview);
  }

  return { openInventoryPreview };
}

if (typeof window !== 'undefined') {
  window.BookTrackerPreview = {
    buildInventoryPreviewHtml,
    buildPreviewSliderContent,
    bindPreviewHandlers,
    initPreview,
  };
}
