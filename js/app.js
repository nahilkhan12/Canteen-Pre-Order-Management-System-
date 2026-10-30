/* Student menu and ordering interactions. */
(() => {
'use strict';
const user = QBAuth.requireRole('student');
if (!user) return;
let menu = QB.menu();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${value.toLocaleString('en-IN')}`;
let savedCart = [];
try { const value = JSON.parse(sessionStorage.getItem('qb-blue-cart') || '[]'); if(Array.isArray(value)) savedCart=value.filter(pair=>Array.isArray(pair)&&menu.some(item=>item.id===pair[0])&&Number.isInteger(pair[1])&&pair[1]>0&&pair[1]<=25); } catch {}
const state = {category:'All',filter:'all',search:'',sort:'featured',cart:new Map(savedCart),wallet:QB.getState().wallet};
const saveCart = () => {try {sessionStorage.setItem('qb-blue-cart',JSON.stringify([...state.cart]));}catch{}};
let toastTimer;
const els = {
  foodGrid:$('#foodGrid'),emptyResults:$('#emptyResults'),menuCount:$('#menuCount'),
  walletAmount:$('#walletAmount'),cartCount:$('#cartCount'),drawerCount:$('#drawerCount'),
  cartDrawer:$('#cartDrawer'),drawerOverlay:$('#drawerOverlay'),cartContent:$('#cartContent'),
  cartFooter:$('#cartFooter'),openCart:$('#openCart'),closeCart:$('#closeCart'),
  toast:$('#toast'),heroSearch:$('#heroSearch'),siteNav:$('#siteNav'),menuToggle:$('#menuToggle')
};

function getVisibleMenu(){
  const q=state.search.trim().toLocaleLowerCase();
  const filtered=menu.filter(food=>{
    const matchesCategory=state.category==='All'||food.category===state.category;
    const matchesSearch=!q||`${food.name} ${food.category} ${food.description}`.toLowerCase().includes(q);
    const matchesFilter=state.filter==='all'||(state.filter==='veg'&&food.veg)||(state.filter==='under100'&&food.price<100)||(state.filter==='popular'&&food.popular);
    return matchesCategory&&matchesSearch&&matchesFilter;
  });
  if(state.sort==='price-low') filtered.sort((a,b)=>a.price-b.price);
  if(state.sort==='price-high') filtered.sort((a,b)=>b.price-a.price);
  if(state.sort==='rating') filtered.sort((a,b)=>b.rating-a.rating);
  return filtered;
}
function qtyMarkup(id,qty){
  return `<div class="qty-control" aria-label="Quantity ${qty}"><button type="button" data-cart-action="decrease" data-id="${id}" aria-label="Remove one"><svg class="icon"><use href="#i-minus"/></svg></button><span>${qty}</span><button type="button" data-cart-action="increase" data-id="${id}" aria-label="Add one"><svg class="icon"><use href="#i-plus"/></svg></button></div>`;
}
function renderFood(){
  const visible=getVisibleMenu();
  els.menuCount.textContent=`${visible.length} delicious ${visible.length===1?'pick':'picks'}`;
  els.foodGrid.innerHTML=visible.map(food=>{
    const qty=state.cart.get(food.id)||0;
    return `<article class="food-card">
      <div class="food-photo" style="--food-bg:${food.bg};--food-light:${food.light}">
        <span class="food-emoji" aria-hidden="true">${food.emoji}</span>
        ${food.image?`<img alt="${esc(food.name)}" loading="lazy" src="${esc(food.image)}" onerror="this.style.display='none'" />`:''}
        <span class="food-tag">${esc(food.badge)}</span>
      </div>
      <div class="food-info"><div class="food-meta"><span title="${food.veg?'Vegetarian':'Non vegetarian'}" class="veg-indicator ${food.veg?'':'nonveg-indicator'}">●</span><span class="rating"><svg class="icon"><use href="#i-star"/></svg>${food.rating.toFixed(1)}</span></div>
      <h3>${esc(food.name)}</h3><p class="food-description">${esc(food.description)}</p>
      <div class="food-bottom"><div class="price">${money(food.price)}<small>per item</small></div>
      ${qty?qtyMarkup(food.id,qty):(!food.available||food.stock<1?'<span class="unavailable-label">Sold out</span>':`<button class="add-button" type="button" data-cart-action="increase" data-id="${food.id}"><svg class="icon"><use href="#i-plus"/></svg> ADD</button>`)}
      </div></div></article>`;
  }).join('');
  els.emptyResults.hidden=visible.length!==0;
}
function cartItems(){return [...state.cart.entries()].filter(([id,qty])=>qty>0&&menu.some(food=>food.id===id)).map(([id,qty])=>({...menu.find(food=>food.id===id),qty}));}
function renderCart(){
  const items=cartItems();
  const totalQty=items.reduce((n,item)=>n+item.qty,0);
  const subtotal=items.reduce((n,item)=>n+item.price*item.qty,0);
  els.cartCount.textContent=totalQty;els.drawerCount.textContent=`(${totalQty})`;
  els.walletAmount.textContent=money(state.wallet);
  els.cartFooter.hidden=items.length===0;
  if(!items.length){
    els.cartContent.innerHTML=`<div class="cart-empty"><div class="cart-empty-art">🛒</div><h3>Your cart is a little hungry.</h3><p>Good things start with a good meal.<br>Find something delicious on the menu!</p><button class="primary-btn" type="button" data-close-cart>Browse the menu</button></div>`;
  }else{
    els.cartContent.innerHTML=items.map(item=>`<div class="cart-item"><div class="cart-item-emoji" aria-hidden="true">${esc(item.emoji)}</div><div class="cart-item-details"><strong>${esc(item.name)}</strong><span>${money(item.price*item.qty)}</span>${qtyMarkup(item.id,item.qty)}</div></div>`).join('');
    $('#cartSubtotal').textContent=money(subtotal);$('#cartTotal').textContent=money(subtotal);
    const button=$('#placeOrder');
    const invalid=items.some(item=>!item.available||item.qty>item.stock);
    const closed=!QB.getState().settings.open;
    button.disabled=subtotal>state.wallet||invalid||closed;
    button.innerHTML=closed?'Canteen is taking a break':invalid?'Update unavailable items':subtotal>state.wallet?'Insufficient demo wallet balance':`Place demo order <svg class="icon"><use href="#i-arrow"/></svg>`;
  }
}
function setCartQuantity(id,amount){
  const item=menu.find(food=>food.id===id);if(!item)return;
  if(amount>0&&(!item.available||!QB.getState().settings.open)){toast('This item is currently unavailable.');return;}
  if(amount>0&&(state.cart.get(id)||0)>=item.stock){toast('No more portions are available.');return;}
  const newQuantity=Math.max(0,Math.min(25,(state.cart.get(id)||0)+amount));
  if(newQuantity===0)state.cart.delete(id);else state.cart.set(id,newQuantity);
  saveCart();renderFood();renderCart();
  if(amount>0)toast(`${item.name} added to your cart`);
}
function toast(message){
  els.toast.textContent=message;els.toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2600);
}
function setDrawer(open){
  if(open){menu=QB.menu();state.wallet=QB.getState().wallet;renderCart();}
  els.cartDrawer.classList.toggle('open',open);
  els.cartDrawer.setAttribute('aria-hidden',String(!open));
  els.drawerOverlay.hidden=!open;
  document.body.classList.toggle('drawer-open',open);
  document.querySelector('main').inert=open;
  document.querySelector('header').inert=open;
  document.querySelector('footer').inert=open;
  els.cartDrawer.inert=!open;
  if(open)els.closeCart.focus();else els.openCart.focus();
}
function selectCategory(category,scroll=true){
  state.category=category;
  document.querySelectorAll('[data-category]').forEach(btn=>{
    const selected=btn.dataset.category===category;
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-pressed',String(selected));
  });
  renderFood();if(scroll)$('#menu').scrollIntoView({behavior:'smooth',block:'start'});
}
function selectFilter(filter,scroll=false){
  state.filter=filter;
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    const selected=btn.dataset.filter===filter;
    btn.classList.toggle('selected',selected);
    btn.setAttribute('aria-pressed',String(selected));
  });
  renderFood();if(scroll)$('#menu').scrollIntoView({behavior:'smooth',block:'start'});
}

// Event delegation lets filters, food cards and the drawer update without reloads.
document.addEventListener('click',(event)=>{
  const cat=event.target.closest('[data-category]');if(cat){selectCategory(cat.dataset.category);return;}
  const filter=event.target.closest('[data-filter]');if(filter){selectFilter(filter.dataset.filter);return;}
  const cartAction=event.target.closest('[data-cart-action]');if(cartAction){setCartQuantity(Number(cartAction.dataset.id),cartAction.dataset.cartAction==='increase'?1:-1);return;}
  if(event.target.closest('[data-close-cart]')){setDrawer(false);$('#menu').scrollIntoView({behavior:'smooth'});return;}
});
$('#heroSearchForm').addEventListener('submit',(event)=>{
  event.preventDefault();state.search=els.heroSearch.value;renderFood();
  $('#menu').scrollIntoView({behavior:'smooth',block:'start'});
});
els.heroSearch.addEventListener('input',()=>{
  state.search=els.heroSearch.value;
  renderFood();
});
$('#sortSelect').addEventListener('change',(event)=>{state.sort=event.target.value;renderFood();});
$('#exploreOffer').addEventListener('click',()=>{selectCategory('All',false);selectFilter('under100',true);});
$('#resetSearch').addEventListener('click',()=>{state.search='';els.heroSearch.value='';selectCategory('All',false);selectFilter('all',false);});
els.openCart.addEventListener('click',()=>setDrawer(true));
els.closeCart.addEventListener('click',()=>setDrawer(false));
els.drawerOverlay.addEventListener('click',()=>setDrawer(false));
document.addEventListener('keydown',(event)=>{
  if(!els.cartDrawer.classList.contains('open'))return;
  if(event.key==='Escape')setDrawer(false);
  if(event.key==='Tab'){
    const focusable=[...els.cartDrawer.querySelectorAll('button:not(:disabled),a[href],input')].filter(el=>el.offsetParent!==null);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
$('#placeOrder').addEventListener('click',()=>{
  try {
    const fresh=QB.menu();
    if(cartItems().some(item=>fresh.find(food=>food.id===item.id)?.price!==item.price)) {menu=fresh;renderFood();renderCart();toast('A menu price changed. Please review the updated total and order again.');return;}
    const order=QB.placeOrder(cartItems().map(({id,qty})=>({id,qty})));
    state.wallet=QB.getState().wallet;state.cart.clear();saveCart();renderFood();renderCart();setDrawer(false);renderOrders();
    toast(`Order ${order.id} placed! Your pickup token is ${order.token}.`);
    $('#my-orders').scrollIntoView({behavior:'smooth',block:'start'});
  } catch(error){toast(error.message);}
});
els.menuToggle.addEventListener('click',()=>{
  const open=els.siteNav.classList.toggle('open');
  els.menuToggle.setAttribute('aria-expanded',String(open));
});
els.siteNav.addEventListener('click',(event)=>{if(event.target.closest('a')){els.siteNav.classList.remove('open');els.menuToggle.setAttribute('aria-expanded','false');}});
$('#currentYear').textContent=new Date().getFullYear();
$('#studentName').textContent=user.name.split(' ')[0];
$('#signOut').addEventListener('click',()=>QBAuth.logout());
function renderOrders(){
  const orders=QB.orders().filter(order=>order.studentEmail===user.email);
  $('#studentOrders').innerHTML=orders.length?orders.map(order=>`<article class="student-order"><div class="student-order-top"><strong>${esc(order.id)}</strong><span class="order-status status-${order.status.toLowerCase()}">${esc(order.status==='Ready'?'Ready for pickup':order.status==='Completed'?'Collected':order.status)}</span></div><p>${order.items.map(item=>`${item.qty} × ${esc(item.name)}`).join(' · ')}</p><div class="student-order-bottom"><span>${new Date(order.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})}</span><strong>${money(order.total)}</strong></div><div class="pickup-token">PICKUP TOKEN <strong>${esc(order.token)}</strong></div></article>`).join(''):'<div class="empty-results"><h3>Your next good meal starts here.</h3><p>Place an order and follow its progress here.</p></div>';
  const {settings}=QB.getState();
  $('#canteenStatus').textContent=settings.open?'Canteen open':'Canteen taking a break';
  $('#canteenAnnouncement').textContent=settings.announcement;
}
QB.subscribe(()=>{menu=QB.menu();state.wallet=QB.getState().wallet;renderFood();renderCart();renderOrders();});
els.cartDrawer.inert=true;
selectCategory('All',false);selectFilter('all',false);renderCart();
renderOrders();
})();
