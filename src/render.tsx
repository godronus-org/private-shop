import * as React from "react";
import { renderToString } from "react-dom/server";
import { Layout } from "./components/Layout";
import { siteConfig } from "./config";
import { products } from "./data/products";

const c = siteConfig.colors;

const css = `
:root {
  --color-primary: ${c.primary};
  --color-primary-hover: ${c.primaryHover};
  --color-primary-text: ${c.primaryText};
  --color-cta: ${c.cta};
  --color-cta-hover: ${c.ctaHover};
  --color-bg: ${c.background};
  --color-surface: ${c.surface};
  --color-text: ${c.text};
  --color-muted: ${c.muted};
  --color-subtle: ${c.subtle};
  --color-border: ${c.border};
  --color-danger: ${c.danger};
  --font-heading: ${siteConfig.fonts.heading};
  --font-body: ${siteConfig.fonts.body};
  --radius: ${siteConfig.cornerRadius};
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-heading); margin: 0; color: var(--color-text); }
a { color: inherit; text-decoration: none; }

.page { max-width: 1200px; margin: 0 auto; padding: 0 20px 80px; }

.site-header {
  background: var(--color-surface);
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid var(--color-border);
}
.site-header-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between;
  height: 64px;
}
.logo { color: var(--color-text); display: flex; align-items: center; font-weight: 600; font-size: 1.3rem; }
.site-header nav { display: flex; gap: 32px; font-size: 14px; }
.site-header nav a { color: var(--color-muted); }
.site-header nav a:hover { color: var(--color-primary); }
.cart-btn {
  position: relative;
  background: var(--color-primary); color: var(--color-primary-text);
  border: none; padding: 8px 16px; cursor: pointer;
  font-family: var(--font-body); font-size: 14px;
  border-radius: var(--radius); text-decoration: none; display: inline-block;
}
.cart-btn:hover { background: var(--color-primary-hover); color: var(--color-primary-text); }

.header-right { display: flex; align-items: center; gap: 12px; }
.header-user { font-size: 13px; color: var(--color-muted); }
.btn-signin {
  font-size: 13px; padding: 6px 14px;
  border: 1px solid var(--color-border); border-radius: var(--radius);
  color: var(--color-text); text-decoration: none;
}
.btn-signin:hover { border-color: var(--color-primary); color: var(--color-primary); }
.btn-signout {
  font-size: 13px; padding: 6px 14px; cursor: pointer;
  border: 1px solid var(--color-border); border-radius: var(--radius);
  background: transparent; color: var(--color-muted); font-family: var(--font-body);
}
.btn-signout:hover { border-color: var(--color-danger); color: var(--color-danger); }
.cart-badge {
  position: absolute; top: -8px; right: -8px;
  background: var(--color-danger); color: #fff;
  border-radius: 50%; width: 20px; height: 20px;
  font-size: 11px; display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}

.hero { padding: 60px 0 40px; max-width: 720px; }
.hero h1 { font-size: 2.5rem; line-height: 1.2; margin-bottom: 12px; font-weight: 600; }
.hero-sub { color: var(--color-muted); font-size: 1rem; margin: 0 0 24px; }
.hero a { color: var(--color-primary); }
.hero a:hover { color: var(--color-primary-hover); }

.catalog { padding: 24px 0; }
.catalog h2 { font-size: 1.5rem; margin-bottom: 24px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
.card-image {
  aspect-ratio: 4 / 3;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  font-size: 80px;
}
.badge {
  position: absolute; top: 12px; left: 12px;
  background: var(--color-primary); color: var(--color-primary-text);
  padding: 3px 10px; font-size: 11px; font-weight: 600;
  letter-spacing: 0.05em; border-radius: var(--radius);
}
.card-body { padding: 16px 20px 20px; flex: 1; display: flex; flex-direction: column; }
.cat { font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-muted); margin: 0 0 6px; }
.card h3 { font-size: 1.1rem; font-weight: 500; margin: 0 0 8px; }
.desc { color: var(--color-muted); font-size: 14px; flex: 1; margin: 0 0 16px; line-height: 1.5; }
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.price { font-weight: 700; font-size: 1.1rem; color: var(--color-text); }
.buy {
  background: var(--color-cta); color: #fff;
  border: none; padding: 8px 14px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  border-radius: var(--radius);
}
.buy:hover { background: var(--color-cta-hover); }

.about { max-width: 760px; margin: 0 auto; padding: 32px 0; }
.about-hero { padding: 48px 0 32px; }
.about-hero h1 { font-size: 2.5rem; line-height: 1.1; margin: 12px 0 16px; }
.about-hero .lede { font-size: 1.1rem; color: var(--color-muted); line-height: 1.5; max-width: 560px; }
.about-section { padding: 32px 0; border-top: 1px solid var(--color-border); }
.about-section h2 { font-size: 1.4rem; margin-bottom: 16px; }
.about-section p { line-height: 1.7; color: var(--color-text); margin: 0 0 12px; }
.info-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 12px; }
.info-list li {
  display: flex; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border: 1px solid var(--color-border);
  border-radius: var(--radius); background: var(--color-surface);
}
.info-list strong { color: var(--color-text); }
.info-list span { color: var(--color-muted); text-align: right; }
.contact-link { color: var(--color-primary); }
.contact-link:hover { color: var(--color-primary-hover); }

.contact-page { padding: 48px 0; }
.contact-page h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 8px; }
.contact-page .page-sub { color: var(--color-muted); font-size: 1rem; margin: 0 0 40px; }
.contact-layout {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 60px;
  align-items: start;
}
.contact-details h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; margin-bottom: 24px; }
.detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); font-weight: 600; }
.detail-value { font-size: 15px; color: var(--color-text); line-height: 1.6; }
.detail-value a { color: var(--color-primary); }
.detail-value a:hover { color: var(--color-primary-hover); }

.contact-form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 32px;
}
.contact-form-card h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 24px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
.form-group label { font-size: 14px; font-weight: 500; color: var(--color-text); }
.form-group input,
.form-group textarea {
  font-family: var(--font-body); font-size: 15px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0,123,255,0.15);
}
.form-group textarea { resize: vertical; min-height: 140px; }
.btn-primary {
  background: var(--color-cta); color: #fff;
  border: none; padding: 11px 28px; cursor: pointer;
  font-family: var(--font-body); font-size: 15px; font-weight: 500;
  border-radius: var(--radius); width: 100%;
}
.btn-primary:hover { background: var(--color-cta-hover); }

@media (max-width: 768px) {
  .contact-layout { grid-template-columns: 1fr; gap: 40px; }
}

/* ── Landing page ─────────────────────────────────────────── */
.landing { }

.landing-hero {
  background: #1f2937;
  color: #fff;
  padding: 100px 0 80px;
  position: relative;
  overflow: hidden;
}
.landing-hero::after {
  content: '';
  position: absolute; bottom: -1px; left: 0; right: 0; height: 60px;
  background: var(--color-surface);
  clip-path: ellipse(55% 100% at 50% 100%);
}
.landing-hero-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 20px;
}
.landing-hero h1 {
  font-size: 3.5rem; font-weight: 700; line-height: 1.1;
  margin: 0 0 20px; color: #fff; max-width: 640px;
}
.landing-hero p {
  font-size: 1.2rem; color: rgba(255,255,255,0.75);
  margin: 0 0 36px; max-width: 520px; line-height: 1.6;
}
.landing-hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
.btn-hero-primary {
  background: var(--color-cta); color: #fff;
  padding: 14px 32px; border-radius: var(--radius);
  font-size: 15px; font-weight: 600; border: none; cursor: pointer;
  text-decoration: none; display: inline-block;
}
.btn-hero-primary:hover { background: var(--color-cta-hover); color: #fff; }
.btn-hero-secondary {
  background: transparent; color: rgba(255,255,255,0.85);
  padding: 14px 32px; border-radius: var(--radius);
  font-size: 15px; font-weight: 500;
  border: 1px solid rgba(255,255,255,0.3);
  text-decoration: none; display: inline-block;
}
.btn-hero-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }

.landing-about {
  background: var(--color-surface);
  padding: 80px 0;
}
.landing-about-inner {
  max-width: 760px; margin: 0 auto; padding: 0 20px;
  text-align: center;
}
.landing-about .eyebrow {
  font-size: 12px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--color-cta);
  margin: 0 0 16px;
}
.landing-about h2 {
  font-size: 2rem; font-weight: 700; margin: 0 0 24px; line-height: 1.2;
}
.landing-about p {
  font-size: 1.1rem; color: var(--color-muted); line-height: 1.8; margin: 0;
}

.landing-values {
  background: var(--color-bg);
  padding: 80px 0;
}
.landing-values-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 20px;
}
.landing-values h2 {
  text-align: center; font-size: 1.8rem; font-weight: 700;
  margin: 0 0 48px;
}
.values-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.value-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 32px 28px;
}
.value-icon {
  font-size: 2rem; margin-bottom: 16px; display: block;
}
.value-card h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 12px; }
.value-card p { font-size: 14px; color: var(--color-muted); line-height: 1.7; margin: 0; }

.landing-cta {
  background: var(--color-surface);
  padding: 80px 0;
  border-top: 1px solid var(--color-border);
  text-align: center;
}
.landing-cta h2 { font-size: 2rem; font-weight: 700; margin: 0 0 12px; }
.landing-cta p { color: var(--color-muted); font-size: 1rem; margin: 0 0 32px; }
.btn-cta {
  background: var(--color-primary); color: #fff;
  padding: 14px 40px; border-radius: var(--radius);
  font-size: 15px; font-weight: 600;
  text-decoration: none; display: inline-block;
}
.btn-cta:hover { background: var(--color-primary-hover); color: #fff; }

@media (max-width: 768px) {
  .landing-hero h1 { font-size: 2.4rem; }
  .values-grid { grid-template-columns: 1fr; }
  .landing-hero-actions { flex-direction: column; }
  .btn-hero-primary, .btn-hero-secondary { text-align: center; }
}

.site-footer {
  margin-top: 80px; padding: 32px 20px 0;
  border-top: 1px solid var(--color-border);
  max-width: 1200px; margin-left: auto; margin-right: auto;
  color: var(--color-muted); font-size: 13px;
}

/* ── Basket page ──────────────────────────────────────────── */
.basket-page { padding: 40px 0; }
.basket-page h1 { font-size: 2rem; font-weight: 700; margin-bottom: 32px; }
.basket-empty { color: var(--color-muted); font-size: 1rem; padding: 40px 0; }
.basket-empty a { color: var(--color-primary); }
.basket-item {
  display: flex; align-items: center; gap: 20px;
  padding: 20px 0; border-bottom: 1px solid var(--color-border);
}
.basket-item-image {
  width: 72px; height: 72px; border-radius: var(--radius);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; flex-shrink: 0;
}
.basket-item-info { flex: 1; min-width: 0; }
.basket-item-name { font-weight: 600; font-size: 15px; margin: 0 0 4px; }
.basket-item-cat { font-size: 12px; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
.basket-item-controls { display: flex; align-items: center; gap: 10px; }
.qty-btn {
  width: 32px; height: 32px;
  border: 1px solid var(--color-border); background: var(--color-surface);
  color: var(--color-text); border-radius: var(--radius);
  cursor: pointer; font-size: 1.1rem; line-height: 1;
  display: flex; align-items: center; justify-content: center;
}
.qty-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.qty-value { font-weight: 600; min-width: 24px; text-align: center; }
.basket-item-price { font-weight: 700; font-size: 15px; min-width: 80px; text-align: right; }
.basket-remove {
  background: none; border: none; cursor: pointer;
  color: var(--color-muted); font-size: 14px; padding: 4px 8px; line-height: 1;
}
.basket-remove:hover { color: var(--color-danger); }
.basket-summary {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 0; border-bottom: 1px solid var(--color-border);
}
.basket-total-label { font-weight: 600; font-size: 1.1rem; }
.basket-total { font-weight: 700; font-size: 1.4rem; }
.basket-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 24px;
}
.btn-basket-continue { color: var(--color-primary); font-size: 14px; }
.btn-basket-continue:hover { color: var(--color-primary-hover); }
.btn-basket-checkout {
  background: var(--color-cta); color: #fff;
  border: none; padding: 12px 32px; border-radius: var(--radius);
  font-size: 15px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
  display: inline-block; text-decoration: none;
}
.btn-basket-checkout:hover { background: var(--color-cta-hover); color: #fff; }

.login-card {
  max-width: 400px; margin: 60px auto 0;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 40px;
}
.login-card h1 { font-size: 1.5rem; margin-bottom: 24px; }
.login-error {
  background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
  border-radius: var(--radius); padding: 10px 14px; font-size: 14px; margin: 0 0 20px;
}
.sso-providers { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.btn-sso {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; height: 42px; padding: 0 16px;
  border-radius: var(--radius); font-size: 14px; font-weight: 500;
  text-decoration: none; transition: opacity 0.15s ease;
}
.btn-sso:hover { opacity: 0.85; }
.btn-sso-google { background: #fff; border: 1px solid var(--color-border); color: #3c4043; }
.btn-sso-github { background: #24292e; color: #fff; }
.sso-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 20px 0; color: var(--color-muted); font-size: 13px;
}
.sso-divider::before,.sso-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--color-border);
}
.checkout-page { padding: 40px 0; }
.checkout-page h1 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
.checkout-welcome { color: var(--color-muted); margin: 0 0 32px; }
.btn-place-order {
  background: var(--color-cta); color: #fff;
  border: none; padding: 12px 32px; border-radius: var(--radius);
  font-size: 15px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
}
.btn-place-order:hover { background: var(--color-cta-hover); }

@media (max-width: 600px) {
  .hero h1, .about-hero h1 { font-size: 1.8rem; }
  .site-header nav { display: none; }
  .info-list li { flex-direction: column; }
  .info-list span { text-align: left; }
  .basket-item { flex-wrap: wrap; }
  .basket-item-price { min-width: auto; }
  .basket-actions { flex-direction: column; gap: 16px; }
  .btn-basket-checkout { width: 100%; text-align: center; }
}
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

const productIndex = JSON.stringify(
  Object.fromEntries(products.map((p) => [p.id, { name: p.name, price: p.price, category: p.category, imageColor: p.imageColor, imageEmoji: p.imageEmoji }]))
);

const clientScript = `(function(){
  var KEY='mr_basket',CUR='${siteConfig.currency.symbol}';
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
  function save(items){localStorage.setItem(KEY,JSON.stringify(items))}
  function total(items){return items.reduce(function(s,i){return s+i.quantity},0)}
  function badge(){
    var el=document.getElementById('basket-count');
    if(!el)return;
    var n=total(get());
    el.textContent=String(n);
    el.style.display=n>0?'flex':'none';
  }
  function addItem(id){
    var items=get(),item=items.find(function(i){return i.id===id});
    if(item){item.quantity+=1}else{items.push({id:id,quantity:1})}
    save(items);badge();
  }
  function setQty(id,delta){
    var items=get(),item=items.find(function(i){return i.id===id});
    if(!item)return;
    item.quantity=Math.max(0,item.quantity+delta);
    save(items.filter(function(i){return i.quantity>0}));
    renderBasket();badge();
  }
  function removeItem(id){
    save(get().filter(function(i){return i.id!==id}));
    renderBasket();badge();
  }
  function products(){
    var el=document.getElementById('__products__');
    if(!el)return{};
    try{return JSON.parse(el.textContent)}catch(e){return{}}
  }
  function renderBasket(){
    var container=document.getElementById('basket-items');
    if(!container)return;
    var items=get(),prods=products();
    if(items.length===0){
      container.innerHTML='<p class="basket-empty">Your basket is empty. <a href="/products">Browse products</a></p>';
      return;
    }
    var tot=0,rows=items.map(function(item){
      var p=prods[item.id];
      if(!p)return'';
      var line=p.price*item.quantity;tot+=line;
      return'<div class="basket-item">'+
        '<div class="basket-item-image" style="background:'+p.imageColor+'">'+p.imageEmoji+'</div>'+
        '<div class="basket-item-info">'+
          '<p class="basket-item-name">'+p.name+'</p>'+
          '<p class="basket-item-cat">'+p.category+'</p>'+
        '</div>'+
        '<div class="basket-item-controls">'+
          '<button class="qty-btn" data-minus="'+item.id+'">&#8722;</button>'+
          '<span class="qty-value">'+item.quantity+'</span>'+
          '<button class="qty-btn" data-plus="'+item.id+'">+</button>'+
        '</div>'+
        '<span class="basket-item-price">'+CUR+line.toFixed(2)+'</span>'+
        '<button class="basket-remove" data-remove="'+item.id+'" aria-label="Remove">&#x2715;</button>'+
      '</div>';
    }).join('');
    container.innerHTML=rows+
      '<div class="basket-summary">'+
        '<span class="basket-total-label">Total</span>'+
        '<span class="basket-total">'+CUR+tot.toFixed(2)+'</span>'+
      '</div>'+
      '<div class="basket-actions">'+
        '<a href="/products" class="btn-basket-continue">&#8592; Continue shopping</a>'+
        '<a href="/checkout" class="btn-basket-checkout">Proceed to checkout</a>'+
      '</div>';
  }
  document.addEventListener('click',function(e){
    var t=e.target,closest=function(sel){return t.closest?t.closest(sel):null};
    var add=closest('[data-add-to-basket]');
    if(add){
      addItem(add.dataset.addToBasket);
      var orig=add.textContent;add.textContent='Added!';add.disabled=true;
      setTimeout(function(){add.textContent=orig;add.disabled=false},1000);
      return;
    }
    var minus=closest('[data-minus]'),plus=closest('[data-plus]'),rem=closest('[data-remove]');
    if(minus){setQty(minus.dataset.minus,-1);return}
    if(plus){setQty(plus.dataset.plus,1);return}
    if(rem){removeItem(rem.dataset.remove)}
  });
  function renderCheckoutItems(){
    var container=document.getElementById('checkout-items');
    if(!container)return;
    var items=get(),prods=products();
    if(items.length===0){
      container.innerHTML='<p class="basket-empty">Your basket is empty. <a href="/products">Browse products</a></p>';
      return;
    }
    var tot=0,rows=items.map(function(item){
      var p=prods[item.id];
      if(!p)return'';
      var line=p.price*item.quantity;tot+=line;
      return'<div class="basket-item">'+
        '<div class="basket-item-image" style="background:'+p.imageColor+'">'+p.imageEmoji+'</div>'+
        '<div class="basket-item-info">'+
          '<p class="basket-item-name">'+p.name+'</p>'+
          '<p class="basket-item-cat">'+p.category+' &times; '+item.quantity+'</p>'+
        '</div>'+
        '<span class="basket-item-price">'+CUR+line.toFixed(2)+'</span>'+
      '</div>';
    }).join('');
    container.innerHTML=rows+
      '<div class="basket-summary">'+
        '<span class="basket-total-label">Order total</span>'+
        '<span class="basket-total">'+CUR+tot.toFixed(2)+'</span>'+
      '</div>'+
      '<div class="basket-actions">'+
        '<a href="/basket" class="btn-basket-continue">&#8592; Edit basket</a>'+
        '<button class="btn-place-order">Place order</button>'+
      '</div>';
  }
  badge();renderBasket();renderCheckoutItems();
})();`;

export function renderDocument(body: React.ReactElement, title: string, fullBleed = false, user?: string): string {
  const rendered = renderToString(<Layout fullBleed={fullBleed} user={user}>{body}</Layout>);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(siteConfig.tagline)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>${css}</style>
</head>
<body>
  <div id="root">${rendered}</div>
  <script id="__products__" type="application/json">${productIndex}</script>
  <script>${clientScript}</script>
</body>
</html>`;
}
