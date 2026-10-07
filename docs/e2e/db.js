const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient();
(async()=>{
 const r = await p.letterOfIntent.findMany({ where: { jobId: 5n } });
 console.log(r.map(x => ({ id: String(x.id), keys: Object.keys(x).join(','), size: JSON.stringify(x, (k,v)=>typeof v==='bigint'?String(v):v).length })));
 const d = await p.letterOfIntent.deleteMany({ where: { jobId: 5n } }); console.log('deleted', d.count);
 await p.$disconnect();
})().catch(e=>{console.log(String(e).slice(0,400))});
