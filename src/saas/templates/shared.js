/**
 * shared.js — Utilities shared across all premium template builders.
 */

export const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

/** Find first matching section across all pages. */
export function findSection(site, types) {
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      if (types.includes(s.type)) return s;
    }
  }
  return null;
}

/** Collect up to `max` unique image URLs from all AI content sections. */
export function getAllImages(site, max = 8) {
  const urls = [];
  const seen = new Set();
  function push(url) {
    if (!url || seen.has(url)) return;
    seen.add(url); urls.push(url);
  }
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      for (const img of (s.data?.images || [])) push(img?.url);
      for (const item of (s.data?.featured_items || [])) {
        push(item?.image?.url || (typeof item?.image === "string" ? item.image : null));
      }
      for (const cat of (s.data?.categories || [])) {
        for (const item of (cat.items || [])) {
          push(item?.image?.url || (typeof item?.image === "string" ? item.image : null));
        }
      }
      if (urls.length >= max) break;
    }
    if (urls.length >= max) break;
  }
  return urls.slice(0, max);
}

export function getFirstImage(site) {
  return getAllImages(site, 1)[0] || null;
}

export function getHeroContent(site) {
  const s = findSection(site, ["hero", "hero_statement", "hero_story", "hero_social_proof"]);
  return {
    headline:    s?.data?.headline    || site.business_name,
    subheadline: s?.data?.subheadline || "",
  };
}

export function getTestimonials(site) {
  const t = findSection(site, ["testimonials", "testimonials_story", "testimonials_featured"]);
  const d = t?.data || {};
  let list = null;
  if (d.testimonials) list = d.testimonials.slice(0, 3);
  else if (d.cases) list = d.cases.slice(0, 3).map(c => ({ name: c.name, text: c.quote || "" }));
  if (!list?.length && site.content?.placesData?.reviews?.length) {
    list = site.content.placesData.reviews.slice(0, 3).map(r => ({ name: r.nome, text: r.texto }));
  }
  return list || [];
}

export function getLocationData(site) {
  const s = findSection(site, ["location_hours"]);
  const pd = site.content?.placesData;
  if (s?.data) return s.data;
  if (pd?.hours) return { hours: pd.hours, address: site.address || null, city: site.city };
  return null;
}

/** Build hero slides HTML. Returns empty string if no images. */
export function buildHeroSlides(site, opacity = "0.52") {
  const imgs = getAllImages(site, 8);
  if (!imgs.length) return "";
  const slides = imgs.length < 3 ? [...imgs, ...imgs, ...imgs] : imgs;
  return `<div class="hero-slides" id="hero-slides">${
    slides.slice(0, 8).map((url, i) =>
      `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url('${url}');--opacity:${opacity}"></div>`
    ).join("")
  }</div>`;
}

/** Infinite auto-scroll photo strip HTML. */
export function buildPhotoStrip(site, height = "220px") {
  const imgs = getAllImages(site, 8);
  if (imgs.length < 3) return "";
  const strip = [...imgs, ...imgs, ...imgs].slice(0, 18);
  return `<div class="photo-strip" style="height:${height}">
  <div class="strip-track">${strip.map(url =>
    `<img class="strip-img" src="${url}" alt="" loading="lazy">`
  ).join("")}</div>
</div>`;
}

/** Testimonials cards HTML. */
export function buildTestimonials(site) {
  const list = getTestimonials(site);
  if (!list.length) return "";
  return list.map(t => {
    const nome = t.name || t.nome || "Cliente";
    const text = t.text || t.texto || "";
    return `<div class="testi-card sr-up">
  <div class="testi-quote">"</div>
  <p class="testi-text">${text}</p>
  <div class="testi-author">
    <div class="testi-avatar">${nome.charAt(0).toUpperCase()}</div>
    <div><div class="testi-name">${nome}</div><div class="testi-stars">★★★★★</div></div>
  </div>
</div>`;
  }).join("");
}

/** Shared CSS: hero slides, photo strip, testimonials, scroll reveals, animations. */
export const SHARED_CSS = `
/* ── Hero slides + Ken Burns ── */
.hero-slides{position:absolute;inset:0;z-index:0}
.hero-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.8s ease;will-change:transform,opacity}
.hero-slide.active{opacity:var(--opacity,.5);animation:kb 14s ease-in-out infinite}
@keyframes kb{0%{transform:scale(1) translate(0,0)}40%{transform:scale(1.07) translate(-.6%,.4%)}70%{transform:scale(1.04) translate(.5%,-.3%)}100%{transform:scale(1) translate(0,0)}}

/* ── Photo strip ── */
.photo-strip{overflow:hidden;position:relative;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.photo-strip::before,.photo-strip::after{content:"";position:absolute;top:0;bottom:0;width:100px;z-index:2;pointer-events:none}
.photo-strip::before{left:0;background:linear-gradient(to right,var(--surface),transparent)}
.photo-strip::after{right:0;background:linear-gradient(to left,var(--surface),transparent)}
.strip-track{display:flex;gap:10px;width:max-content;animation:strip 40s linear infinite;padding:10px 5px;height:100%}
.strip-track:hover{animation-play-state:paused}
.strip-img{height:calc(100% - 20px);width:auto;aspect-ratio:4/3;object-fit:cover;border-radius:12px;flex-shrink:0;transition:transform .4s,filter .4s;filter:brightness(.85) saturate(1.1)}
.strip-img:hover{transform:scale(1.04);filter:brightness(1) saturate(1.3)}
@keyframes strip{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ── Testimonials ── */
.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.testi-card{background:var(--surface2);border:1px solid var(--bdr);border-radius:20px;padding:32px 28px;position:relative;overflow:hidden}
.testi-quote{position:absolute;top:6px;left:16px;font-size:80px;line-height:1;font-family:Georgia,serif;color:var(--bdr);pointer-events:none}
.testi-text{font-size:15px;line-height:1.8;padding-top:40px;margin-bottom:20px}
.testi-author{display:flex;align-items:center;gap:12px}
.testi-avatar{width:44px;height:44px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex-shrink:0}
.testi-name{font-size:14px;font-weight:800}
.testi-stars{font-size:13px;color:#F59E0B;margin-top:2px}

/* ── Scroll reveal ── */
.sr-up{opacity:0;transform:translateY(32px)}
.sr-fade{opacity:0}

/* ── Shared GSAP init ── */
@media(prefers-reduced-motion:reduce){.hero-slide.active{animation:none}.strip-track{animation:none}}
`;

/** Shared GSAP + hero carousel JS — paste inside <script> in each template. */
export const SHARED_JS = `
// Nav scroll shadow
(function(){var n=document.querySelector(".site-nav");if(!n)return;window.addEventListener("scroll",function(){n.classList.toggle("scrolled",window.scrollY>30)},{passive:true});})();

// Hero carousel
(function(){var s=document.querySelectorAll(".hero-slide");if(s.length<=1)return;var c=0;setInterval(function(){s[c].classList.remove("active");c=(c+1)%s.length;s[c].classList.add("active");},5500);})();

// GSAP
window.addEventListener("load",function(){
  if(typeof gsap==="undefined")return;
  if(typeof ScrollTrigger!=="undefined")gsap.registerPlugin(ScrollTrigger);
  if(typeof Lenis!=="undefined"){
    var l=new Lenis({lerp:.1,smoothWheel:true});
    function raf(t){l.raf(t);requestAnimationFrame(raf);}
    requestAnimationFrame(raf);
    if(typeof ScrollTrigger!=="undefined")l.on("scroll",ScrollTrigger.update);
  }
  // Hero parallax
  var hb=document.querySelector(".hero-slides")||document.querySelector(".hero-img-bg");
  var hs=document.querySelector(".site-hero");
  if(hb&&hs&&typeof ScrollTrigger!=="undefined"){
    gsap.to(hb,{yPercent:28,ease:"none",scrollTrigger:{trigger:hs,start:"top top",end:"bottom top",scrub:true}});
  }
  // Word split headline
  document.querySelectorAll("[data-split]").forEach(function(el){
    var words=el.textContent.trim().split(/\\s+/);
    el.innerHTML=words.map(function(w){return'<span style="display:inline-block;overflow:hidden;vertical-align:top"><span class="sw" style="display:inline-block">'+w+'</span></span>';}).join(" ");
    gsap.from(el.querySelectorAll(".sw"),{y:"105%",duration:.9,stagger:.07,ease:"power4.out",delay:.2});
  });
  // Fade-in hero elements
  gsap.from(".hero-badge",{opacity:0,y:20,duration:.6,delay:.1,ease:"power2.out"});
  gsap.from(".hero-sub",{opacity:0,y:18,duration:.6,delay:.8,ease:"power2.out"});
  gsap.from(".hero-btns",{opacity:0,y:18,duration:.6,delay:1.0,ease:"power2.out"});
  gsap.from(".hero-meta",{opacity:0,y:14,duration:.5,delay:1.2,ease:"power2.out"});
  gsap.from(".hero-visual",{opacity:0,scale:.84,duration:1.0,delay:.35,ease:"power3.out"});
  // Scroll reveals
  gsap.utils.toArray(".sr-up").forEach(function(el){
    gsap.from(el,{opacity:0,y:38,duration:.75,ease:"power2.out",
      scrollTrigger:{trigger:el,start:"top 88%",toggleActions:"play none none none"}});
  });
  gsap.utils.toArray(".sr-fade").forEach(function(el){
    gsap.from(el,{opacity:0,duration:.8,ease:"power2.out",
      scrollTrigger:{trigger:el,start:"top 88%",toggleActions:"play none none none"}});
  });
  // Stagger cards
  gsap.utils.toArray(".card-anim").forEach(function(el,i){
    gsap.from(el,{opacity:0,y:36,scale:.95,duration:.6,delay:(i%4)*.08,ease:"power2.out",
      scrollTrigger:{trigger:el,start:"top 93%",toggleActions:"play none none none"}});
  });
  gsap.utils.toArray(".slide-anim").forEach(function(el,i){
    gsap.from(el,{opacity:0,x:i%2===0?-28:28,duration:.55,delay:(i%6)*.05,ease:"power2.out",
      scrollTrigger:{trigger:el,start:"top 94%",toggleActions:"play none none none"}});
  });
});
`;

/** Full cart system for product-based templates (returns JS string). */
export function cartJS({ siteId, apiBase, waHref, currency = "BRL" }) {
  return `
var SITE_ID="${siteId}",WA_HREF="${waHref}",API_BASE="${apiBase}";
var FCart=(function(){
  var items=[],deliveryType="retirada",deliveryFee=0,cepData=null;
  function fmt(c){"use strict";return"R$ "+(c/100).toFixed(2).replace(".",",");}
  function sub(){return items.reduce(function(s,i){return s+Math.round(parseFloat(i.price||0)*100)*i.qty;},0);}
  function total(){return sub()+(deliveryType==="delivery"?deliveryFee:0);}
  function render(){
    var el=document.getElementById("cart-items");
    if(!el)return;
    if(!items.length){
      el.innerHTML='<div class="cart-empty"><span>🛒</span>Carrinho vazio.<br>Adicione produtos!</div>';
    }else{
      el.innerHTML=items.map(function(item,idx){
        return'<div class="cart-item-row">'
          +(item.img?'<img class="cart-item-img" src="'+item.img+'" alt="'+item.name+'">'
            :'<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--surface2)">'+( item.emoji||"📦")+'</div>')
          +'<div class="cart-item-info">'
          +'<div class="cart-item-name">'+item.name+(item.variant?' <span style="font-size:11px;opacity:.7">('+item.variant+')</span>':'')+'</div>'
          +'<div class="cart-item-price">'+fmt(Math.round(parseFloat(item.price||0)*100)*item.qty)+'</div>'
          +'</div>'
          +'<div class="cart-qty">'
          +'<button class="qty-btn" onclick="FCart.dec('+idx+')">−</button>'
          +'<span class="qty-val">'+item.qty+'</span>'
          +'<button class="qty-btn" onclick="FCart.inc('+idx+')">+</button>'
          +'</div></div>';
      }).join("");
    }
    var feeRow=document.getElementById("fee-row");
    if(feeRow){
      if(deliveryType==="delivery"&&deliveryFee>0){feeRow.style.display="flex";var fv=document.getElementById("fee-val");if(fv)fv.textContent=fmt(deliveryFee);}
      else feeRow.style.display="none";
    }
    var tv=document.getElementById("cart-total");if(tv)tv.textContent=fmt(total());
    var hasItems=items.length>0;
    var pb=document.getElementById("cart-pay-btn");if(pb)pb.disabled=!hasItems;
    var wb=document.getElementById("cart-wa-btn");if(wb)wb.disabled=!hasItems;
    var count=items.reduce(function(s,i){return s+i.qty;},0);
    ["nav-cart-count","float-cart-count"].forEach(function(id){
      var e=document.getElementById(id);if(e){e.textContent=count;e.classList.toggle("show",count>0);}
    });
    var fb=document.getElementById("cart-float");if(fb)fb.classList.toggle("show",hasItems);
    try{localStorage.setItem("fcart_"+SITE_ID,JSON.stringify(items));}catch(e){}
  }
  function open(){var o=document.getElementById("cart-overlay"),d=document.getElementById("cart-drawer");if(o)o.classList.add("open");if(d)d.classList.add("open");document.body.style.overflow="hidden";}
  function close(){var o=document.getElementById("cart-overlay"),d=document.getElementById("cart-drawer");if(o)o.classList.remove("open");if(d)d.classList.remove("open");document.body.style.overflow="";}
  function add(name,price,img,variant){
    var key=name+(variant||"");
    var ex=items.find(function(i){return i.name===name&&(i.variant||"")===(variant||"");});
    if(ex){ex.qty+=1;}else{items.push({name:name,price:price,img:img||null,emoji:"📦",variant:variant||null,qty:1});}
    render();showBanner(name+" adicionado!","success");
  }
  function inc(idx){if(items[idx]){items[idx].qty+=1;render();}}
  function dec(idx){if(!items[idx])return;items[idx].qty-=1;if(items[idx].qty<=0)items.splice(idx,1);render();}
  function setType(type,btn){
    deliveryType=type;deliveryFee=0;
    document.querySelectorAll(".dtype-btn").forEach(function(b){b.classList.remove("active");});
    if(btn)btn.classList.add("active");
    var cs=document.getElementById("cep-section");if(cs)cs.style.display=type==="delivery"?"block":"none";
    var ca=document.getElementById("cep-addr");if(ca)ca.textContent="";
    var fr=document.getElementById("fee-row");if(fr)fr.style.display="none";
    render();
  }
  function maskCep(input){var v=input.value.replace(/\\D/g,"").slice(0,8);if(v.length>5)v=v.slice(0,5)+"-"+v.slice(5);input.value=v;}
  async function lookupCep(){
    var cepInput=document.getElementById("cep-input");
    var cep=cepInput?cepInput.value.replace(/\\D/g,""):"";
    if(cep.length!==8)return;
    var btn=document.getElementById("cep-btn");if(btn){btn.disabled=true;btn.textContent="...";}
    try{
      var r=await fetch("https://viacep.com.br/ws/"+cep+"/json/");
      var data=await r.json();
      var ca=document.getElementById("cep-addr");
      if(data.erro){if(ca)ca.textContent="CEP não encontrado";}
      else{
        cepData=data;
        if(ca)ca.textContent=data.logradouro+", "+data.bairro+" — "+data.localidade+"/"+data.uf;
        try{
          var fr=await fetch(API_BASE+"/checkout/delivery-fee?buyerCep="+cep+"&siteId="+SITE_ID);
          if(fr.ok){var fd=await fr.json();deliveryFee=fd.feeCents||800;}else{deliveryFee=800;}
        }catch(e){deliveryFee=800;}
        render();
      }
    }catch(e){var ca2=document.getElementById("cep-addr");if(ca2)ca2.textContent="Erro ao buscar CEP.";}
    if(btn){btn.disabled=false;btn.textContent="Buscar";}
  }
  function buildMsg(){
    var lines=["🛒 *Novo Pedido — "+document.title+"*",""];
    items.forEach(function(i){lines.push("• "+i.qty+"x "+i.name+(i.variant?" ("+i.variant+")":"")+" — R$ "+(parseFloat(i.price)*i.qty).toFixed(2).replace(".",","));});
    lines.push("","*Subtotal:* R$ "+(sub()/100).toFixed(2).replace(".",","));
    if(deliveryType==="delivery"){
      lines.push("*Entrega:* "+(deliveryFee>0?fmt(deliveryFee):"a calcular"));
      if(cepData)lines.push("*CEP:* "+document.getElementById("cep-input").value+" — "+cepData.logradouro+", "+cepData.bairro+" — "+cepData.localidade+"/"+cepData.uf);
    }else{lines.push("*Retirada no local*");}
    lines.push("*Total:* R$ "+(total()/100).toFixed(2).replace(".",","));
    return encodeURIComponent(lines.join("\\n"));
  }
  function sendWA(){if(!items.length)return;window.open(WA_HREF.split("?")[0]+"?text="+buildMsg(),"_blank","noopener");}
  async function payStripe(){
    if(!items.length)return;
    var btn=document.getElementById("cart-pay-btn");if(btn){btn.disabled=true;btn.textContent="Aguarde...";}
    try{
      var body={siteId:SITE_ID,items:items.map(function(i){return{name:i.name+(i.variant?" ("+i.variant+")":""),price:i.price,qty:i.qty};}),deliveryType:deliveryType,
        buyerCep:deliveryType==="delivery"?document.getElementById("cep-input").value.replace(/\\D/g,""):null,
        successUrl:window.location.href.split("?")[0]+"?order=success",cancelUrl:window.location.href.split("?")[0]+"?order=cancel"};
      var res=await fetch(API_BASE+"/checkout/create-menu-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok){var err=await res.json();throw new Error(err.message||"Erro");}
      var d=await res.json();window.location.href=d.url;
    }catch(e){
      showBanner("Pagamento indisponível. Use o WhatsApp!","error");
      if(btn){btn.textContent="💳 Pagar no Site";btn.disabled=false;}
    }
  }
  function showBanner(msg,type){
    var el=document.getElementById("order-banner");if(!el)return;
    el.textContent=msg;el.className="order-banner "+type;
    setTimeout(function(){el.className="order-banner";},3500);
  }
  try{var sv=localStorage.getItem("fcart_"+SITE_ID);if(sv){items=JSON.parse(sv);render();}}catch(e){}
  var up=new URLSearchParams(window.location.search);
  if(up.get("order")==="success"){showBanner("✅ Pedido confirmado! Em breve você receberá a confirmação.","success");try{localStorage.removeItem("fcart_"+SITE_ID);}catch(e){}items=[];render();}
  else if(up.get("order")==="cancel"){showBanner("Pagamento cancelado. Tente novamente ou use o WhatsApp.","error");}
  return{open,close,add,inc,dec,setType,maskCep,lookupCep,sendWA,payStripe};
})();
`;
}

/** Cart drawer HTML — shared across templates. */
export function cartDrawerHTML({ waHref, waLabel = "Pedir pelo WhatsApp" }) {
  return `
<div class="cart-overlay" id="cart-overlay" onclick="FCart.close()"></div>
<div class="cart-drawer" id="cart-drawer">
  <div class="cart-hdr">
    <h3>🛒 Meu Carrinho</h3>
    <button class="cart-close" onclick="FCart.close()">✕</button>
  </div>
  <div class="cart-items" id="cart-items">
    <div class="cart-empty"><span>🛒</span>Carrinho vazio.<br>Adicione produtos!</div>
  </div>
  <div class="cart-delivery" id="cart-delivery">
    <div class="cart-delivery-label">Tipo de Entrega</div>
    <div class="delivery-toggle">
      <button class="dtype-btn active" onclick="FCart.setType('retirada',this)">🏪 Retirar</button>
      <button class="dtype-btn" onclick="FCart.setType('delivery',this)">🛵 Delivery</button>
    </div>
    <div id="cep-section" style="display:none">
      <div class="cep-wrap">
        <input class="cep-input" id="cep-input" type="text" placeholder="CEP 00000-000" maxlength="9" oninput="FCart.maskCep(this)">
        <button class="cep-btn" id="cep-btn" onclick="FCart.lookupCep()">Buscar</button>
      </div>
      <div class="cep-addr" id="cep-addr"></div>
      <div class="fee-row" id="fee-row" style="display:none">
        <span>Taxa de entrega</span><span id="fee-val">R$ 0,00</span>
      </div>
    </div>
  </div>
  <div class="cart-footer">
    <div class="cart-total-row">
      <span class="cart-total-label">Total</span>
      <span class="cart-total-val" id="cart-total">R$ 0,00</span>
    </div>
    <div class="cart-action-btns">
      <button class="cart-stripe-btn" id="cart-pay-btn" onclick="FCart.payStripe()" disabled>💳 Pagar no Site</button>
      <button class="cart-wa-btn" id="cart-wa-btn" onclick="FCart.sendWA()" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        ${waLabel}
      </button>
    </div>
  </div>
</div>`;
}

/** Shared cart CSS — paste inside <style> in each template. */
export const CART_CSS = `
.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:598;opacity:0;pointer-events:none;transition:opacity .3s;backdrop-filter:blur(4px)}
.cart-overlay.open{opacity:1;pointer-events:auto}
.cart-drawer{position:fixed;top:0;right:-480px;width:min(480px,100vw);height:100dvh;background:var(--surface);z-index:599;box-shadow:-8px 0 60px rgba(0,0,0,.5);transition:right .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;border-left:1px solid var(--bdr)}
.cart-drawer.open{right:0}
.cart-hdr{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--bdr);flex-shrink:0}
.cart-hdr h3{font-size:20px;font-weight:900;letter-spacing:.02em}
.cart-close{background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);padding:4px;transition:color .15s}
.cart-close:hover{color:var(--txt)}
.cart-items{flex:1;overflow-y:auto;padding:16px 24px}
.cart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--muted);gap:12px;font-size:14px;font-weight:600;text-align:center}
.cart-empty span{font-size:44px}
.cart-item-row{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--bdr)}
.cart-item-img{width:54px;height:54px;border-radius:10px;object-fit:cover;flex-shrink:0;background:var(--surface2)}
.cart-item-info{flex:1;min-width:0}
.cart-item-name{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
.cart-item-price{font-size:12px;color:var(--muted)}
.cart-qty{display:flex;align-items:center;gap:8px;flex-shrink:0}
.qty-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bdr);background:var(--surface2);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--txt);transition:background .15s,border-color .15s}
.qty-btn:hover{background:var(--p);border-color:var(--p);color:#fff}
.qty-val{font-size:14px;font-weight:800;min-width:20px;text-align:center}
.cart-delivery{padding:14px 24px;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);flex-shrink:0}
.cart-delivery-label{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.delivery-toggle{display:flex;gap:6px;margin-bottom:12px}
.dtype-btn{flex:1;padding:9px;border-radius:10px;border:2px solid var(--bdr);background:var(--surface2);font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;color:var(--muted)}
.dtype-btn.active{background:var(--p);color:#fff;border-color:var(--p)}
.cep-wrap{display:flex;gap:8px;margin-bottom:8px}
.cep-input{flex:1;padding:10px 14px;border:1.5px solid var(--bdr);border-radius:10px;font-size:14px;background:var(--surface2);color:var(--txt);outline:none;transition:border-color .15s}
.cep-input:focus{border-color:var(--p)}
.cep-btn{padding:10px 16px;border-radius:10px;background:var(--p);color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.cep-btn:disabled{opacity:.5;cursor:default}
.cep-addr{font-size:12px;color:var(--muted);min-height:16px;margin-bottom:4px;line-height:1.5}
.fee-row{display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:6px 0}
.cart-footer{padding:18px 24px;border-top:1px solid var(--bdr);flex-shrink:0}
.cart-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.cart-total-label{font-size:13px;font-weight:600;color:var(--muted)}
.cart-total-val{font-size:28px;font-weight:900}
.cart-action-btns{display:flex;flex-direction:column;gap:8px}
.cart-stripe-btn{width:100%;padding:15px;background:var(--p);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;transition:background .15s,transform .15s;display:flex;align-items:center;justify-content:center;gap:8px}
.cart-stripe-btn:hover{background:var(--ph,var(--p));transform:scale(1.01)}
.cart-stripe-btn:disabled{opacity:.4;cursor:default;transform:none}
.cart-wa-btn{width:100%;padding:13px;background:#25D366;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:8px}
.cart-wa-btn:hover{background:#128C7E}
.cart-wa-btn:disabled{opacity:.4;cursor:default}
.cart-float{position:fixed;bottom:28px;left:28px;z-index:500;width:64px;height:64px;border-radius:50%;background:var(--p);color:#fff;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(0,0,0,.4);transition:transform .2s}
.cart-float.show{display:flex}
.cart-float:hover{transform:scale(1.1)}
.float-cart-count{position:absolute;top:-4px;right:-4px;width:22px;height:22px;background:var(--acc,#F59E0B);color:#000;border-radius:50%;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center}
.order-banner{display:none;position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:700;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.35);backdrop-filter:blur(10px);white-space:nowrap}
.order-banner.success{background:#059669;display:block}
.order-banner.error{background:#DC2626;display:block}
`;
