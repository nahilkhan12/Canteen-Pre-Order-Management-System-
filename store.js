/* Shared browser-only demo data. This is not server authentication or a database. */
(() => {
  'use strict';
  const KEY = 'qb-blue-data-v1';
  const categories = ['Pizza', 'Burger', 'Indian', 'Snacks', 'Drinks'];
  const statuses = ['Placed', 'Preparing', 'Ready', 'Completed'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const listeners = new Set();
  const fail = message => { throw new Error(message); };
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=620&q=82`;
  const initialMenu = [
    [1,'Margherita Pizza','Pizza','Cheesy, melty and made to share.',189,4.8,true,true,'BESTSELLER','🍕','#ffdfb7','#fff4d8','photo-1574071318508-1cdbab80d002'],
    [2,'Classic Veg Burger','Burger','A juicy patty and crunchy veggies.',99,4.7,true,true,'STUDENT FAVE','🍔','#f9d7aa','#fff4dc','photo-1568901346375-23c9450c58cd'],
    [3,'Chicken Biryani','Indian','Fragrant rice and bold desi spices.',169,4.9,false,true,'TOP RATED','🍛','#edd8b1','#fff0cb','photo-1563379091339-03246963d96c'],
    [4,'Masala Dosa','Indian','Golden and crispy, with fresh chutney.',79,4.6,true,false,'FRESH PICK','🥞','#ffe5bd','#fff7e7','photo-1630383249896-424e482df921'],
    [5,'Peri Peri Fries','Snacks','Crispy fries with a spicy little kick.',69,4.6,true,true,'QUICK BITE','🍟','#ffdcad','#fff5da','photo-1573080496219-bb080dd4f877'],
    [6,'Iced Coffee','Drinks','Chilled, creamy and study-session ready.',89,4.7,true,false,'CHILL OUT','🧋','#ead8ce','#fff3ec','photo-1461023058943-07fcbe16d735'],
    [7,'Paneer Tikka Wrap','Snacks','Soft wrap, smoky paneer and crunch.',119,4.8,true,false,'TRY ME','🌯','#f7d7b3','#fff3de','photo-1626700051175-6818013e1d4f'],
    [8,'Veg Hakka Noodles','Indian','Wok-tossed noodles, full of flavor.',99,4.7,true,false,'COMFORT FOOD','🍜','#e6d5a3','#f5e9c4','photo-1569718212165-3a8278d5f624']
  ].map(([id,name,category,description,price,rating,veg,popular,badge,emoji,bg,light,image]) => ({id,name,category,description,price,rating,veg,popular,badge,emoji,bg,light,image:photo(image),stock:30,available:true}));

  function seed() {
    const now = Date.now();
    const makeOrder = (id, student, studentEmail, pairs, status, minutes) => {
      const items = pairs.map(([id,qty]) => { const {name,emoji,price} = initialMenu.find(item => item.id === id); return {id,name,emoji,price,qty}; });
      return {id:`QB${id}`,token:String(id),student,studentEmail,items,total:round(items.reduce((n,item)=>n+item.price*item.qty,0)),status,createdAt:new Date(now-minutes*60000).toISOString(),updatedAt:new Date(now-minutes*60000).toISOString()};
    };
    return {version:1,revision:1,wallet:540,nextOrder:1047,settings:{open:true,announcement:'Freshly made. Served with a smile.'},menu:copy(initialMenu),orders:[
      makeOrder(1046,'Priya Sharma','priya@campus.demo',[[2,1],[5,1]],'Placed',3),
      makeOrder(1045,'Alex Johnson','student@quickbite.demo',[[4,1],[6,1]],'Preparing',8),
      makeOrder(1044,'Rahul Mehta','rahul@campus.demo',[[3,1]],'Preparing',12),
      makeOrder(1043,'Sara Ahmed','sara@campus.demo',[[7,1],[6,1]],'Ready',18),
      makeOrder(1042,'Alex Johnson','student@quickbite.demo',[[2,1]],'Completed',40),
      makeOrder(1041,'Priya Sharma','priya@campus.demo',[[1,1],[5,1]],'Completed',65)
    ]};
  }
  function valid(value) {
    if (!value || value.version!==1 || !Number.isInteger(value.revision) || value.revision<1 || !Number.isFinite(value.wallet) || value.wallet<0 || !Number.isInteger(value.nextOrder) || !value.settings || typeof value.settings.open!=='boolean' || typeof value.settings.announcement!=='string' || !Array.isArray(value.menu) || !value.menu.length || !Array.isArray(value.orders)) return false;
    if (!value.menu.every(item=>Number.isInteger(item.id)&&item.id>0&&typeof item.name==='string'&&categories.includes(item.category)&&Number.isFinite(item.price)&&item.price>=1&&Number.isInteger(item.stock)&&item.stock>=0&&typeof item.available==='boolean'&&Number.isFinite(item.rating)&&typeof item.description==='string')) return false;
    if (new Set(value.menu.map(item=>item.id)).size!==value.menu.length) return false;
    return value.orders.every(order=>/^QB\d+$/.test(order.id)&&statuses.includes(order.status)&&typeof order.student==='string'&&typeof order.studentEmail==='string'&&Number.isFinite(Date.parse(order.createdAt))&&Number.isFinite(Date.parse(order.updatedAt))&&Number.isFinite(order.total)&&order.total>0&&Array.isArray(order.items)&&order.items.length&&order.items.every(item=>Number.isInteger(item.qty)&&item.qty>0&&Number.isFinite(item.price)&&item.price>0)&&round(order.items.reduce((sum,item)=>sum+item.qty*item.price,0))===order.total) && new Set(value.orders.map(o=>o.id)).size===value.orders.length && value.nextOrder>Math.max(0,...value.orders.map(o=>Number(o.id.slice(2))));
  }
  function read() {
    try { const value = JSON.parse(localStorage.getItem(KEY)); return valid(value) ? value : null; } catch { return null; }
  }
  let state = read() || seed();
  function sync() { const saved = read(); if(saved && saved.revision!==state.revision) state=saved; }
  function notify() { listeners.forEach(fn=> { try { fn(copy(state)); } catch(error) { console.error(error); } }); }
  function role(...allowed) { const user=window.QBAuth?.getUser(); if(!user||!allowed.includes(user.role)) fail('Please sign in with the correct demo account.'); return user; }
  function mutate(action) {
    sync(); const draft=copy(state); const result=action(draft); draft.revision++;
    try { localStorage.setItem(KEY,JSON.stringify(draft)); } catch { fail('Could not save this change. Please allow browser storage and try again.'); }
    state=draft; notify(); return copy(result===undefined?state:result);
  }
  function getState() { sync(); return copy(state); }
  function validateItem(item) {
    item.name=String(item.name||'').trim(); item.description=String(item.description||'').trim();
    if(!item.name||item.name.length>80) fail('Enter an item name of 1–80 characters.');
    if(!categories.includes(item.category)) fail('Choose a valid category.');
    if(!Number.isFinite(item.price)||item.price<1||item.price>10000) fail('Enter a price between ₹1 and ₹10,000.');
    item.price=round(item.price);
    if(!Number.isInteger(item.stock)||item.stock<0||item.stock>10000) fail('Stock must be a whole number between 0 and 10,000.');
    if(typeof item.available!=='boolean'||typeof item.veg!=='boolean') fail('Choose a valid availability and diet.');
    if(item.description.length>300) fail('Keep the description within 300 characters.');
    if(item.image && !/^https?:\/\//i.test(item.image)) fail('Use an http or https image address.');
    if(!Number.isFinite(item.rating)||item.rating<0||item.rating>5) fail('Rating must be between 0 and 5.');
    return item;
  }
  window.QB = {
    getState,
    menu:()=>getState().menu,
    orders:()=>getState().orders,
    placeOrder(items) {
      const user=role('student');
      return mutate(draft=> {
        if(!draft.settings.open) fail('The canteen is taking a break. Please try again when it reopens.');
        if(!Array.isArray(items)||!items.length) fail('Add something to your cart first.');
        const seen=new Set();
        const lines=items.map(({id,qty})=> {
          if(seen.has(id)) fail('Your cart has a duplicate item. Please refresh it.'); seen.add(id);
          const item=draft.menu.find(m=>m.id===id);
          if(!item||!item.available) fail(`${item?.name||'An item'} is currently unavailable. Please update your cart.`);
          if(!Number.isInteger(qty)||qty<1||qty>25||qty>item.stock) fail(`There are not enough portions of ${item.name}. Please update your cart.`);
          return {id,name:item.name,emoji:item.emoji,price:item.price,qty};
        });
        const total=round(lines.reduce((n,item)=>n+item.price*item.qty,0));
        if(total>draft.wallet) fail('Your demo wallet does not have enough balance.');
        const token=String(draft.nextOrder++), now=new Date().toISOString();
        const order={id:'QB'+token,token,student:user.name,studentEmail:user.email,items:lines,total,status:'Placed',createdAt:now,updatedAt:now};
        draft.wallet=round(draft.wallet-total);
        lines.forEach(line=> { draft.menu.find(item=>item.id===line.id).stock-=line.qty; });
        draft.orders.unshift(order); return order;
      });
    },
    advanceOrder(id) {
      role('admin','kitchen');
      return mutate(draft=> {
        const order=draft.orders.find(o=>o.id===id);
        const index=order?statuses.indexOf(order.status):-1;
        if(index<0||index===statuses.length-1) fail('This order cannot move to another stage.');
        order.status=statuses[index+1]; order.updatedAt=new Date().toISOString(); return order;
      });
    },
    setAvailability(id,available) {
      role('admin','kitchen');
      return mutate(draft=> {const item=draft.menu.find(m=>m.id===Number(id));if(!item||typeof available!=='boolean')fail('Choose a valid menu item.');if(available&&item.stock===0)fail('Add portions before making this item available.');item.available=available;return item;});
    },
    saveMenu(input) {
      role('admin');
      return mutate(draft=> {
        const existing=input.id===undefined?null:draft.menu.find(m=>m.id===Number(input.id));
        if(input.id!==undefined&&!existing) fail('This menu item could not be found.');
        const base=existing||{id:Math.max(...draft.menu.map(m=>m.id))+1,name:'',category:'Snacks',price:1,description:'Fresh from our campus kitchen.',rating:4.5,veg:true,popular:false,badge:'FRESH PICK',emoji:'🍽️',bg:'#d9f0fd',light:'#effaff',image:'',available:true,stock:30};
        const allowed=['name','category','price','stock','description','veg','popular','available','emoji','image','badge'];
        const item=copy(base); allowed.forEach(key=> {if(input[key]!==undefined)item[key]=input[key];});
        validateItem(item); if(item.stock===0)item.available=false;
        if(existing)draft.menu[draft.menu.indexOf(existing)]=item;else draft.menu.push(item);
        return item;
      });
    },
    updateSettings(input) {
      role('admin');
      return mutate(draft=> {
        if(input.open!==undefined){if(typeof input.open!=='boolean')fail('Choose open or closed.');draft.settings.open=input.open;}
        if(input.announcement!==undefined){if(typeof input.announcement!=='string'||input.announcement.trim().length>200)fail('Keep the announcement within 200 characters.');draft.settings.announcement=input.announcement.trim();}
        return draft.settings;
      });
    },
    subscribe(fn) {listeners.add(fn);return ()=>listeners.delete(fn);}
  };
  window.addEventListener('storage',event=> {if(event.key===KEY||event.key===null){sync();notify();}});
  window.addEventListener('focus',()=>{sync();notify();});
})();
