/*  LandFinder
   - Replace YOUR_GOOGLE_MAPS_API_KEY with your key
   - Features: search, filter, add location (geocode), markers, popup with owner contact, favorites
*/

// sample builtin plots
const builtinPlots = [
  { id:'b1', title:'Flat land near river', area:'Perundurai, Erode', lat:11.399, lng:77.676, sqft:2400, price:4800000, owner:'Mr. Kumar', phone:'+919840012345', desc:'Good soil, clear title' },
  { id:'b2', title:'Corner plot', area:'Erode centre', lat:11.341, lng:77.719, sqft:1800, price:3600000, owner:'Mrs. Meena', phone:'+919952298765', desc:'Corner plot, near main road' },
  { id:'b3', title:'Farm land', area:'Kodumudi', lat:11.281, lng:77.807, sqft:5000, price:7500000, owner:'Mr. Raju', phone:'+919894376543', desc:'Irrigable, good access' }
];

let map, geocoder;
let plots = [], markers = [];
const LS_PLOTS = 'lf_saved_plots', LS_FAVS = 'lf_favs';

// helpers
const $ = id => document.getElementById(id);
const formatINR = n => '₹' + Number(n).toLocaleString();
const uid = () => 'u' + Date.now().toString(36).slice(-6);

// load saved
function loadSaved(){ try { return JSON.parse(localStorage.getItem(LS_PLOTS) || '[]'); } catch(e){ return []; } }
function saveSaved(arr){ localStorage.setItem(LS_PLOTS, JSON.stringify(arr)); }

// init map
function initMap(){
  map = new google.maps.Map($('map'), { center:{lat:11.34,lng:77.73}, zoom:11, disableDefaultUI:false });
  geocoder = new google.maps.Geocoder();

  plots = [...builtinPlots, ...loadSaved()];
  renderAll();
  attachUI();
}

// render markers + list
function clearMarkers(){ markers.forEach(m=>m.marker.setMap(null)); markers=[]; }
function addMarker(p){
  const marker = new google.maps.Marker({ position:{lat:p.lat,lng:p.lng}, map, title:p.title });
  marker.addListener('click', ()=> { map.panTo(marker.getPosition()); map.setZoom(15); openModal(p); });
  markers.push({id:p.id, marker});
}
function renderAll(){ clearMarkers(); plots.forEach(addMarker); renderList(plots); }

function renderList(list){
  const container = $('results'); container.innerHTML = '';
  if(list.length===0){ container.innerHTML = '<div class="muted">No listings</div>'; return; }
  list.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<div class="card-left">
      <div class="title">${p.title}</div>
      <div class="meta">${p.area}</div>
      <div class="meta price">${formatINR(p.price)} • ${p.sqft} sqft</div>
    </div>
    <div class="card-right">
      <button class="btn small outline" data-id="${p.id}">View</button>
    </div>`;
    card.querySelector('button').addEventListener('click', ()=> { map.panTo({lat:p.lat,lng:p.lng}); map.setZoom(15); openModal(p); });
    container.appendChild(card);
  });
}

// modal
function openModal(p){
  $('modalBackdrop').classList.remove('hidden');
  $('modalTitle').innerText = 'Sale is here!';
  $('modalSubtitle').innerText = `${p.title} — ${p.area}`;
  $('modalBody').innerHTML = `
    <p class="muted">${p.desc || ''}</p>
    <p><strong>Price:</strong> ${formatINR(p.price)}</p>
    <p><strong>Area:</strong> ${p.sqft} sqft</p>
    <hr/>
    <h4>Owner</h4>
    <p><strong>${p.owner}</strong></p>
    <p><a href="tel:${p.phone}" id="ownerPhone">${p.phone}</a></p>
  `;
  // contact
  $('contactOwner').onclick = ()=> window.open(`tel:${p.phone}`);
  // save fav
  const favs = new Set(JSON.parse(localStorage.getItem(LS_FAVS) || '[]'));
  const saveBtn = $('saveFav'); saveBtn.innerText = favs.has(p.id)? 'Saved':'Save';
  saveBtn.onclick = ()=>{
    if(favs.has(p.id)) favs.delete(p.id); else favs.add(p.id);
    localStorage.setItem(LS_FAVS, JSON.stringify(Array.from(favs)));
    saveBtn.innerText = favs.has(p.id)? 'Saved':'Save';
  };
}
$('closeModal').addEventListener('click', ()=> $('modalBackdrop').classList.add('hidden'));
$('modalBackdrop').addEventListener('click', (e)=>{ if(e.target.id==='modalBackdrop') $('modalBackdrop').classList.add('hidden'); });

// UI attach
function attachUI(){
  // add drawer toggle
  $('addToggle').addEventListener('click', ()=> $('addDrawer').classList.toggle('hidden'));
  $('cancelAdd').addEventListener('click', ()=> $('addDrawer').classList.add('hidden'));

  // search
  $('btnSearch').addEventListener('click', applyFilters);
  $('btnReset').addEventListener('click', ()=>{
    $('qPlace').value=''; $('minPrice').value=''; $('maxPrice').value=''; $('minSqft').value=''; $('maxSqft').value=''; $('sortBy').value='relevance';
    renderList(plots); renderAll();
  });

  // add form
  $('addForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const title = $('fTitle').value.trim(), address = $('fAddress').value.trim();
    const price = Number($('fPrice').value), sqft = Number($('fSqft').value);
    const owner = $('fOwner').value.trim(), phone = $('fPhone').value.trim(), desc = $('fDesc').value.trim();
    if(!title||!address||!price||!sqft||!owner||!phone){ alert('Please fill all fields'); return; }

    geocoder.geocode({ address }, (results, status) => {
      if(status === 'OK' && results[0]){
        const loc = results[0].geometry.location;
        const p = { id: uid(), title, area: address, lat: loc.lat(), lng: loc.lng(), price, sqft, owner, phone, desc: desc || 'Added via app' };
        // persist
        const saved = loadSaved(); saved.push(p); saveSaved(saved);
        plots.push(p); addMarker(p); renderList(plots);
        $('addForm').reset(); $('addDrawer').classList.add('hidden');
        map.panTo({lat:p.lat,lng:p.lng}); map.setZoom(15); openModal(p);
      } else {
        alert('Address not found. Try more specific address.');
      }
    });
  });
}

// filters
function applyFilters(){
  const q = ($('qPlace').value || '').trim().toLowerCase();
  const minP = Number($('minPrice').value || 0), maxP = Number($('maxPrice').value || Infinity);
  const minS = Number($('minSqft').value || 0), maxS = Number($('maxSqft').value || Infinity);
  const sortBy = $('sortBy').value;

  let filtered = plots.filter(p=>{
    const matchQ = q === '' ? true : (p.area.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
    return matchQ && p.price >= minP && p.price <= maxP && p.sqft >= minS && p.sqft <= maxS;
  });

  if(sortBy==='price_asc') filtered.sort((a,b)=>a.price-b.price);
  if(sortBy==='price_desc') filtered.sort((a,b)=>b.price-a.price);
  if(sortBy==='psf_asc') filtered.sort((a,b)=>(a.price/a.sqft)-(b.price/b.sqft));
  if(sortBy==='psf_desc') filtered.sort((a,b)=>(b.price/b.sqft)-(a.price/a.sqft));

  clearMarkers(); filtered.forEach(addMarker);
  renderList(filtered);
  if(filtered[0]) { map.panTo({lat:filtered[0].lat,lng:filtered[0].lng}); map.setZoom(13); }
}

// clear saved (helper — dev)
window.clearSaved = function(){
  if(!confirm('Clear saved listings?')) return;
  localStorage.removeItem(LS_PLOTS);
  plots = [...builtinPlots]; renderAll();
};

// load maps
function loadMaps(){
  const s = document.createElement('script');
  s.src =`https://maps.googleapis.com/maps/api/js?key=AIzaSyAsd68ZcWQH6aScZz6sbIRAkZJF87Sxw10&callback=initMap`;
  s.defer = true; document.head.appendChild(s);
}
loadMaps();