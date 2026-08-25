import fs from 'fs';
import path from 'path';

const DIR = 'Q:\\alphine\\stepfun\\stepfun-100';

const OLD_SCRIPT = `<script>
  (function(){
    const FAVORITES_KEY='stepfun_favorites';
    const btn=document.getElementById('favBtn');
    if(!btn)return;
    function getFavs(){try{const f=localStorage.getItem(FAVORITES_KEY);return f?JSON.parse(f):[]}catch(e){return[]}}
    function updateBtn(){const favs=getFavs();if(favs.includes('$id')){btn.textContent='★ Remove from Favorites';btn.classList.add('is-favorite')}else{btn.textContent='☆ Add to Favorites';btn.classList.remove('is-favorite')}}
    updateBtn();
    window.addEventListener('storage',updateBtn);
  })();
</script>`;

let fixed = 0;
let skipped = 0;

for (let i = 1; i <= 100; i++) {
  const id = String(i).padStart(3, '0');
  const file = path.join(DIR, `design_${id}.html`);
  
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes(OLD_SCRIPT)) {
      content = content.replace(OLD_SCRIPT, '');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed: design_${id}.html`);
      fixed++;
    } else {
      console.log(`Skip:  design_${id}.html`);
      skipped++;
    }
  } catch (err) {
    console.error(`Error: design_${id}.html - ${err.message}`);
  }
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
