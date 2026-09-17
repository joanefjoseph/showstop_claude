/* ────────────────────────── tiny DOM helpers ────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/** Creates an element. Text is always added via text nodes, so API data can't inject HTML. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const money = (m) => (m ? new Intl.NumberFormat(undefined, { style: 'currency', currency: m.currency }).format(m.amount) : '—');
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const val = (formData, key) => String(formData.get(key) ?? '').trim();
const kv = (pairs) =>
  el('dl', { class: 'kv' },
    pairs
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
const chip = (label, count, tone) =>
  el('span', { class: `chip ${tone}` }, label, count !== undefined && count !== null ? el('b', {}, count) : null);
const table = (headers, rows) =>
  el('table', {},
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', {}, h)))),
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c))))));
function flash(input) {
  input.classList.remove('flash');
  void input.offsetWidth; // restart the animation
  input.classList.add('flash');
}
/* ────────────────────────── session state ────────────────────────── */
const state = {
  bridgeUrl: 'http://localhost:3000',
  membershipId: '',
  cartId: '',
  selectedSeats: new Set(),
};
function setMembership(id) {
  state.membershipId = id;
  $('#session-member').textContent = id || '—';
  for (const input of $$('input[name="membershipId"]')) {
    input.value = id;
    flash(input);
  }
}
function setCart(id) {
  state.cartId = id;
  $('#session-cart').textContent = id || '—';
  for (const input of $$('input[name="cartId"]')) {
    input.value = id;
    flash(input);
  }
}
function rememberTickets(ticketIds) {
  const list = $('#ticket-ids');
  for (const id of ticketIds) {
    if (!$(`option[value="${CSS.escape(id)}"]`, list)) list.append(el('option', { value: id }, 'purchased this session'));
  }
}
/* ────────────────────────── timers (countdowns) ────────────────────────── */
const timers = new Map();
function clearTimers(name) {
  for (const id of timers.get(name) ?? []) clearInterval(id);
  timers.delete(name);
}
function countdown(name, targetIso, { urgentAt = 30, onZero } = {}) {
  const span = el('span', { class: 'countdown' });
  let id;
  const tick = () => {
    const secs = Math.max(0, Math.round((new Date(targetIso).getTime() - Date.now()) / 1000));
    span.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    span.classList.toggle('urgent', secs <= urgentAt);
    if (secs === 0) {
      clearInterval(id);
      if (onZero) setTimeout(onZero, 500); // small delay avoids tight loops under clock skew
    }
  };
  id = setInterval(tick, 250);
  if (!timers.has(name)) timers.set(name, []);
  timers.get(name).push(id);
  tick();
  return span;
}
/* ────────────────────────── bridge calls ────────────────────────── */
async function callBridge({ method, path, headers = {}, body }) {
  const request = { method, path, headers: { ...headers }, body };
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const started = performance.now();
  try {
    const res = await fetch(`/bridge${path}`, init);
    const text = await res.text();
    let parsed = text;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* leave as text */ }
    return {
      request,
      ok: res.ok,
      status: res.status,
      durationMs: Math.round(performance.now() - started),
      requestId: res.headers.get('x-request-id'),
      body: parsed,
    };
  } catch (err) {
    return {
      request,
      ok: false,
      status: 0,
      durationMs: Math.round(performance.now() - started),
      requestId: null,
      body: { error: { code: 'CONSOLE_UNREACHABLE', message: `The console server did not respond: ${err}` } },
    };
  }
}
function toCurl({ method, path, headers, body }) {
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const parts = [`curl -X ${method} ${q(state.bridgeUrl + path)}`];
  for (const [k, v] of Object.entries(headers)) parts.push(`-H ${q(`${k}: ${v}`)}`);
  if (body !== undefined) {
    parts.push(`-H 'Content-Type: application/json'`);
    parts.push(`-d ${q(JSON.stringify(body))}`);
  }
  return parts.join(' \\\n  ');
}
function requestText({ method, path, headers, body }) {
  const lines = [`${method} ${path}`];
  if (body !== undefined) lines.push('Content-Type: application/json');
  for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
  if (body !== undefined) lines.push('', JSON.stringify(body, null, 2));
  return lines.join('\n');
}
const STATUS_TEXT = {
  200: 'OK', 201: 'Created', 400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
  404: 'Not Found', 409: 'Conflict', 410: 'Gone', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 504: 'Gateway Timeout',
};
function renderError(error) {
  return el('div', { class: 'error-box' },
    el('div', {}, el('strong', {}, error.code ?? 'ERROR'), error.upstream ? el('span', { class: 'tag' }, `upstream: ${error.upstream}`) : null),
    el('p', {}, error.message ?? ''),
    error.details !== undefined ? el('pre', {}, JSON.stringify(error.details, null, 2)) : null);
}
/** Shared result layout: status line, formatted body (or error), request and raw response. */
function renderResult(name, res, renderBody) {
  const container = $(`#result-${name}`);
  clearTimers(name);
  const copyButton = el('button', {
    type: 'button',
    class: 'link',
    onclick: async (e) => {
      await navigator.clipboard.writeText(toCurl(res.request));
      e.currentTarget.textContent = 'Copied!';
      setTimeout(() => { copyButton.textContent = 'Copy as curl'; }, 1500);
    },
  }, 'Copy as curl');
  let formatted;
  if (res.body && typeof res.body === 'object' && res.body.error && typeof res.body.error === 'object') {
    formatted = renderError(res.body.error);
  } else if (res.body === null || typeof res.body !== 'object') {
    formatted = el('p', { class: 'muted' }, 'Response was not JSON; see the raw response below.');
  } else {
    try {
      formatted = renderBody(res.body);
    } catch (err) {
      formatted = renderError({ code: 'RENDER_ERROR', message: String(err) });
    }
  }
  container.replaceChildren(
    el('div', { class: 'meta' },
      el('span', { class: `status s${String(res.status)[0]}` }, res.status === 0 ? 'NO RESPONSE' : `${res.status} ${STATUS_TEXT[res.status] ?? ''}`),
      el('span', { class: 'muted' }, `${res.durationMs} ms`),
      res.requestId ? el('span', { class: 'muted' }, `x-request-id ${res.requestId}`) : null,
      copyButton),
    formatted,
    el('details', { class: 'raw' }, el('summary', {}, 'Request'), el('pre', {}, requestText(res.request))),
    el('details', { class: 'raw' }, el('summary', {}, 'Raw response'),
      el('pre', {}, typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2))));
}
/** Wires a form's submit event with a loading state. */
function onSubmit(name, handler) {
  const form = $(`#form-${name}`);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = $('button[type="submit"]', form);
    const result = $(`#result-${name}`);
    button.disabled = true;
    button.textContent = 'Sending…';
    result.classList.add('loading');
    try {
      await handler(new FormData(form));
    } finally {
      button.disabled = false;
      button.textContent = 'Submit';
      result.classList.remove('loading');
    }
  });
}
/* ────────────────────────── 1. availability ────────────────────────── */
const ATTR_LABEL = { AISLE: 'aisle', ADA: 'ADA', OBSTRUCTED_VIEW: 'obstr.' };
function renderAvailability(ev) {
  state.selectedSeats.clear();
  const selectionInfo = el('span', { class: 'muted' }, 'Click seats to select them');
  const useButton = el('button', {
    type: 'button',
    disabled: true,
    onclick: () => {
      const eventInput = $('#form-lock [name="eventId"]');
      const seatsInput = $('#form-lock [name="seatIds"]');
      eventInput.value = ev.eventId;
      seatsInput.value = [...state.selectedSeats].join(', ');
      flash(eventInput);
      flash(seatsInput);
      $('#panel-lock').scrollIntoView({ behavior: 'smooth' });
    },
  }, 'Use selected seats in Lock →');
  const updateSelection = () => {
    const n = state.selectedSeats.size;
    selectionInfo.textContent = n ? `${n} selected: ${[...state.selectedSeats].join(', ')}` : 'Click seats to select them';
    useButton.disabled = n === 0;
  };
  const priceLabel = (range) =>
    !range ? '' : range.min.amount === range.max.amount ? ` · ${money(range.min)}` : ` · ${money(range.min)} – ${money(range.max)}`;
  const sections = ev.sections.length === 0
    ? el('p', { class: 'muted' }, 'No seats are currently available for this event.')
    : ev.sections.map((s) =>
        el('details', { class: 'section', open: true },
          el('summary', {}, el('strong', {}, `Section ${s.section}`), ` · ${s.availableCount} available${priceLabel(s.priceRange)}`),
          el('div', { class: 'seat-grid' },
            s.seats.map((seat) =>
              el('button', {
                type: 'button',
                class: 'seat',
                title: [
                  seat.seatId,
                  `${seat.price.level}: ${money(seat.price.faceValue)} + ${money(seat.price.fees)} fees = ${money(seat.price.total)}`,
                  seat.attributes.length ? seat.attributes.join(', ') : null,
                ].filter(Boolean).join('\n'),
                onclick: (e) => {
                  const button = e.currentTarget;
                  if (state.selectedSeats.has(seat.seatId)) state.selectedSeats.delete(seat.seatId);
                  else state.selectedSeats.add(seat.seatId);
                  button.classList.toggle('selected', state.selectedSeats.has(seat.seatId));
                  updateSelection();
                },
              },
              `${seat.row}-${seat.seatNumber}`,
              seat.attributes.length ? el('small', {}, seat.attributes.map((a) => ATTR_LABEL[a] ?? a).join(' ')) : null)))));
  return el('div', {},
    el('h3', {}, ev.eventName),
    kv([
      ['Event ID', el('code', {}, ev.eventId)],
      ['Venue', `${ev.venue.name}, ${ev.venue.city}, ${ev.venue.country}`],
      ['Starts', dateTime(ev.startsAt)],
      ['Inventory updated', dateTime(ev.lastUpdated)],
    ]),
    el('div', { class: 'chips' },
      chip('Available', ev.totals.available, 'ok'),
      chip('Held', ev.totals.held, 'warn'),
      chip('Sold', ev.totals.sold, 'bad')),
    ev.sections.length ? el('div', { class: 'selection-bar' }, selectionInfo, useButton) : null,
    sections);
}
onSubmit('availability', async (fd) => {
  const eventId = val(fd, 'eventId');
  const res = await callBridge({ method: 'GET', path: `/events/${encodeURIComponent(eventId)}/availability` });
  renderResult('availability', res, renderAvailability);
});
/* ────────────────────────── 2. verify membership ────────────────────────── */
function renderVerify(m) {
  if (m.verified && m.membershipId) setMembership(m.membershipId);
  return el('div', {},
    el('div', { class: 'chips' },
      chip(m.verified ? 'Verified' : 'Not verified', null, m.verified ? 'ok' : 'bad'),
      chip(m.eligibleToPurchase ? 'Eligible to purchase' : 'Not eligible to purchase', null, m.eligibleToPurchase ? 'ok' : 'warn')),
    kv([
      ['Membership ID', m.membershipId ? el('code', {}, m.membershipId) : undefined],
      ['Status', m.status],
      ['Tier', m.tier ? `${m.tier.name} (level ${m.tier.level})` : undefined],
      ['Max tickets / order', m.tier ? (m.tier.maxTicketsPerOrder ?? 'not set (bridge default: 8)') : undefined],
      ['Presale access', m.tier && m.tier.presaleAccess !== undefined ? (m.tier.presaleAccess ? 'Yes' : 'No') : undefined],
      ['Member since', m.memberSince ? dateTime(m.memberSince) : undefined],
      ['Renews', m.renewsAt ? dateTime(m.renewsAt) : undefined],
      ['Reason', m.reason],
    ]),
    m.verified ? el('p', { class: 'muted' }, 'Membership ID copied into the Lock and Ticket forms.') : null);
}
onSubmit('verify', async (fd) => {
  const res = await callBridge({ method: 'POST', path: '/membership/verify', body: { email: val(fd, 'email') } });
  renderResult('verify', res, renderVerify);
});
/* ────────────────────────── 3. lock seats ────────────────────────── */
function renderLock(c) {
  setCart(c.cartId);
  return el('div', {},
    kv([
      ['Cart ID', el('code', {}, c.cartId)],
      ['Status', c.status],
      ['Event', c.eventId],
      ['Member', c.membershipId],
      ['Hold expires', dateTime(c.holdExpiresAt)],
      ['Time left', countdown('lock', c.holdExpiresAt)],
    ]),
    table(['Seat ID', 'Section', 'Row', 'Seat', 'Total'],
      c.seats.map((s) => [el('code', {}, s.seatId), s.section, s.row, s.seatNumber, money(s.total)])),
    kv([
      ['Subtotal', money(c.totals.subtotal)],
      ['Fees', money(c.totals.fees)],
      ['Total', el('strong', {}, money(c.totals.total))],
    ]),
    el('p', { class: 'muted' }, 'Cart ID copied into the Billing and Commit forms.'));
}
onSubmit('lock', async (fd) => {
  const headers = {};
  const membershipId = val(fd, 'membershipId');
  if (membershipId) headers['X-Membership-Id'] = membershipId;
  const seatIds = val(fd, 'seatIds').split(/[\s,]+/).filter(Boolean);
  const res = await callBridge({
    method: 'POST',
    path: '/carts/lock',
    headers,
    body: { eventId: val(fd, 'eventId'), seatIds },
  });
  renderResult('lock', res, renderLock);
});
/* ────────────────────────── 4. attach billing ────────────────────────── */
function renderBilling(b) {
  return el('div', {},
    kv([
      ['Cart ID', el('code', {}, b.cartId)],
      ['Status', b.status],
      ['Total', el('strong', {}, money(b.total))],
      ['Hold expires', dateTime(b.holdExpiresAt)],
      ['Time left', countdown('billing', b.holdExpiresAt)],
    ]),
    el('p', { class: 'muted' }, 'Billing attached. Commit the cart before the hold expires.'));
}
onSubmit('billing', async (fd) => {
  const optional = (key) => val(fd, key) || undefined; // undefined keys are dropped by JSON.stringify
  const body = {
    customer: {
      firstName: val(fd, 'firstName'),
      lastName: val(fd, 'lastName'),
      email: val(fd, 'email'),
      phone: optional('phone'),
    },
    address: {
      line1: val(fd, 'line1'),
      line2: optional('line2'),
      city: val(fd, 'city'),
      region: val(fd, 'region'),
      postalCode: val(fd, 'postalCode'),
      country: val(fd, 'country'),
    },
    payment: {
      paymentToken: val(fd, 'paymentToken'),
      method: val(fd, 'method'),
    },
  };
  const res = await callBridge({ method: 'PUT', path: `/carts/${encodeURIComponent(val(fd, 'cartId'))}/billing`, body });
  renderResult('billing', res, renderBilling);
});
/* ────────────────────────── 5. commit ────────────────────────── */
function openTicket(ticketId) {
  const form = $('#form-ticket');
  $('[name="ticketId"]', form).value = ticketId;
  if (state.membershipId) $('[name="membershipId"]', form).value = state.membershipId;
  $('#panel-ticket').scrollIntoView({ behavior: 'smooth' });
  form.requestSubmit();
}
function renderCommit(o) {
  rememberTickets(o.tickets.map((t) => t.ticketId));
  return el('div', {},
    kv([
      ['Order ID', el('code', {}, o.orderId)],
      ['Cart ID', el('code', {}, o.cartId)],
      ['Status', o.status],
      ['Purchased', dateTime(o.purchasedAt)],
      ['Total charged', el('strong', {}, money(o.total))],
    ]),
    o.tickets.length
      ? table(['Ticket ID', 'Section', 'Row', 'Seat', ''],
          o.tickets.map((t) => [
            el('code', {}, t.ticketId), t.section, t.row, t.seatNumber,
            el('button', { type: 'button', class: 'small', onclick: () => openTicket(t.ticketId) }, 'View ticket'),
          ]))
      : el('p', { class: 'muted' }, 'No tickets issued yet (order may be pending).'));
}
$('#gen-key').addEventListener('click', () => {
  const input = $('#form-commit [name="idempotencyKey"]');
  input.value = crypto.randomUUID();
  flash(input);
});
onSubmit('commit', async (fd) => {
  const headers = {};
  const key = val(fd, 'idempotencyKey');
  if (key) headers['Idempotency-Key'] = key;
  const res = await callBridge({ method: 'PUT', path: `/carts/${encodeURIComponent(val(fd, 'cartId'))}/commit`, headers });
  renderResult('commit', res, renderCommit);
});
/* ────────────────────────── 6. mobile ticket ────────────────────────── */
function renderTicket(t) {
  const b = t.barcode;
  const rotationInfo = b.rotating && b.nextRotationAt
    ? el('div', { class: 'muted' }, 'Next rotation in ',
        countdown('ticket', b.nextRotationAt, {
          urgentAt: 3,
          onZero: () => {
            if ($('#form-ticket [name="autoRefresh"]').checked) $('#form-ticket').requestSubmit();
          },
        }))
    : null;
  return el('div', { class: 'ticket' },
    el('h3', {}, t.event.name),
    el('div', { class: 'muted' }, `${t.event.venue}, ${t.event.city} · ${dateTime(t.event.startsAt)}`),
    kv([
      ['Ticket ID', el('code', {}, t.ticketId)],
      ['Order ID', el('code', {}, t.orderId)],
      ['Seat', `Section ${t.seat.section} · Row ${t.seat.row} · Seat ${t.seat.seatNumber}`],
      ['Holder', t.holderName],
      ['Entry gate', t.entryGate],
    ]),
    el('div', { class: 'barcode' },
      el('div', { class: 'barcode-label' }, `${b.format} · ${b.rotating ? `rotates every ${b.rotatesEverySeconds}s` : 'static barcode'}`),
      el('code', { class: 'barcode-value' }, b.value),
      rotationInfo));
}
onSubmit('ticket', async (fd) => {
  const headers = {};
  const membershipId = val(fd, 'membershipId');
  if (membershipId) headers['X-Membership-Id'] = membershipId;
  const res = await callBridge({ method: 'GET', path: `/tickets/${encodeURIComponent(val(fd, 'ticketId'))}`, headers });
  renderResult('ticket', res, renderTicket);
});
/* ────────────────────────── bridge health + init ────────────────────────── */
async function pollHealth() {
  const box = $('#health');
  let ok = false;
  let label = 'Bridge unreachable';
  try {
    const res = await fetch('/bridge/health');
    const body = await res.json();
    ok = res.ok && body.status === 'ok';
    label = ok ? `Bridge up · ${body.uptimeSeconds}s` : 'Bridge unreachable';
  } catch { /* keep defaults */ }
  box.classList.toggle('up', ok);
  box.classList.toggle('down', !ok);
  $('.label', box).textContent = label;
}
async function init() {
  try {
    const cfg = await (await fetch('/console-config')).json();
    state.bridgeUrl = cfg.bridgeUrl;
    $('#bridge-url').textContent = cfg.bridgeUrl;
  } catch { /* fall back to default */ }
  pollHealth();
  setInterval(pollHealth, 10_000);
}
init();