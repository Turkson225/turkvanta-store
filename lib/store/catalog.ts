export type Category = { slug: string; name: string; short: string; image: string; description: string };
export type Product = { id: string; slug: string; name: string; category: string; price: number; image: string; badge?: string; description: string; colors: string[]; stock: number; featured?: boolean; published: boolean; specs: Record<string,string> };
export const brand = { name: 'Jedi’s Store', tagline: 'Everyday, elevated.', phone: '055 459 8191', tel: '+233554598191', whatsapp: 'https://wa.me/233554598191', email: 'turkinnovation@gmail.com' };
export const categories: Category[] = [
 {slug:'tech-audio', name:'Tech & Audio',short:'Plug into possibility.',image:'headphones',description:'Good sound. Clever connections. A better daily rhythm.'},
 {slug:'home-living',name:'Home & Living',short:'Make yourself at home.',image:'chair',description:'Thoughtful pieces for the spaces you call your own.'},
 {slug:'style-carry',name:'Style & Carry',short:'Go your own way.',image:'backpack',description:'Everyday companions, wherever the day takes you.'},
 {slug:'everyday-essentials',name:'Everyday Essentials',short:'Little things. Better days.',image:'bottle',description:'Useful, simple things with a place in your routine.'}
];
const entries: [string,string,string,number,string,string,string[],number,boolean?,string?][] = [
 ['quietform-headphones','Quietform Wireless Headphones','tech-audio',64900,'headphones','Your daily soundtrack, without the distractions. A comfortable over-ear design for focused mornings and unhurried evenings.',['Cloud'],24,true,'THE DAILY EDIT'],
 ['pocket-beat-speaker','Pocket Beat Desktop Speaker','tech-audio',28900,'speaker','A compact companion for your favourite playlists, from your desk to the weekend.',['Black','Olive'],18,true,'NEW ARRIVAL'],
 ['orbit-smartwatch','Orbit Blue-Band Watch','tech-audio',45900,'watch','A clean, considered watch to keep your daily essentials close at hand.',['Blue'],15,true],
 ['airnote-earbuds','Airnote Wireless Earbuds','tech-audio',32900,'earbuds','Less in your pocket. More in your day. Lightweight earbuds with a handy carry case.',['Black'],30,true],
 ['desk-connect-hub','Desk Connect Speaker','tech-audio',21900,'speaker','A compact audio accessory to bring a little music to your everyday workspace.',['Charcoal'],12],
 ['studio-headphones','Studio Over-Ear Headphones','tech-audio',79900,'headphones','Over-ear listening with a soft-touch finish and an understated silhouette.',['Graphite'],8],
 ['arc-table-lamp','Arc Table Lamp','home-living',34900,'lamp','A little light in just the right place. A sculptural accent for a bedside table or thoughtful workspace.',['Chrome'],16,true,'EDITOR’S PICK'],
 ['form-lounge-chair','Form Rattan Accent Chair','home-living',149900,'chair','Make room to unwind. A quietly expressive chair for reading, relaxing, and the in-between.',['Natural'],6,true],
 ['slow-morning-kettle','Slow Morning Kettle','home-living',38900,'kettle','For the first cup and the slower mornings. An everyday kitchen essential with a simple finish.',['White'],20],
 ['ceramic-table-vase','Ceramic Table Vase','home-living',15900,'vase','A considered finishing touch, with or without a favourite stem.',['Ivory','Clay'],22],
 ['reading-lamp','Reading Desk Lamp','home-living',27900,'lamp','A purposeful light for a good book, a new idea, or a little evening focus.',['Black'],10],
 ['everyday-accent-chair','Everyday Accent Chair','home-living',119900,'chair','An inviting seat with a pared-back profile for your favourite corner.',['Natural'],5],
 ['roam-daypack','Roam Everyday Backpack','style-carry',37900,'backpack','A place for what matters. A practical daypack for the commute, the campus, and everything after.',['Grey'],21,true,'NEW ARRIVAL'],
 ['canvas-weekender','Everyday Canvas Carryall','style-carry',42900,'bag','Pack a little possibility. A roomy carry companion for a change of scene.',['Natural / Navy'],14],
 ['streetform-sneakers','Streetform Sneakers','style-carry',54900,'sneakers','An easygoing pair for everyday plans, with a clean and versatile profile.',['EU 40','EU 41','EU 42','EU 43','EU 44'],25,true],
 ['daylight-sunglasses','Daylight Sunglasses','style-carry',18900,'sunglasses','An understated frame to finish your everyday look.',['Black','Tortoise'],28],
 ['daily-canvas-tote','Daily Canvas Tote','style-carry',14900,'bag','The easy carry-all you can reach for on the way out.',['Natural'],32],
 ['commuter-backpack','Commuter Backpack','style-carry',44900,'backpack','Keep the working day organised with a versatile, minimal carry.',['Black'],13],
 ['sip-thermal-bottle','Sip Everyday Bottle','everyday-essentials',17900,'bottle','A fresh start, a longer walk, a little pause. Bring your favourite drink along.',['Turquoise'],35,true],
 ['morning-travel-cup','Morning Travel Cup','everyday-essentials',14900,'bottle','For the coffee you take with you and the moments you make time for.',['Black','Green'],26],
 ['daily-notebook','Daily Notes Journal','everyday-essentials',8900,'notebook','A blank page for small plans, big ideas, and everything worth remembering.',['Black','Natural'],40],
 ['focus-desk-set','Focus Desk Set','everyday-essentials',22900,'notebook','A few thoughtful essentials to give your ideas a little more space.',['Natural'],19],
 ['weekend-water-bottle','Weekend Water Bottle','everyday-essentials',12900,'bottle','A simple companion for staying refreshed as you go.',['Green','White'],30],
 ['minimal-notebook-set','Minimal Notebook Set','everyday-essentials',13900,'notebook','Make a little room for your next chapter with this everyday stationery set.',['Natural'],20]
];
export const products: Product[] = entries.map((e,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,slug:e[0],name:e[1],category:e[2],price:e[3],image:`/images/${e[4]}.webp`,description:e[5],colors:e[6],stock:e[7],featured:e[8]??false,badge:e[9],published:true,specs:{Collection:categories.find(c=>c.slug===e[2])!.name,Finish:e[6].join(' / '),'Catalog note':'Sample product. Final specifications will be confirmed before launch.'}}));
export function money(minor:number) { return new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',currencyDisplay:'narrowSymbol',minimumFractionDigits:2}).format(minor/100); }
export function productImage(key:string){return `/images/${key}.webp`;}
