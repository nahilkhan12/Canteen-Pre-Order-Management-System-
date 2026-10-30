/* QuickBite staff screens. All data belongs to this browser demo. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const role = document.body.dataset.role;
  const user = QBAuth.requireRole(role);
  if (!user) return;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `₹${Number(value || 0).toLocaleString('en-IN', {maximumFractionDigits:2})}`;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const statuses = ['Placed', 'Preparing', 'Ready', 'Completed'];
  const categories = ['Pizza', 'Burger', 'Indian', 'Snacks', 'Drinks'];
  const nextAction = {Placed:'Start preparing', Preparing:'Mark as ready', Ready:'Mark collected'};
  const ui = {view:role === 'admin' ? 'overview' : 'board', orderStatus:'All', orderSearch:'', menuCategory:'All', menuSearch:'', kitchenSearch:'', historySearch:'', availableFilter:'All', availabilitySearch:'', settingsDirty:false};
  let toastTimer;

  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500);
  }
  function perform(action, message) {
    try { action(); if (message) toast(message); }
    catch (error) { toast(error.message || 'This change could not be saved. Please try again.'); }
  }
  function initials(name) { return String(name || 'Student').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
  function timeLabel(value) {
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? 'Just now' : time.toLocaleTimeString('en-IN', {hour:'numeric', minute:'2-digit'});
  }
  function ageLabel(value) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (!Number.isFinite(minutes) || minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`;
    return `${Math.floor(minutes / 1440)} d`;
  }
  function statusMarkup(status) { return `<span class="order-status status-${escape(String(status).toLowerCase())}">${escape(status)}</span>`; }
  function available(item) { return item.available !== false && Number(item.stock) > 0; }
  function orderMatches(order, query) {
    const q = query.trim().toLowerCase();
    return !q || `${order.id} ${order.token} ${order.student} ${order.studentEmail} ${(order.items || []).map(item => item.name).join(' ')}`.toLowerCase().includes(q);
  }
  function empty(title, description, symbol = 'bag', action = '') {
    return `<div class="empty-staff"><span class="empty-staff-art">${icon(symbol)}</span><h3>${escape(title)}</h3><p>${escape(description)}</p>${action}</div>`;
  }
  function sortedOrders(orders, oldest = false) { return [...orders].sort((a, b) => oldest ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)); }
  function advanceButton(order) {
    return order.status === 'Completed' ? `<span class="complete-label">${icon('check')}Collected</span>` : `<button class="order-forward" type="button" data-advance="${escape(order.id)}">${nextAction[order.status] || 'Update order'}${icon('arrow')}</button>`;
  }
  function toggleMarkup(item, withLabel = false) {
    const enabled = available(item);
    const button = `<button type="button" role="switch" class="availability-toggle" aria-checked="${enabled}" aria-label="${escape(item.name)} available to order" data-toggle-availability="${escape(item.id)}" ${Number(item.stock) <= 0 ? 'disabled title="Out of stock. Ask the admin to update stock."' : ''}></button>`;
    return withLabel ? `<div class="toggle-with-label">${button}<span>${enabled ? 'On' : 'Off'}</span></div>` : button;
  }
  function foodArt(item, className) {
    return `<span class="${className}"><span aria-hidden="true">${escape(item.emoji || '🍽️')}</span>${item.image ? `<img src="${escape(item.image)}" alt="" loading="lazy" data-food-image />` : ''}</span>`;
  }
  function renderStats(state) {
    const orders = state.orders;
    const counts = Object.fromEntries(statuses.map(status => [status, orders.filter(order => order.status === status).length]));
    const activeCount = orders.length - counts.Completed;
    $('#activeOrderCount').textContent = activeCount;
    const cards = role === 'admin' ? [
      {label:'Total orders', value:orders.length, note:'Every campus craving', icon:'bag', color:''},
      {label:'Demo sales', value:money(orders.reduce((total, order) => total + Number(order.total || 0), 0)), note:'Total of all demo orders', icon:'wallet', color:'green'},
      {label:'Active orders', value:activeCount, note:`${counts.Ready} ready for pickup`, icon:'clock', color:'peach'},
      {label:'Available items', value:`${state.menu.filter(available).length}<span class="stat-note"> / ${state.menu.length}</span>`, note:'Fresh picks on the menu', icon:'food', color:'purple'}
    ] : [
      {label:'New orders', value:counts.Placed, note:'Ready for your magic', icon:'bag', color:'peach'},
      {label:'Preparing', value:counts.Preparing, note:'Something good is cooking', icon:'food', color:'purple'},
      {label:'Ready to collect', value:counts.Ready, note:'A happy break awaits', icon:'check', color:'green'},
      {label:'Completed', value:counts.Completed, note:'Served with a smile', icon:'check', color:''}
    ];
    $('#statsGrid').innerHTML = cards.map(card => `<article class="stat-card"><div class="stat-top"><span class="stat-label">${card.label}</span><span class="stat-icon ${card.color}">${icon(card.icon)}</span></div><div class="stat-value">${card.value}</div><div class="stat-note">${card.note}</div></article>`).join('');
  }
  function renderOverview(state) {
    const recent = sortedOrders(state.orders).slice(0, 5);
    $('#recentOrders').innerHTML = recent.length ? recent.map(order => `<div class="recent-order"><span class="order-avatar" aria-hidden="true">${escape(initials(order.student))}</span><div class="recent-order-copy"><strong>${escape(order.id)} <span class="sr-only">for</span> · ${escape(order.student)}</strong><small>${order.items.reduce((total, item) => total + Number(item.qty), 0)} items · ${money(order.total)} · ${timeLabel(order.createdAt)}</small></div>${statusMarkup(order.status)}</div>`).join('') : empty('The first bite is on its way.', 'New student orders will appear here.');
    $('#menuSnapshot').innerHTML = `<div class="snapshot-total"><strong>${state.menu.filter(available).length}</strong> delicious picks available</div><div class="snapshot-categories">${categories.map(category => `<div class="snapshot-category"><span>${category === 'Burger' ? 'Burgers' : category}</span><strong>${state.menu.filter(item => item.category === category && available(item)).length} available</strong></div>`).join('')}</div>`;
  }
  function orderTable(orders, history = false) {
    if (!orders.length) return empty(history ? 'No completed orders yet.' : 'No orders here just yet.', history ? 'Collected orders will be saved here.' : 'Try another filter or wait for a student to place an order.', history ? 'check' : 'bag');
    return `<div class="table-scroll"><table class="staff-table"><thead><tr><th scope="col">ORDER</th><th scope="col">STUDENT</th><th scope="col">ITEMS</th><th scope="col">TOTAL</th><th scope="col">STATUS</th><th scope="col">${history ? 'COLLECTED' : 'NEXT STEP'}</th></tr></thead><tbody>${orders.map(order => `<tr><td><strong>${escape(order.id)}</strong><small>${timeLabel(order.createdAt)} · Token ${escape(order.token || order.id.replace('QB',''))}</small></td><td><strong>${escape(order.student)}</strong><small>${escape(order.studentEmail)}</small></td><td><strong>${order.items.reduce((sum,item) => sum + Number(item.qty),0)} ${order.items.reduce((sum,item) => sum + Number(item.qty),0) === 1 ? 'item' : 'items'}</strong><small title="${escape(order.items.map(item => `${item.qty} × ${item.name}`).join(', '))}">${escape(order.items.map(item => `${item.qty} × ${item.name}`).join(', '))}</small></td><td>${money(order.total)}</td><td>${statusMarkup(order.status)}</td><td>${history ? `<small>${new Date(order.updatedAt).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</small><strong>${timeLabel(order.updatedAt)}</strong>` : advanceButton(order)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderOrders(state) {
    $('#orderFilters').innerHTML = ['All', ...statuses].map(status => `<button type="button" data-status-filter="${status}" class="${ui.orderStatus === status ? 'selected' : ''}" aria-pressed="${ui.orderStatus === status}">${status === 'All' ? 'All orders' : status}</button>`).join('');
    const orders = sortedOrders(state.orders).filter(order => (ui.orderStatus === 'All' || order.status === ui.orderStatus) && orderMatches(order, ui.orderSearch));
    $('#orderResultsCount').textContent = `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`;
    $('#ordersTable').innerHTML = orderTable(orders);
  }
  function renderMenu(state) {
    $('#menuFilters').innerHTML = ['All', ...categories].map(category => `<button type="button" data-category-filter="${category}" class="${ui.menuCategory === category ? 'selected' : ''}" aria-pressed="${ui.menuCategory === category}">${category === 'All' ? 'All items' : category}</button>`).join('');
    const q = ui.menuSearch.trim().toLowerCase();
    const items = state.menu.filter(item => (ui.menuCategory === 'All' || item.category === ui.menuCategory) && (!q || `${item.name} ${item.category}`.toLowerCase().includes(q)));
    $('#menuTable').innerHTML = items.length ? `<div class="table-scroll"><table class="staff-table"><thead><tr><th scope="col">MENU ITEM</th><th scope="col">CATEGORY</th><th scope="col">PRICE</th><th scope="col">STOCK</th><th scope="col">AVAILABLE</th><th scope="col"><span class="sr-only">Edit item</span></th></tr></thead><tbody>${items.map(item => `<tr><td><div class="menu-cell">${foodArt(item,'menu-cell-art')}<div><strong>${escape(item.name)}</strong><small>${item.veg ? 'Vegetarian' : 'Non vegetarian'}</small></div></div></td><td>${escape(item.category)}</td><td><strong>${money(item.price)}</strong></td><td><strong class="${Number(item.stock) < 6 ? 'stock-warning' : ''}">${Number(item.stock) || 0}</strong><small>${Number(item.stock) <= 0 ? 'Out of stock' : Number(item.stock) < 6 ? 'Running low' : 'In stock'}</small></td><td>${toggleMarkup(item,true)}</td><td><button type="button" class="edit-button" data-edit-menu="${escape(item.id)}" aria-label="Edit ${escape(item.name)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('No bites match your search.', 'Try a different name or category.', 'food');
  }
  function renderSettings(state) {
    if (ui.settingsDirty) return;
    $('#canteenOpen').checked = state.settings.open;
    $('#announcement').value = state.settings.announcement || '';
  }
  function renderBoard(state) {
    $('#kitchenBoard').innerHTML = statuses.slice(0,3).map(status => {
      const orders = sortedOrders(state.orders, true).filter(order => order.status === status && orderMatches(order, ui.kitchenSearch));
      const labels = {Placed:'New orders', Preparing:'In the kitchen', Ready:'Ready to collect'};
      const notes = {Placed:'A fresh craving has just arrived.', Preparing:'A little care in every delicious bite.', Ready:'Packed, fresh, and ready for a break.'};
      return `<section class="board-column column-${status.toLowerCase()}" aria-label="${status} orders"><div class="board-column-head"><h3><span class="column-dot"></span>${labels[status]}</h3><span class="board-count">${orders.length}</span></div><p class="column-description">${notes[status]}</p><div class="board-tickets">${orders.length ? orders.map(order => `<article class="order-ticket"><div class="ticket-head"><strong class="ticket-id">${escape(order.id)}</strong><span class="ticket-age" title="${escape(new Date(order.createdAt).toLocaleString('en-IN'))}">${icon('clock')}${ageLabel(order.createdAt)}</span></div><div class="ticket-student"><span class="ticket-initial" aria-hidden="true">${escape(initials(order.student))}</span>${escape(order.student)}</div><ul class="ticket-items">${order.items.map(item => `<li><span class="ticket-item-qty">${Number(item.qty)}×</span><span>${escape(item.name)}</span></li>`).join('')}</ul><div class="ticket-bottom"><span class="ticket-token">Pickup token <strong>${escape(order.token || order.id.replace('QB',''))}</strong></span><span class="ticket-total">${money(order.total)}</span></div><button type="button" class="ticket-action" data-advance="${escape(order.id)}">${icon(status === 'Placed' ? 'food' : 'check')}${nextAction[status]}${status === 'Placed' ? icon('arrow') : ''}</button></article>`).join('') : `<div class="board-empty">${icon(status === 'Preparing' ? 'food' : status === 'Ready' ? 'check' : 'bag')}<strong>${ui.kitchenSearch ? 'No matching orders' : status === 'Placed' ? 'All caught up!' : status === 'Preparing' ? 'A moment to breathe' : 'A fresh batch is on its way'}</strong><p>${ui.kitchenSearch ? 'Try another order number or student name.' : status === 'Placed' ? 'New orders will appear right here.' : status === 'Preparing' ? 'Start a new order to get cooking.' : 'Orders marked ready appear here.'}</p></div>`}</div></section>`;
    }).join('');
  }
  function renderHistory(state) {
    const orders = [...state.orders].filter(order => order.status === 'Completed' && orderMatches(order,ui.historySearch)).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    $('#completedCount').textContent = `${orders.length} completed`;
    $('#historyTable').innerHTML = orderTable(orders,true);
  }
  function renderAvailability(state) {
    const q = ui.availabilitySearch.trim().toLowerCase();
    const items = state.menu.filter(item => (ui.availableFilter === 'All' || (ui.availableFilter === 'Available' ? available(item) : !available(item))) && (!q || `${item.name} ${item.category}`.toLowerCase().includes(q)));
    $('#availableCount').textContent = `${state.menu.filter(available).length} available`;
    $$('[data-available-filter]').forEach(button => { button.classList.toggle('selected',button.dataset.availableFilter === ui.availableFilter); button.setAttribute('aria-pressed',button.dataset.availableFilter === ui.availableFilter); });
    $('#availabilityGrid').innerHTML = items.length ? items.map(item => `<article class="availability-card ${available(item) ? '' : 'unavailable'}">${foodArt(item,'availability-art')}<div class="availability-card-body"><h3>${escape(item.name)}</h3><div class="availability-card-meta"><span>${escape(item.category)}</span><strong>${money(item.price)}</strong></div><div class="availability-card-footer"><span>${Number(item.stock) <= 0 ? 'Out of stock' : available(item) ? `${Number(item.stock)} in stock · Available` : 'Paused from menu'}</span>${toggleMarkup(item)}</div></div></article>`).join('') : empty('No items match.', 'Try another search or availability filter.', 'food');
  }
  function render() {
    const state = QB.getState();
    renderStats(state);
    if (role === 'admin') {
      if (ui.view === 'overview') renderOverview(state);
      if (ui.view === 'orders') renderOrders(state);
      if (ui.view === 'menu') renderMenu(state);
      if (ui.view === 'settings') renderSettings(state);
    } else {
      $('#serviceStatus').textContent = state.settings.open ? 'Campus canteen is open' : 'Campus canteen is paused for new orders';
      $('#serviceAnnouncement').textContent = state.settings.announcement || 'Made fresh. Served with a little extra care.';
      if (ui.view === 'board') renderBoard(state);
      if (ui.view === 'history') renderHistory(state);
      if (ui.view === 'availability') renderAvailability(state);
    }
  }
  function setView(view) {
    const views = role === 'admin' ? ['overview','orders','menu','settings'] : ['board','history','availability'];
    if (!views.includes(view)) view = views[0];
    ui.view = view;
    const copy = {
      overview:['A LITTLE BEHIND THE SCENES','Good food starts here','Your canteen, at a glance. Let’s make today delicious.'],
      orders:['EVERY CRAVING COUNTS','Keep every order moving','A little teamwork. A lot of happy food breaks.'],
      menu:['FRESH PICKS, HAPPY STUDENTS','A menu made for campus','Good food deserves a menu that’s always up to date.'],
      settings:['THE LITTLE DETAILS MATTER','Your canteen, your way','Set the pace and keep your students in the loop.'],
      board:['A LITTLE MAGIC IN THE KITCHEN','Let’s serve some smiles','Fresh orders, happy students. Keep the good food moving.'],
      history:['GOOD FOOD, HAPPY MEMORIES','Another break, made better','Every collected order is another happy campus craving.'],
      availability:['STRAIGHT FROM YOUR KITCHEN','What’s cooking today','Keep students in the know about their favorite bites.']
    }[view];
    $('#pageEyebrow').textContent = copy[0];
    $('#pageTitle').replaceChildren(document.createTextNode(copy[1]));
    const dot = document.createElement('span'); dot.textContent = '.'; $('#pageTitle').append(dot);
    $('#pageDescription').textContent = copy[2];
    $$('.staff-view').forEach(section => { section.hidden = section.id !== `${view}View`; });
    $$('[data-view]').forEach(link => { const active = link.dataset.view === view; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
    if ($('#staffHero')) $('#staffHero').hidden = view !== 'overview';
    $('#staffNav').classList.remove('open');
    $('#staffMenuToggle').setAttribute('aria-expanded','false');
    render();
  }
  function openMenuEditor(id) {
    const item = id === undefined ? null : QB.menu().find(entry => String(entry.id) === String(id));
    if (id !== undefined && !item) { toast('This menu item could not be found.'); return; }
    $('#menuItemForm').reset();
    $('#menuFormError').hidden = true;
    $('#menuDialogTitle').textContent = item ? 'A fresh little update.' : 'Add a little delicious.';
    $('#itemId').value = item?.id ?? '';
    $('#itemName').value = item?.name || '';
    $('#itemCategory').value = item?.category || 'Snacks';
    $('#itemEmoji').value = item?.emoji || '🍽️';
    $('#itemPrice').value = item?.price ?? '';
    $('#itemStock').value = item?.stock ?? 20;
    $('#itemDescription').value = item?.description || '';
    $('#itemVeg').checked = item?.veg ?? true;
    $('#itemAvailable').checked = item?.available ?? true;
    $('#menuDialog').showModal();
    $('#itemName').focus();
  }

  $('#profileName').textContent = user.name || (role === 'admin' ? 'Admin' : 'Kitchen team');
  $('.profile-avatar').textContent = initials(user.name || role).slice(0,2);
  $('#todayDate').textContent = new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  $('#currentYear').textContent = new Date().getFullYear();
  $('#logoutButton').addEventListener('click',() => QBAuth.logout());
  $('#staffMenuToggle').addEventListener('click', () => {
    const open = $('#staffNav').classList.toggle('open');
    $('#staffMenuToggle').setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a');
    if (!target) return;
    if (target.dataset.view) { event.preventDefault(); if (location.hash !== `#${target.dataset.view}`) location.hash = target.dataset.view; else setView(target.dataset.view); }
    if (target.dataset.go) location.hash = target.dataset.go;
    if (target.dataset.advance) perform(() => QB.advanceOrder(target.dataset.advance),'Order updated. A happy break is one step closer!');
    if (target.dataset.statusFilter) { ui.orderStatus = target.dataset.statusFilter; renderOrders(QB.getState()); }
    if (target.dataset.categoryFilter) { ui.menuCategory = target.dataset.categoryFilter; renderMenu(QB.getState()); }
    if (target.dataset.availableFilter) { ui.availableFilter = target.dataset.availableFilter; renderAvailability(QB.getState()); }
    if (target.dataset.toggleAvailability) {
      const item = QB.menu().find(entry => String(entry.id) === target.dataset.toggleAvailability);
      if (item) perform(() => QB.setAvailability(item.id,!available(item)), `${item.name} ${available(item) ? 'paused from' : 'available on'} the menu.`);
    }
    if (target.dataset.editMenu) openMenuEditor(target.dataset.editMenu);
  });
  const searchInputs = {orderSearch:'orderSearch',menuSearch:'menuSearch',kitchenSearch:'kitchenSearch',historySearch:'historySearch',availabilitySearch:'availabilitySearch'};
  Object.entries(searchInputs).forEach(([id,key]) => { const input = $(`#${id}`); if (input) input.addEventListener('input',() => { ui[key] = input.value; render(); }); });
  if (role === 'admin') {
    $('#addMenuItem').addEventListener('click',() => openMenuEditor());
    const closeEditor = () => $('#menuDialog').close();
    $('#closeMenuDialog').addEventListener('click',closeEditor);
    $('#cancelMenuDialog').addEventListener('click',closeEditor);
    $('#menuDialog').addEventListener('click',event => { if (event.target === $('#menuDialog')) { const bounds = $('#menuDialog').getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeEditor(); } });
    $('#menuItemForm').addEventListener('submit',event => {
      event.preventDefault();
      const id = $('#itemId').value;
      const existing = id ? QB.menu().find(item => String(item.id) === id) : null;
      const item = {name:$('#itemName').value.trim(),category:$('#itemCategory').value,emoji:$('#itemEmoji').value.trim() || '🍽️',price:Number($('#itemPrice').value),stock:Number($('#itemStock').value),description:$('#itemDescription').value.trim(),veg:$('#itemVeg').checked,available:$('#itemAvailable').checked};
      if (!item.name) { $('#menuFormError').textContent = 'Please enter an item name.'; $('#menuFormError').hidden = false; return; }
      if (existing) item.id = existing.id;
      try { QB.saveMenu(item); closeEditor(); toast(existing ? 'Menu item updated. Looking delicious!' : 'Your new bite is on the menu!'); }
      catch (error) { $('#menuFormError').textContent = error.message || 'This item could not be saved. Please try again.'; $('#menuFormError').hidden = false; }
    });
    $('#settingsForm').addEventListener('input',() => { ui.settingsDirty = true; $('#settingsSaveState').textContent = 'Unsaved changes'; });
    $('#settingsForm').addEventListener('submit',event => {
      event.preventDefault();
      try { QB.updateSettings({open:$('#canteenOpen').checked,announcement:$('#announcement').value.trim()}); ui.settingsDirty = false; $('#settingsSaveState').textContent = 'Changes saved'; toast('Your canteen settings are up to date.'); }
      catch (error) { toast(error.message || 'Settings could not be saved. Please try again.'); }
    });
  }
  document.addEventListener('error',event => { if (event.target.matches?.('[data-food-image]')) event.target.hidden = true; },true);
  window.addEventListener('hashchange',() => setView(location.hash.slice(1)));
  QB.subscribe(() => render());
  setView(location.hash.slice(1));
})();
