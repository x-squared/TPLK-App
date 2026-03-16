from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from ..auth import require_permission
from ..config import get_config
from ..features.interfaces.patients_client import (
    cancel_mock_operation,
    clear_closed_mock_operations,
    complete_mock_operation,
    delete_mock_operation,
    fail_mock_operation,
    get_mock_operation,
    get_patient,
    list_mock_operations,
    list_conditions,
)
from ..features.interfaces.patients_client.dto import ConditionDto, PatientDto
from ..features.interfaces.patients_client.results import PendingResult, ReadyResult
from ..models import User

router = APIRouter(prefix="/interfaces/patients", tags=["patient_interface"])
NO_STORE_HEADERS = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}


class MockOperationCompleteRequest(BaseModel):
    payload: dict | list


class MockOperationErrorRequest(BaseModel):
    status_code: int = 500
    error_code: str = "MOCK_ERROR"
    detail: str = "Mock operation returned an error."


class MockTriggerPatientRequest(BaseModel):
    patient_id: str


class MockTriggerConditionsRequest(BaseModel):
    patient_id: str
    date_from: str | None = None
    date_to: str | None = None


def _to_http_response(result: ReadyResult | PendingResult):
    if isinstance(result, PendingResult):
        return JSONResponse(status_code=202, content=result.operation.model_dump())
    return result.data


def _ensure_dev_mode() -> None:
    if get_config().env.strip().upper() != "DEV":
        raise HTTPException(status_code=404, detail="Mock interface operations are available only in DEV.")


def _build_mock_operation_form_html(operation: dict) -> str:
    operation_id = operation["operation_id"]
    import json
    import html

    schema_json = operation.get("schema") or {}
    schema_text = json.dumps(schema_json, indent=2)
    schema_for_script = json.dumps(schema_json)
    sample_payload = operation.get("sample_payload")
    sample_payload_for_script = json.dumps(sample_payload if sample_payload is not None else {})
    schema_text_html = html.escape(schema_text)
    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Mock Operation {operation_id}</title>
    <style>
      body {{ font-family: sans-serif; margin: 24px; max-width: 980px; }}
      pre {{ background: #f6f8fa; padding: 12px; overflow: auto; }}
      .row {{ display: flex; gap: 12px; margin-top: 10px; }}
      input, button {{ padding: 8px; }}
      .field {{ margin-bottom: 12px; }}
      .field label {{ display: block; font-weight: 600; margin-bottom: 4px; }}
      .field input, .field select {{ width: 100%; box-sizing: border-box; }}
      .group {{ border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; }}
      .array-item {{ border: 1px dashed #ccc; padding: 12px; margin-bottom: 10px; border-radius: 6px; }}
      .small {{ font-size: 0.9rem; color: #555; }}
    </style>
  </head>
  <body>
    <h2>Mock operation: {operation_id}</h2>
    <p>Status: <strong>{operation.get("status", "pending")}</strong></p>
    <p>Operation type: <strong>{operation.get("operation_type", "")}</strong></p>
    <h3>Payload form</h3>
    <p class="small">Fill the fields below. Required fields are marked with *.</p>
    <div id="formRoot"></div>
    <div class="row">
      <button onclick="submitPayload()">Submit payload</button>
    </div>
    <h3>Send error</h3>
    <div class="row">
      <input id="statusCode" type="number" value="500" />
      <input id="errorCode" value="MOCK_ERROR" />
      <input id="errorDetail" value="Mock operation returned an error." />
      <button onclick="sendError()">Send error</button>
    </div>
    <h3>Cancel operation</h3>
    <div class="row">
      <button onclick="cancelOperation()">Cancel this operation</button>
      <button onclick="goToDashboard()">Back to dashboard</button>
    </div>
    <h3>Trigger new service call</h3>
    <div class="row">
      <input id="triggerPatientId" placeholder="patient_id (e.g. pat_1)" />
      <button onclick="triggerPatient()">Trigger patient call</button>
    </div>
    <div class="row">
      <input id="triggerConditionsPatientId" placeholder="patient_id (e.g. pat_1)" />
      <input id="triggerDateFrom" placeholder="date_from (DD.MM.YYYY, optional)" />
      <input id="triggerDateTo" placeholder="date_to (DD.MM.YYYY, optional)" />
      <button onclick="triggerConditions()">Trigger conditions call</button>
    </div>
    <h3>Expected schema (information only)</h3>
    <pre id="schema">{schema_text_html}</pre>
    <pre id="result"></pre>
    <script type="application/json" id="schemaData">{schema_for_script}</script>
    <script type="application/json" id="sampleData">{sample_payload_for_script}</script>
    <script>
      const opId = {operation_id!r};
      const schema = JSON.parse(document.getElementById('schemaData').textContent);
      const sampleData = JSON.parse(document.getElementById('sampleData').textContent);
      function cloneValue(value) {{
        try {{
          return JSON.parse(JSON.stringify(value));
        }} catch (_e) {{
          return value;
        }}
      }}
      let formData = cloneValue(sampleData);

      function resolveSchema(schemaNode) {{
        if (!schemaNode || typeof schemaNode !== 'object') return schemaNode;
        if (schemaNode.$ref && typeof schemaNode.$ref === 'string') {{
          const m = schemaNode.$ref.match(/^#\\/\\$defs\\/(.+)$/);
          if (m && schema.$defs && schema.$defs[m[1]]) {{
            return resolveSchema(schema.$defs[m[1]]);
          }}
        }}
        return schemaNode;
      }}

      function setResult(text) {{
        document.getElementById('result').textContent = text;
      }}
      function formatDateEuropean(raw) {{
        const value = String(raw ?? '').trim();
        if (!value) return '';
        const dateOnly = value.match(/^(\\d{{4}})-(\\d{{2}})-(\\d{{2}})$/);
        if (dateOnly) {{
          return `${{dateOnly[3]}}.${{dateOnly[2]}}.${{dateOnly[1]}}`;
        }}
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return value;
        return `${{String(dt.getDate()).padStart(2, '0')}}.${{String(dt.getMonth() + 1).padStart(2, '0')}}.${{dt.getFullYear()}}`;
      }}
      function toIsoDateFromEuropean(raw) {{
        const value = String(raw ?? '').trim();
        if (!value) return value;
        const european = value.match(/^(\\d{{2}})\\.(\\d{{2}})\\.(\\d{{4}})$/);
        if (european) {{
          return `${{european[3]}}-${{european[2]}}-${{european[1]}}`;
        }}
        return value;
      }}
      function goToDashboard() {{
        window.location.assign('/api/interfaces/patients/mock/dashboard');
      }}

      function isRequired(schemaObj, key) {{
        return Boolean(schemaObj && Array.isArray(schemaObj.required) && schemaObj.required.includes(key));
      }}

      function ensurePath(obj, path) {{
        let cur = obj;
        for (let i = 0; i < path.length - 1; i += 1) {{
          const p = path[i];
          if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {{}};
          cur = cur[p];
        }}
        return cur;
      }}

      function setValue(path, value) {{
        if (!path.length) {{
          formData = value;
          return;
        }}
        const parent = ensurePath(formData, path);
        parent[path[path.length - 1]] = value;
      }}

      function getValue(path, fallback = '') {{
        let cur = formData;
        for (const p of path) {{
          if (cur == null) return fallback;
          cur = cur[p];
        }}
        return cur ?? fallback;
      }}

      function typedValue(raw, type) {{
        if (raw === '' || raw == null) return null;
        if (type === 'integer' || type === 'number') return Number(raw);
        if (type === 'boolean') return Boolean(raw);
        return String(raw);
      }}
      function enumValuesForSchema(fieldSchema) {{
        const resolved = resolveSchema(fieldSchema) || {{}};
        if (Array.isArray(resolved.enum)) return resolved.enum;
        const branches = [];
        if (Array.isArray(resolved.anyOf)) branches.push(...resolved.anyOf);
        if (Array.isArray(resolved.oneOf)) branches.push(...resolved.oneOf);
        for (const branchRaw of branches) {{
          const branch = resolveSchema(branchRaw) || {{}};
          if (Array.isArray(branch.enum)) return branch.enum;
          if (Object.prototype.hasOwnProperty.call(branch, 'const')) return [branch.const];
        }}
        return null;
      }}

      function fieldWrapper(title, required) {{
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const label = document.createElement('label');
        label.textContent = required ? `${{title}} *` : title;
        wrap.appendChild(label);
        return wrap;
      }}

      function renderPrimitive(container, key, fieldSchema, path, required) {{
        fieldSchema = resolveSchema(fieldSchema) || {{}};
        const wrap = fieldWrapper(key, required);
        let input;
        const enumValues = enumValuesForSchema(fieldSchema);
        if (Array.isArray(enumValues)) {{
          input = document.createElement('select');
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = '-- select --';
          input.appendChild(empty);
          for (const opt of enumValues) {{
            const o = document.createElement('option');
            o.value = JSON.stringify(opt);
            o.textContent = String(opt);
            input.appendChild(o);
          }}
        }} else if (fieldSchema.type === 'boolean') {{
          input = document.createElement('input');
          input.type = 'checkbox';
        }} else {{
          input = document.createElement('input');
          input.type = (fieldSchema.type === 'integer' || fieldSchema.type === 'number') ? 'number' : 'text';
        }}

        const existing = getValue(path, fieldSchema.type === 'boolean' ? false : '');
        if (input.type === 'checkbox') {{
          input.checked = Boolean(existing);
          input.addEventListener('change', () => setValue(path, input.checked));
          setValue(path, Boolean(existing));
        }} else {{
          if (Array.isArray(enumValues)) {{
            input.value = existing == null ? '' : JSON.stringify(existing);
            input.addEventListener('change', () => {{
              if (input.value === '') {{
                setValue(path, null);
                return;
              }}
              try {{
                setValue(path, JSON.parse(input.value));
              }} catch (_e) {{
                setValue(path, input.value);
              }}
            }});
            if (input.value === '') {{
              setValue(path, null);
            }} else {{
              try {{
                setValue(path, JSON.parse(input.value));
              }} catch (_e) {{
                setValue(path, input.value);
              }}
            }}
          }} else {{
            const isDateLikeField = (fieldSchema.type === 'string') && /date|_at$|_time$/i.test(String(key || ''));
            input.value = isDateLikeField ? formatDateEuropean(existing ?? '') : (existing ?? '');
            input.addEventListener('input', () => {{
              const rawValue = input.value;
              const normalizedValue = isDateLikeField ? toIsoDateFromEuropean(rawValue) : rawValue;
              setValue(path, typedValue(normalizedValue, fieldSchema.type));
            }});
            const initialNormalized = isDateLikeField ? toIsoDateFromEuropean(input.value) : input.value;
            setValue(path, typedValue(initialNormalized, fieldSchema.type));
          }}
        }}

        wrap.appendChild(input);
        container.appendChild(wrap);
      }}

      function renderObject(container, objectSchema, basePath, dataObj) {{
        objectSchema = resolveSchema(objectSchema) || {{}};
        const group = document.createElement('div');
        group.className = 'group';
        const props = (objectSchema && objectSchema.properties) ? objectSchema.properties : {{}};
        for (const [key, childSchema] of Object.entries(props)) {{
          const resolvedChild = resolveSchema(childSchema) || {{}};
          const childPath = [...basePath, key];
          const required = isRequired(objectSchema, key);
          if (resolvedChild.type === 'object' || resolvedChild.properties) {{
            const sub = document.createElement('div');
            const h = document.createElement('h4');
            h.textContent = key;
            sub.appendChild(h);
            group.appendChild(sub);
            renderObject(sub, resolvedChild, childPath, dataObj?.[key] || {{}});
          }} else if (resolvedChild.type === 'array' && resolvedChild.items) {{
            const sub = document.createElement('div');
            const h = document.createElement('h4');
            h.textContent = key;
            sub.appendChild(h);
            group.appendChild(sub);
            renderArray(sub, resolvedChild, childPath);
          }} else {{
            renderPrimitive(group, key, resolvedChild, childPath, required);
          }}
        }}
        container.appendChild(group);
      }}

      function renderArray(container, arraySchema, basePath) {{
        arraySchema = resolveSchema(arraySchema) || {{}};
        const group = document.createElement('div');
        group.className = 'group';
        const title = document.createElement('h4');
        title.textContent = 'Items';
        group.appendChild(title);

        const list = document.createElement('div');
        group.appendChild(list);

        function renderItems() {{
          list.innerHTML = '';
          const arr = Array.isArray(getValue(basePath, [])) ? getValue(basePath, []) : [];
          arr.forEach((item, index) => {{
          const itemWrap = document.createElement('div');
          itemWrap.className = 'array-item';
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.textContent = 'Remove item';
          removeBtn.addEventListener('click', () => {{
            const current = Array.isArray(getValue(basePath, [])) ? getValue(basePath, []) : [];
            current.splice(index, 1);
            setValue(basePath, current);
            renderItems();
          }});
          itemWrap.appendChild(removeBtn);
          const itemSchema = resolveSchema(arraySchema.items) || {{ type: 'object', properties: {{}} }};
          renderObject(itemWrap, itemSchema, [...basePath, index], item || {{}});
          list.appendChild(itemWrap);
          }});
        }}

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Add item';
        addBtn.addEventListener('click', () => {{
          const current = Array.isArray(getValue(basePath, [])) ? getValue(basePath, []) : [];
          current.push({{}});
          setValue(basePath, current);
          renderItems();
        }});
        group.appendChild(addBtn);

        const existing = getValue(basePath, null);
        if (!Array.isArray(existing)) {{
          const initialArray = Array.isArray(sampleData) ? sampleData : [];
          setValue(basePath, initialArray.length ? initialArray.slice() : [{{}}]);
        }}
        renderItems();
        container.appendChild(group);
      }}

      function renderForm() {{
        const root = document.getElementById('formRoot');
        root.innerHTML = '';
        const rootSchema = resolveSchema(schema) || {{}};
        if (rootSchema && rootSchema.type === 'array') {{
          formData = Array.isArray(sampleData) ? cloneValue(sampleData) : [];
          renderArray(root, rootSchema, []);
          return;
        }}
        if (!formData || Array.isArray(formData)) formData = {{}};
        renderObject(root, rootSchema, [], formData);
      }}

      function redirectToDashboard(action) {{
        const target = `/api/interfaces/patients/mock/dashboard?action=${{encodeURIComponent(action)}}&operation_id=${{encodeURIComponent(opId)}}`;
        window.location.assign(target);
      }}
      async function submitPayload() {{
        const res = await fetch(`/api/interfaces/patients/mock/operations/${{opId}}/submit`, {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ payload: formData }}),
        }});
        let txt = `submit -> status ${{res.status}}`;
        if (!res.ok) {{
          try {{
            const body = await res.json();
            txt += `\\n${{JSON.stringify(body, null, 2)}}`;
          }} catch (_e) {{}}
        }} else {{
          setResult(txt + "\\nReturning to dashboard...");
          setTimeout(() => redirectToDashboard("submit"), 250);
          return;
        }}
        setResult(txt);
      }}
      async function sendError() {{
        const statusCode = Number(document.getElementById('statusCode').value || 500);
        const errorCode = document.getElementById('errorCode').value || 'MOCK_ERROR';
        const detail = document.getElementById('errorDetail').value || 'Mock operation returned an error.';
        const res = await fetch(`/api/interfaces/patients/mock/operations/${{opId}}/error`, {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ status_code: statusCode, error_code: errorCode, detail }}),
        }});
        let txt = `error -> status ${{res.status}}`;
        if (!res.ok) {{
          try {{
            const body = await res.json();
            txt += `\\n${{JSON.stringify(body, null, 2)}}`;
          }} catch (_e) {{}}
        }} else {{
          setResult(txt + "\\nReturning to dashboard...");
          setTimeout(() => redirectToDashboard("error"), 250);
          return;
        }}
        setResult(txt);
      }}
      async function cancelOperation() {{
        const res = await fetch(`/api/interfaces/patients/mock/operations/${{opId}}/cancel`, {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{}}),
        }});
        let txt = `cancel -> status ${{res.status}}`;
        if (!res.ok) {{
          try {{
            const body = await res.json();
            txt += `\\n${{JSON.stringify(body, null, 2)}}`;
          }} catch (_e) {{}}
        }} else {{
          setResult(txt + "\\nReturning to dashboard...");
          setTimeout(() => redirectToDashboard("cancel"), 250);
          return;
        }}
        setResult(txt);
      }}
      async function triggerPatient() {{
        const patientId = document.getElementById('triggerPatientId').value.trim();
        if (!patientId) {{
          setResult('trigger patient: patient_id is required');
          return;
        }}
        const res = await fetch('/api/interfaces/patients/mock/operations/trigger/patient', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ patient_id: patientId }}),
        }});
        let txt = `trigger patient -> status ${{res.status}}`;
        try {{
          const body = await res.json();
          txt += `\\n${{JSON.stringify(body, null, 2)}}`;
        }} catch (_e) {{}}
        setResult(txt);
      }}
      async function triggerConditions() {{
        const patientId = document.getElementById('triggerConditionsPatientId').value.trim();
        if (!patientId) {{
          setResult('trigger conditions: patient_id is required');
          return;
        }}
        const dateFrom = toIsoDateFromEuropean(document.getElementById('triggerDateFrom').value.trim());
        const dateTo = toIsoDateFromEuropean(document.getElementById('triggerDateTo').value.trim());
        const res = await fetch('/api/interfaces/patients/mock/operations/trigger/conditions', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{
            patient_id: patientId,
            date_from: dateFrom || null,
            date_to: dateTo || null,
          }}),
        }});
        let txt = `trigger conditions -> status ${{res.status}}`;
        try {{
          const body = await res.json();
          txt += `\\n${{JSON.stringify(body, null, 2)}}`;
        }} catch (_e) {{}}
        setResult(txt);
      }}
      function boot() {{
        try {{
          renderForm();
        }} catch (err) {{
          setResult('Form rendering failed: ' + (err && err.message ? err.message : String(err)));
        }}
      }}
      boot();
    </script>
  </body>
</html>"""


def _build_mock_dashboard_html() -> str:
    return """<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Patient Interface Mock Dashboard</title>
    <style>
      body { font-family: sans-serif; margin: 24px; max-width: 1100px; }
      .row { display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
      input, button { padding: 8px; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f6f8fa; }
      code { background: #f6f8fa; padding: 2px 4px; }
      .muted { color: #666; font-size: 0.95rem; }
      pre { background: #f6f8fa; padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>
    <h2>Patient Interface Mock Dashboard</h2>
    <p class="muted">DEV-only helper page to trigger and inspect mock operations.</p>

    <div class="card">
      <h3>Trigger Patient Operation</h3>
      <div class="row">
        <input id="patientId" placeholder="patient_id (e.g. pat_1)" />
        <button type="button" onclick="triggerPatient()">Trigger patient</button>
      </div>
    </div>

    <div class="card">
      <h3>Trigger Conditions Operation</h3>
      <div class="row">
        <input id="conditionsPatientId" placeholder="patient_id (e.g. pat_1)" />
        <input id="dateFrom" placeholder="date_from (DD.MM.YYYY, optional)" />
        <input id="dateTo" placeholder="date_to (DD.MM.YYYY, optional)" />
        <button type="button" onclick="triggerConditions()">Trigger conditions</button>
      </div>
    </div>

    <div class="card">
      <div class="row">
        <h3 style="margin:0">Current Operations</h3>
        <button type="button" onclick="refreshOps()">Refresh</button>
        <button type="button" onclick="clearDone()">Clear done</button>
        <label style="display:flex;align-items:center;gap:6px">
          <input id="autoRefreshToggle" type="checkbox" onchange="toggleAutoRefresh()" />
          Auto-refresh (5s)
        </label>
      </div>
      <table>
        <thead>
          <tr>
            <th>call_id</th>
            <th>type</th>
            <th>status</th>
            <th>form</th>
            <th>actions</th>
            <th>reply</th>
            <th>error</th>
          </tr>
        </thead>
        <tbody id="opsBody"></tbody>
      </table>
    </div>

    <h3>Last Trigger Result</h3>
    <pre id="result"></pre>

    <script>
      function setResult(text) {
        document.getElementById('result').textContent = text;
      }
      let autoRefreshTimer = null;
      function renderFlashFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const operationId = params.get('operation_id');
        if (!action || !operationId) return;
        const msg = `Operation ${operationId}: ${action} completed.`;
        setResult(msg);
      }
      function toggleAutoRefresh() {
        const enabled = Boolean(document.getElementById('autoRefreshToggle')?.checked);
        if (autoRefreshTimer) {
          clearInterval(autoRefreshTimer);
          autoRefreshTimer = null;
        }
        if (enabled) {
          autoRefreshTimer = setInterval(() => {
            refreshOps();
          }, 5000);
        }
      }

      function esc(value) {
        return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      }
      function formatDateEuropean(raw) {
        const value = String(raw ?? '').trim();
        if (!value) return '';
        const dateOnly = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
        if (dateOnly) {
          return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`;
        }
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return value;
        return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
      }
      function formatDateTimeEuropean(raw) {
        const value = String(raw ?? '').trim();
        if (!value) return '';
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return formatDateEuropean(value);
        return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
      function toIsoDateFromEuropean(raw) {
        const value = String(raw ?? '').trim();
        if (!value) return value;
        const european = value.match(/^(\\d{2})\\.(\\d{2})\\.(\\d{4})$/);
        if (european) {
          return `${european[3]}-${european[2]}-${european[1]}`;
        }
        return value;
      }

      async function refreshOps() {
        const body = document.getElementById('opsBody');
        body.innerHTML = '';
        const res = await fetch(`/api/interfaces/patients/mock/operations?ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) {
          setResult(`list failed -> status ${res.status}`);
          return;
        }
        const payload = await res.json();
        const operations = Array.isArray(payload.operations) ? payload.operations : [];
        if (!operations.length) {
          body.innerHTML = '<tr><td colspan="7">No operations yet.</td></tr>';
          return;
        }
        body.innerHTML = operations.map((op) => {
          const err = op.error_code
            ? `${op.status_code != null ? `[${esc(op.status_code)}] ` : ''}${esc(op.error_code)}: ${esc(op.error_detail || '')}`
            : '';
          const operationId = String(op.operation_id || '');
          const isPending = String(op.status || '') === 'pending';
          const formUrl = isPending
            ? (op.form_url || (operationId ? `/api/interfaces/patients/mock/operations/${operationId}/form` : ''))
            : '';
          const formCell = formUrl
            ? `<a href="${esc(formUrl)}">Open form</a>`
            : '<span class="muted">closed</span>';
          const cancelCell = op.can_cancel
            ? `<button type="button" onclick="cancelOperation('${esc(op.operation_id)}')">Cancel</button>`
            : `<button type="button" onclick="removeOperation('${esc(op.operation_id)}')">Remove</button>`;
          const detailUrl = operationId ? `/api/interfaces/patients/mock/operations/${operationId}` : '';
          const replyCell = op.has_payload
            ? `received${op.updated_at ? ` (${esc(formatDateTimeEuropean(op.updated_at))})` : ''}${detailUrl ? ` <a href="${esc(detailUrl)}">details</a>` : ''}`
            : '<span class="muted">pending</span>';
          const opIdCell = formUrl
            ? `<a href="${esc(formUrl)}"><code>${esc(operationId)}</code></a>`
            : `<code>${esc(operationId)}</code>`;
          return `<tr>
            <td>${opIdCell}</td>
            <td>${esc(op.operation_type)}</td>
            <td>${esc(op.status)}</td>
            <td>${formCell}</td>
            <td>${cancelCell}</td>
            <td>${replyCell}</td>
            <td>${err}</td>
          </tr>`;
        }).join('');
      }

      async function postJson(url, data) {
        const res = await fetch(url, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        let body = null;
        try {
          body = await res.json();
        } catch (_e) {}
        return { status: res.status, body };
      }

      async function triggerPatient() {
        const patientId = document.getElementById('patientId').value.trim();
        if (!patientId) {
          setResult('patient_id is required');
          return;
        }
        const result = await postJson('/api/interfaces/patients/mock/operations/trigger/patient', { patient_id: patientId });
        setResult(JSON.stringify(result, null, 2));
        await refreshOps();
      }

      async function triggerConditions() {
        const patientId = document.getElementById('conditionsPatientId').value.trim();
        if (!patientId) {
          setResult('patient_id is required');
          return;
        }
        const dateFrom = toIsoDateFromEuropean(document.getElementById('dateFrom').value.trim());
        const dateTo = toIsoDateFromEuropean(document.getElementById('dateTo').value.trim());
        const result = await postJson('/api/interfaces/patients/mock/operations/trigger/conditions', {
          patient_id: patientId,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        });
        setResult(JSON.stringify(result, null, 2));
        await refreshOps();
      }

      async function cancelOperation(operationId) {
        const result = await postJson(`/api/interfaces/patients/mock/operations/${operationId}/cancel`, {});
        setResult(JSON.stringify(result, null, 2));
        await refreshOps();
      }
      async function removeOperation(operationId) {
        const result = await postJson(`/api/interfaces/patients/mock/operations/${operationId}/remove`, {});
        setResult(JSON.stringify(result, null, 2));
        await refreshOps();
      }
      async function clearDone() {
        const result = await postJson('/api/interfaces/patients/mock/operations/clear-done', {});
        setResult(JSON.stringify(result, null, 2));
        await refreshOps();
      }

      renderFlashFromQuery();
      refreshOps();
    </script>
  </body>
</html>"""


@router.get("/{patient_id}", response_model=PatientDto)
def get_patient_interface(
    patient_id: str,
    _: User = Depends(require_permission("view.patients")),
):
    result = get_patient(patient_id=patient_id)
    return _to_http_response(result)


@router.get("/{patient_id}/conditions", response_model=list[ConditionDto])
def list_patient_conditions_interface(
    patient_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    _: User = Depends(require_permission("view.patients")),
):
    result = list_conditions(patient_id=patient_id, date_from=date_from, date_to=date_to)
    return _to_http_response(result)


@router.post("/mock/operations/{operation_id}/complete", status_code=204, response_class=Response)
def complete_patient_interface_mock_operation(
    operation_id: str,
    payload: MockOperationCompleteRequest,
    _: User = Depends(require_permission("edit.patients")),
):
    _ensure_dev_mode()
    applied = complete_mock_operation(operation_id=operation_id, payload=payload.payload)
    if not applied:
        raise HTTPException(status_code=404, detail="Mock operation not found")


@router.get("/mock/operations/{operation_id}")
def get_patient_interface_mock_operation(
    operation_id: str,
):
    _ensure_dev_mode()
    operation = get_mock_operation(operation_id=operation_id)
    if not operation:
        raise HTTPException(status_code=404, detail="Mock operation not found")
    return operation


@router.get("/mock/operations")
def list_patient_interface_mock_operations():
    _ensure_dev_mode()
    return JSONResponse(content={"operations": list_mock_operations()}, headers=NO_STORE_HEADERS)


@router.get("/mock/dashboard", response_class=HTMLResponse)
def get_patient_interface_mock_dashboard():
    _ensure_dev_mode()
    return HTMLResponse(content=_build_mock_dashboard_html(), headers=NO_STORE_HEADERS)


@router.post("/mock/operations/trigger/patient")
def trigger_patient_interface_mock_patient_operation(payload: MockTriggerPatientRequest):
    _ensure_dev_mode()
    result = get_patient(patient_id=payload.patient_id)
    return _to_http_response(result)


@router.post("/mock/operations/trigger/conditions")
def trigger_patient_interface_mock_conditions_operation(payload: MockTriggerConditionsRequest):
    _ensure_dev_mode()
    result = list_conditions(
        patient_id=payload.patient_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
    )
    return _to_http_response(result)


@router.get("/mock/operations/{operation_id}/form", response_class=HTMLResponse)
def get_patient_interface_mock_operation_form(
    operation_id: str,
):
    if get_config().env.strip().upper() != "DEV":
        return HTMLResponse(
            status_code=404,
            headers=NO_STORE_HEADERS,
            content="""
<!doctype html><html><body style="font-family:sans-serif;margin:24px">
<h2>Mock form unavailable</h2>
<p>Mock interface forms are available only when <code>TPL_ENV=DEV</code>.</p>
</body></html>
""",
        )
    operation = get_mock_operation(operation_id=operation_id)
    if not operation:
        return HTMLResponse(
            status_code=404,
            headers=NO_STORE_HEADERS,
            content=f"""
<!doctype html><html><body style="font-family:sans-serif;margin:24px;max-width:800px">
<h2>Mock operation not found</h2>
<p>Operation <code>{operation_id}</code> is unknown in the current server process.</p>
<p>Common reasons:</p>
<ul>
  <li>backend restart/reload cleared in-memory mock operations</li>
  <li>the operation was never created on this instance</li>
</ul>
<p>Generate a fresh operation by calling:</p>
<pre>GET /api/interfaces/patients/&lt;patient_id&gt;</pre>
<p>Then open the returned <code>form_url</code>.</p>
</body></html>
""",
        )
    status = str(operation.get("status") or "pending")
    if status != "pending":
        return HTMLResponse(
            status_code=409,
            headers=NO_STORE_HEADERS,
            content=f"""
<!doctype html><html><body style="font-family:sans-serif;margin:24px;max-width:820px">
<h2>Operation is closed</h2>
<p>Operation <code>{operation_id}</code> is <strong>{status}</strong> and cannot be edited anymore.</p>
<p>Use the dashboard to trigger a new service call.</p>
<p><a href="/api/interfaces/patients/mock/dashboard">Back to dashboard</a></p>
</body></html>
""",
        )
    return HTMLResponse(content=_build_mock_operation_form_html(operation), headers=NO_STORE_HEADERS)


@router.post("/mock/operations/{operation_id}/submit", status_code=204, response_class=Response)
def submit_patient_interface_mock_operation(
    operation_id: str,
    payload: MockOperationCompleteRequest,
):
    _ensure_dev_mode()
    applied = complete_mock_operation(operation_id=operation_id, payload=payload.payload)
    if not applied:
        raise HTTPException(status_code=404, detail="Mock operation not found or not pending")


@router.post("/mock/operations/{operation_id}/error", status_code=204, response_class=Response)
def error_patient_interface_mock_operation(
    operation_id: str,
    payload: MockOperationErrorRequest,
):
    _ensure_dev_mode()
    applied = fail_mock_operation(
        operation_id=operation_id,
        status_code=payload.status_code,
        error_code=payload.error_code,
        detail=payload.detail,
    )
    if not applied:
        raise HTTPException(status_code=404, detail="Mock operation not found or not pending")


@router.post("/mock/operations/{operation_id}/cancel", status_code=204, response_class=Response)
def cancel_patient_interface_mock_operation(
    operation_id: str,
):
    _ensure_dev_mode()
    applied = cancel_mock_operation(operation_id=operation_id)
    if not applied:
        raise HTTPException(status_code=404, detail="Mock operation not found or not pending")


@router.post("/mock/operations/{operation_id}/remove", status_code=204, response_class=Response)
def remove_patient_interface_mock_operation(
    operation_id: str,
):
    _ensure_dev_mode()
    applied = delete_mock_operation(operation_id=operation_id)
    if not applied:
        raise HTTPException(status_code=404, detail="Mock operation not found")


@router.post("/mock/operations/clear-done")
def clear_done_patient_interface_mock_operations():
    _ensure_dev_mode()
    cleared_count = clear_closed_mock_operations()
    return {"cleared_count": cleared_count}
