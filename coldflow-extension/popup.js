/* ==========================================================
   popup.js  —  ColdFlow Extension Popup Controller
   Dashboard, Templates, Contacts, Sequences, Settings
   ========================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ---- Tabs ---- */
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      // Refresh data when switching tabs
      _refreshTab(tab.dataset.tab);
    });
  });

  /* ---- Init ---- */
  _initDashboard();
  _initTemplates();
  _initContacts();
  _initSequences();
  _initSettings();
  _checkPremium();

  /* ==========================================================
     Dashboard
     ========================================================== */

  async function _initDashboard() {
    const data = await _msg('get-dashboard-data');
    if (!data) return;

    _setText('stat-sent',     data.totalSent);
    _setText('stat-replied',  data.totalReplied);
    _setText('stat-rate',     data.replyRate + '%');
    _setText('stat-contacts', data.contactCount);

    _setText('daily-limit-text', `${data.dailySends} / ${data.dailyLimit}`);
    const pct = Math.min(100, Math.round((data.dailySends / data.dailyLimit) * 100));
    document.getElementById('daily-limit-fill').style.width = pct + '%';

    _setText('followup-count-value', data.pendingFollowUps);

    // Active sequences
    const seqs = await _msg('get-sequences');
    const activeSeqs = (seqs || []).filter(s => s.status === 'active');
    const container = document.getElementById('dashboard-sequences');
    if (activeSeqs.length === 0) {
      container.innerHTML = '<div class="empty-state">No active sequences</div>';
    } else {
      container.innerHTML = activeSeqs.map(s => `
        <div class="sequence-card">
          <div class="card-header">
            <span class="card-name">${_esc(s.name)}</span>
            <span class="badge badge-active">Active</span>
          </div>
          <div class="card-meta">
            <span>${(s.steps || []).length} steps</span>
            <span>${(s.enrollments || []).filter(e => e.status === 'active').length} active contacts</span>
          </div>
        </div>
      `).join('');
    }
  }

  /* ==========================================================
     Templates
     ========================================================== */

  let editingTemplateId = null;

  async function _initTemplates() {
    await _renderTemplates();

    document.getElementById('btn-new-template').addEventListener('click', async () => {
      const limits = await _msg('check-limits');
      if (!limits.premium && limits.limits && limits.limits.templates.hit) {
        _showBanner('template-limit-banner');
        return;
      }
      _showTemplateEditor(null);
    });

    document.getElementById('btn-cancel-template').addEventListener('click', _hideTemplateEditor);
    document.getElementById('btn-save-template').addEventListener('click', _saveTemplate);

    document.getElementById('template-search').addEventListener('input', (e) => {
      _renderTemplates(e.target.value);
    });
  }

  async function _renderTemplates(query) {
    const all = await _msg('get-templates') || [];
    const q = (query || '').toLowerCase();
    const filtered = q
      ? all.filter(t => t.name.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))
      : all;

    const container = document.getElementById('template-list');

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No templates found</div>';
      return;
    }

    container.innerHTML = filtered.map(t => `
      <div class="template-card" data-id="${t.id}">
        <div class="card-header">
          <span class="card-name">${_esc(t.name)}</span>
          <div class="card-actions">
            <button class="edit" title="Edit" data-id="${t.id}">&#9998;</button>
            ${t.isBuiltIn ? '' : `<button class="delete" title="Delete" data-id="${t.id}">&times;</button>`}
          </div>
        </div>
        <div class="card-category">${_esc(t.category || 'General')}</div>
        <div class="card-preview">${_esc(t.subject)}</div>
      </div>
    `).join('');

    container.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tpl = all.find(t => t.id === btn.dataset.id);
        if (tpl) _showTemplateEditor(tpl);
      });
    });

    container.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this template?')) {
          await _msg('delete-template', { id: btn.dataset.id });
          _renderTemplates(document.getElementById('template-search').value);
        }
      });
    });
  }

  function _showTemplateEditor(tpl) {
    const editor = document.getElementById('template-editor');
    editor.classList.remove('hidden');
    document.getElementById('template-list').classList.add('hidden');
    document.querySelector('#panel-templates .panel-toolbar').classList.add('hidden');

    if (tpl) {
      editingTemplateId = tpl.id;
      document.getElementById('editor-title').textContent = 'Edit Template';
      document.getElementById('tpl-name').value     = tpl.name || '';
      document.getElementById('tpl-category').value  = tpl.category || '';
      document.getElementById('tpl-subject').value   = tpl.subject || '';
      document.getElementById('tpl-body').value      = tpl.body || '';
    } else {
      editingTemplateId = null;
      document.getElementById('editor-title').textContent = 'New Template';
      document.getElementById('tpl-name').value     = '';
      document.getElementById('tpl-category').value  = '';
      document.getElementById('tpl-subject').value   = '';
      document.getElementById('tpl-body').value      = '';
    }
  }

  function _hideTemplateEditor() {
    document.getElementById('template-editor').classList.add('hidden');
    document.getElementById('template-list').classList.remove('hidden');
    document.querySelector('#panel-templates .panel-toolbar').classList.remove('hidden');
    editingTemplateId = null;
  }

  async function _saveTemplate() {
    const name     = document.getElementById('tpl-name').value.trim();
    const category = document.getElementById('tpl-category').value.trim();
    const subject  = document.getElementById('tpl-subject').value.trim();
    const body     = document.getElementById('tpl-body').value.trim();

    if (!name || !subject || !body) {
      alert('Name, subject, and body are required.');
      return;
    }

    const tpl = {
      id:        editingTemplateId || 'tpl-' + Date.now(),
      name,
      category,
      subject,
      body,
      isBuiltIn: false,
      createdAt: Date.now()
    };

    await _msg('save-template', tpl);
    _hideTemplateEditor();
    _renderTemplates();

    // Notify content script
    _notifyContentScript('templates-updated');
  }

  /* ==========================================================
     Contacts
     ========================================================== */

  let editingContactId = null;

  async function _initContacts() {
    await _renderContacts();

    document.getElementById('btn-new-contact').addEventListener('click', async () => {
      const limits = await _msg('check-limits');
      if (!limits.premium && limits.limits && limits.limits.contacts.hit) {
        _showBanner('contact-limit-banner');
        return;
      }
      _showContactEditor(null);
    });

    document.getElementById('btn-cancel-contact').addEventListener('click', _hideContactEditor);
    document.getElementById('btn-save-contact').addEventListener('click', _saveContact);

    document.getElementById('btn-import-csv').addEventListener('click', async () => {
      const limits = await _msg('check-limits');
      if (!limits.premium && limits.limits && limits.limits.contacts.hit) {
        _showBanner('contact-limit-banner');
        return;
      }
      document.getElementById('csv-file-input').click();
    });

    document.getElementById('csv-file-input').addEventListener('change', _handleCSVImport);

    document.getElementById('contact-search').addEventListener('input', (e) => {
      _renderContacts(e.target.value);
    });
  }

  async function _renderContacts(query) {
    const all = await _msg('get-contacts') || [];
    const q = (query || '').toLowerCase();
    const filtered = q
      ? all.filter(c =>
          (c.first_name || '').toLowerCase().includes(q) ||
          (c.last_name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q)
        )
      : all;

    const container = document.getElementById('contact-list');

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No contacts found</div>';
      return;
    }

    container.innerHTML = filtered.map(c => `
      <div class="contact-card" data-id="${c.id}">
        <div class="card-header">
          <span class="card-name">${_esc((c.first_name || '') + ' ' + (c.last_name || ''))}</span>
          <div class="card-actions">
            <button class="edit" title="Edit" data-id="${c.id}">&#9998;</button>
            <button class="delete" title="Delete" data-id="${c.id}">&times;</button>
          </div>
        </div>
        <div class="card-meta">
          <span>${_esc(c.email)}</span>
          ${c.company ? `<span>${_esc(c.company)}</span>` : ''}
          ${c.title ? `<span>${_esc(c.title)}</span>` : ''}
        </div>
        <div class="card-meta">
          ${c.status ? `<span class="badge badge-${c.status}">${c.status}</span>` : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ct = all.find(c => c.id === btn.dataset.id);
        if (ct) _showContactEditor(ct);
      });
    });

    container.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this contact?')) {
          await _msg('delete-contact', { id: btn.dataset.id });
          _renderContacts(document.getElementById('contact-search').value);
        }
      });
    });
  }

  function _showContactEditor(ct) {
    const editor = document.getElementById('contact-editor');
    editor.classList.remove('hidden');
    document.getElementById('contact-list').classList.add('hidden');
    document.querySelector('#panel-contacts .panel-toolbar').classList.add('hidden');

    if (ct) {
      editingContactId = ct.id;
      document.getElementById('contact-editor-title').textContent = 'Edit Contact';
      document.getElementById('ct-first').value   = ct.first_name || '';
      document.getElementById('ct-last').value    = ct.last_name || '';
      document.getElementById('ct-email').value   = ct.email || '';
      document.getElementById('ct-company').value = ct.company || '';
      document.getElementById('ct-title').value   = ct.title || '';
      document.getElementById('ct-custom1').value = ct.custom1 || '';
      document.getElementById('ct-custom2').value = ct.custom2 || '';
    } else {
      editingContactId = null;
      document.getElementById('contact-editor-title').textContent = 'Add Contact';
      ['ct-first', 'ct-last', 'ct-email', 'ct-company', 'ct-title', 'ct-custom1', 'ct-custom2'].forEach(id => {
        document.getElementById(id).value = '';
      });
    }
  }

  function _hideContactEditor() {
    document.getElementById('contact-editor').classList.add('hidden');
    document.getElementById('contact-list').classList.remove('hidden');
    document.querySelector('#panel-contacts .panel-toolbar').classList.remove('hidden');
    editingContactId = null;
  }

  async function _saveContact() {
    const email = document.getElementById('ct-email').value.trim();
    if (!email) {
      alert('Email is required.');
      return;
    }

    const contact = {
      id:         editingContactId || 'ct-' + Date.now(),
      first_name: document.getElementById('ct-first').value.trim(),
      last_name:  document.getElementById('ct-last').value.trim(),
      email,
      company:    document.getElementById('ct-company').value.trim(),
      title:      document.getElementById('ct-title').value.trim(),
      custom1:    document.getElementById('ct-custom1').value.trim(),
      custom2:    document.getElementById('ct-custom2').value.trim(),
      status:     'new',
      createdAt:  Date.now()
    };

    await _msg('save-contacts', contact);
    _hideContactEditor();
    _renderContacts();
  }

  async function _handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const result = ColdFlowCSV.parse(text);

    if (result.rows.length === 0) {
      _showCSVFeedback('No valid rows found in CSV.', 'error');
      return;
    }

    const validation = ColdFlowCSV.validate(result.headers);
    const normalizedHeaders = ColdFlowCSV.normalizeHeaders(result.headers);

    // Re-parse with normalized headers
    const contacts = result.rows.map(row => {
      const ct = { id: 'ct-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), status: 'new', createdAt: Date.now() };
      normalizedHeaders.forEach((h, i) => {
        const originalKey = result.headers[i];
        ct[h] = row[originalKey] || '';
      });
      return ct;
    });

    if (!validation.valid) {
      // Try with normalized headers
      const hasEmail = contacts.some(c => c.email);
      if (!hasEmail) {
        _showCSVFeedback('CSV must have an "email" column.', 'error');
        return;
      }
    }

    // Check limits
    const limits = await _msg('check-limits');
    if (!limits.premium && limits.limits) {
      const currentContacts = limits.limits.contacts.current;
      const maxContacts = limits.limits.contacts.max;
      const canImport = maxContacts - currentContacts;
      if (canImport <= 0) {
        _showCSVFeedback('Contact limit reached. Upgrade to Pro for unlimited contacts.', 'error');
        return;
      }
      if (contacts.length > canImport) {
        contacts.splice(canImport);
        _showCSVFeedback(`Free plan limit: only imported first ${canImport} contacts.`, 'error');
      }
    }

    await _msg('save-contacts', contacts);
    _showCSVFeedback(`Successfully imported ${contacts.length} contacts!`, 'success');
    _renderContacts();

    // Reset file input
    e.target.value = '';
  }

  function _showCSVFeedback(message, type) {
    const existing = document.querySelector('.csv-feedback');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = `csv-feedback csv-feedback-${type}`;
    el.textContent = message;
    document.getElementById('contact-list').before(el);

    setTimeout(() => el.remove(), 5000);
  }

  /* ==========================================================
     Sequences
     ========================================================== */

  let editingSequenceId = null;
  let seqStepCount = 0;

  async function _initSequences() {
    await _renderSequences();

    document.getElementById('btn-new-sequence').addEventListener('click', async () => {
      const limits = await _msg('check-limits');
      if (!limits.premium && limits.limits && limits.limits.activeSequences.hit) {
        _showBanner('sequence-limit-banner');
        return;
      }
      _showSequenceEditor(null);
    });

    document.getElementById('btn-cancel-sequence').addEventListener('click', _hideSequenceEditor);
    document.getElementById('btn-save-sequence').addEventListener('click', _saveSequence);
    document.getElementById('btn-add-step').addEventListener('click', () => _addStep());
  }

  async function _renderSequences() {
    const all = await _msg('get-sequences') || [];
    const container = document.getElementById('sequence-list');

    if (all.length === 0) {
      container.innerHTML = '<div class="empty-state">No sequences yet. Create one to start sending.</div>';
      return;
    }

    container.innerHTML = all.map(s => {
      const activeEnrollments = (s.enrollments || []).filter(e => e.status === 'active').length;
      const completedEnrollments = (s.enrollments || []).filter(e => e.status === 'completed').length;
      const repliedEnrollments = (s.enrollments || []).filter(e => e.status === 'replied').length;

      return `
        <div class="sequence-card" data-id="${s.id}">
          <div class="card-header">
            <span class="card-name">${_esc(s.name)}</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="badge badge-${s.status}">${s.status}</span>
              <div class="card-actions">
                ${s.status === 'active'  ? `<button class="pause-seq" title="Pause" data-id="${s.id}">&#9208;</button>` : ''}
                ${s.status === 'paused'  ? `<button class="resume-seq" title="Resume" data-id="${s.id}">&#9654;</button>` : ''}
                ${(s.status === 'active' || s.status === 'paused') ? `<button class="stop-seq" title="Stop" data-id="${s.id}">&#9632;</button>` : ''}
                <button class="delete" title="Delete" data-id="${s.id}">&times;</button>
              </div>
            </div>
          </div>
          <div class="card-meta">
            <span>${(s.steps || []).length} steps</span>
            <span>${activeEnrollments} active</span>
            <span>${completedEnrollments} completed</span>
            <span>${repliedEnrollments} replied</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.pause-seq').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await _msg('pause-sequence', { id: btn.dataset.id });
        _renderSequences();
      });
    });

    container.querySelectorAll('.resume-seq').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await _msg('resume-sequence', { id: btn.dataset.id });
        _renderSequences();
      });
    });

    container.querySelectorAll('.stop-seq').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Stop this sequence? This cannot be undone.')) {
          await _msg('stop-sequence', { id: btn.dataset.id });
          _renderSequences();
        }
      });
    });

    container.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this sequence permanently?')) {
          await _msg('delete-sequence', { id: btn.dataset.id });
          _renderSequences();
        }
      });
    });
  }

  async function _showSequenceEditor(seq) {
    const editor = document.getElementById('sequence-editor');
    editor.classList.remove('hidden');
    document.getElementById('sequence-list').classList.add('hidden');
    document.querySelector('#panel-sequences .panel-toolbar').classList.add('hidden');

    seqStepCount = 0;

    if (seq) {
      editingSequenceId = seq.id;
      document.getElementById('seq-editor-title').textContent = 'Edit Sequence';
      document.getElementById('seq-name').value = seq.name || '';
      document.getElementById('seq-steps').innerHTML = '';
      (seq.steps || []).forEach(step => _addStep(step));
    } else {
      editingSequenceId = null;
      document.getElementById('seq-editor-title').textContent = 'New Sequence';
      document.getElementById('seq-name').value = '';
      document.getElementById('seq-steps').innerHTML = '';
      _addStep(); // start with one step
    }

    // Load contacts into picker
    const contacts = await _msg('get-contacts') || [];
    const picker = document.getElementById('seq-contact-picker');
    if (contacts.length === 0) {
      picker.innerHTML = '<div class="empty-state">No contacts. Add contacts first.</div>';
    } else {
      picker.innerHTML = contacts.map(c => `
        <label class="contact-pick-item">
          <input type="checkbox" value="${c.id}" data-email="${_esc(c.email)}" data-fields='${JSON.stringify({ first_name: c.first_name || '', last_name: c.last_name || '', email: c.email || '', company: c.company || '', title: c.title || '', custom1: c.custom1 || '', custom2: c.custom2 || '' })}'>
          <span>${_esc((c.first_name || '') + ' ' + (c.last_name || ''))} &lt;${_esc(c.email)}&gt;</span>
        </label>
      `).join('');
    }
  }

  function _hideSequenceEditor() {
    document.getElementById('sequence-editor').classList.add('hidden');
    document.getElementById('sequence-list').classList.remove('hidden');
    document.querySelector('#panel-sequences .panel-toolbar').classList.remove('hidden');
    editingSequenceId = null;
  }

  function _addStep(existing) {
    seqStepCount++;
    const container = document.getElementById('seq-steps');
    const stepEl = document.createElement('div');
    stepEl.className = 'seq-step';
    stepEl.dataset.stepIndex = seqStepCount;

    const isFirst = seqStepCount === 1;

    stepEl.innerHTML = `
      <div class="seq-step-header">
        <span class="seq-step-num">Step ${seqStepCount}</span>
        ${!isFirst ? '<button class="remove-step" type="button">&times;</button>' : ''}
      </div>
      <label>Subject
        <input type="text" class="input step-subject" value="${_esc((existing && existing.subject) || '')}" placeholder="Subject line with {merge_fields}">
      </label>
      <label>Body
        <textarea class="textarea step-body" rows="4" placeholder="Email body with {merge_fields}">${_esc((existing && existing.body) || '')}</textarea>
      </label>
      ${!isFirst ? `
        <div class="delay-row">
          <span>Wait</span>
          <input type="number" class="input step-delay" min="1" max="30" value="${(existing && existing.delayDays) || 2}">
          <span>days after previous step</span>
        </div>
      ` : ''}
    `;

    const removeBtn = stepEl.querySelector('.remove-step');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        stepEl.remove();
        _renumberSteps();
      });
    }

    container.appendChild(stepEl);
  }

  function _renumberSteps() {
    const steps = document.querySelectorAll('#seq-steps .seq-step');
    steps.forEach((step, i) => {
      step.querySelector('.seq-step-num').textContent = `Step ${i + 1}`;
      step.dataset.stepIndex = i + 1;
    });
    seqStepCount = steps.length;
  }

  async function _saveSequence() {
    const name = document.getElementById('seq-name').value.trim();
    if (!name) {
      alert('Sequence name is required.');
      return;
    }

    // Collect steps
    const stepEls = document.querySelectorAll('#seq-steps .seq-step');
    const steps = [];
    for (const el of stepEls) {
      const subject = el.querySelector('.step-subject').value.trim();
      const body    = el.querySelector('.step-body').value.trim();
      const delayEl = el.querySelector('.step-delay');
      const delay   = delayEl ? parseInt(delayEl.value, 10) || 2 : 0;

      if (!subject || !body) {
        alert('Each step must have a subject and body.');
        return;
      }

      steps.push({ subject, body, delayDays: delay });
    }

    if (steps.length === 0) {
      alert('Add at least one step.');
      return;
    }

    // Collect enrolled contacts
    const checked = document.querySelectorAll('#seq-contact-picker input[type="checkbox"]:checked');
    const enrollments = Array.from(checked).map(cb => ({
      id:          'enr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      contactId:   cb.value,
      email:       cb.dataset.email,
      fields:      JSON.parse(cb.dataset.fields || '{}'),
      status:      'active',
      currentStep: 0,
      nextStepAt:  Date.now() // first step fires immediately (or on next alarm)
    }));

    if (enrollments.length === 0) {
      alert('Select at least one contact to enroll.');
      return;
    }

    const seq = {
      id:        editingSequenceId || 'seq-' + Date.now(),
      name,
      steps,
      enrollments,
      status:    'active',
      createdAt: Date.now()
    };

    await _msg('save-sequence', seq);
    _hideSequenceEditor();
    _renderSequences();
  }

  /* ==========================================================
     Settings
     ========================================================== */

  async function _initSettings() {
    const settings = await _msg('get-settings');
    document.getElementById('setting-daily-limit').value = settings.dailySendLimit || 50;

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
      const limit = parseInt(document.getElementById('setting-daily-limit').value, 10);
      if (isNaN(limit) || limit < 1 || limit > 500) {
        alert('Daily limit must be between 1 and 500.');
        return;
      }
      await _msg('save-settings', { dailySendLimit: limit });
      alert('Settings saved.');
    });

    document.getElementById('btn-activate-premium').addEventListener('click', async () => {
      // In a real extension this would open a payment flow.
      // For now, toggle premium on.
      if (confirm('Activate Premium? (This is a demo - no payment required.)')) {
        await _msg('set-premium', { premium: true });
        _checkPremium();
        alert('Premium activated! Enjoy unlimited templates, contacts, and sequences.');
      }
    });

    document.getElementById('btn-export-data').addEventListener('click', _exportData);
    document.getElementById('btn-clear-data').addEventListener('click', _clearData);
  }

  async function _exportData() {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coldflow-export-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function _clearData() {
    if (!confirm('This will delete ALL templates, contacts, sequences, and send history. Are you sure?')) return;
    if (!confirm('Last chance. This cannot be undone. Continue?')) return;
    await chrome.storage.local.clear();
    alert('All data cleared. Reloading...');
    location.reload();
  }

  /* ==========================================================
     Premium Check
     ========================================================== */

  async function _checkPremium() {
    const { premium } = await _msg('get-premium');
    const badge = document.getElementById('premium-badge');
    const status = document.getElementById('premium-status');

    if (premium) {
      badge.classList.remove('hidden');
      if (status) {
        status.innerHTML = `
          <p><strong style="color:#4f46e5;">Premium</strong> plan active.</p>
          <ul>
            <li>Unlimited templates</li>
            <li>Unlimited contacts</li>
            <li>Unlimited active sequences</li>
            <li>CSV import</li>
          </ul>
        `;
      }
    } else {
      badge.classList.add('hidden');
    }
  }

  /* ==========================================================
     Helpers
     ========================================================== */

  function _msg(type, data) {
    return chrome.runtime.sendMessage({ type, data });
  }

  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function _showBanner(id) {
    document.getElementById(id).classList.remove('hidden');
    setTimeout(() => {
      document.getElementById(id).classList.add('hidden');
    }, 5000);
  }

  function _refreshTab(tabName) {
    switch (tabName) {
      case 'dashboard':  _initDashboard(); break;
      case 'templates':  _renderTemplates(); break;
      case 'contacts':   _renderContacts(); break;
      case 'sequences':  _renderSequences(); break;
      case 'settings':   _initSettings(); break;
    }
  }

  async function _notifyContentScript(type) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {});
      }
    } catch (_) {
      // Content script may not be injected
    }
  }

  // Upgrade buttons
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      // Switch to settings tab and scroll to premium section
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));
      document.querySelector('[data-tab="settings"]').classList.add('active');
      document.querySelector('[data-tab="settings"]').setAttribute('aria-selected', 'true');
      document.getElementById('panel-settings').classList.add('active');
    });
  });
});
