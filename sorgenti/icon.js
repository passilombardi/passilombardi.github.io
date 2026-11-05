const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.setContent('<canvas id=c></canvas>');
for(const [n,S,mask] of [['icona-512.png',512,0],['icona-192.png',192,0],['icona-180.png',180,0],['icona-512-m.png',512,1]]){
const data=await p.evaluate(([S,mask])=>{const c=document.getElementById('c');c.width=c.height=S;const g=c.getContext('2d');const k=S/512;g.scale(k,k);
 const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#14b8a6');gr.addColorStop(1,'#0f5f57');
 if(mask){g.fillStyle=gr;g.fillRect(0,0,512,512)}else{g.fillStyle=gr;g.beginPath();g.roundRect(0,0,512,512,110);g.fill()}
 const s=mask?0.8:1;g.translate(256,256);g.scale(s,s);g.translate(-256,-256);
 // colline
 g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(0,340);g.quadraticCurveTo(140,250,270,320);g.quadraticCurveTo(390,380,512,300);g.lineTo(512,512);g.lineTo(0,512);g.fill();
 // sentiero
 g.strokeStyle='#fde68a';g.lineWidth=26;g.lineCap='round';g.setLineDash([2,46]);g.beginPath();g.moveTo(110,430);g.bezierCurveTo(200,380,170,290,270,250);g.bezierCurveTo(340,222,360,170,400,130);g.stroke();g.setLineDash([]);
 // segnaposto
 g.fillStyle='#fb923c';g.beginPath();g.arc(400,118,44,Math.PI,0);g.lineTo(400,205);g.closePath();g.fill();g.fillStyle='#fff';g.beginPath();g.arc(400,118,18,0,7);g.fill();
 // onde audio
 g.strokeStyle='#fff';g.lineWidth=14;[40,70].forEach(r=>{g.beginPath();g.arc(150,190,r,-0.7,0.7);g.stroke()});g.fillStyle='#fff';g.beginPath();g.arc(150,190,16,0,7);g.fill();
 g.font='800 64px system-ui';g.textAlign='center';g.fillStyle='#fff';g.fillText('PASSI',256,490-(mask?20:0));
 return c.toDataURL('image/png')},[S,mask]);require('fs').writeFileSync(n,Buffer.from(data.split(',')[1],'base64'))}
await b.close()})();
