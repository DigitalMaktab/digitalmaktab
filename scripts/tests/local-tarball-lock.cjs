const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dm-lock-test-')),consumer=path.join(directory,'consumer'),archive=path.join(directory,'package.tgz'),name='@digitalmaktab/fixture',file=path.join(consumer,'package-lock.json');
try{
 fs.mkdirSync(path.join(consumer,'node_modules',name),{recursive:true});fs.writeFileSync(archive,'fixture archive bytes');
 const metadata={name,version:'0.1.0',dependencies:{b:'2',a:'1'},peerDependencies:{react:'>=18'}};fs.writeFileSync(path.join(consumer,'node_modules',name,'package.json'),JSON.stringify(metadata));
 const initial={name:'consumer',lockfileVersion:3,packages:{'':{name:'consumer'},['node_modules/'+name]:{version:'0.1.0',resolved:'file:../package.tgz',integrity:'old',dependencies:{a:'1',b:'2'},peerDependencies:{react:'>=18'}},'node_modules/other':{version:'4',integrity:'unchanged'}}};
 const reset=()=>fs.writeFileSync(file,JSON.stringify(initial,null,2)+'\n');reset();
 const run=()=>spawnSync(process.execPath,[path.resolve(__dirname,'../update-local-tarball-lock.cjs'),consumer,name,archive],{encoding:'utf8'});
 assert.equal(run().status,0);const updated=JSON.parse(fs.readFileSync(file));assert.equal(updated.packages['node_modules/'+name].integrity,'sha512-'+crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64'));updated.packages['node_modules/'+name].integrity='old';assert.deepEqual(updated,initial);
 const before=fs.readFileSync(file,'utf8');metadata.dependencies.a='changed';fs.writeFileSync(path.join(consumer,'node_modules',name,'package.json'),JSON.stringify(metadata));assert.notEqual(run().status,0);assert.equal(fs.readFileSync(file,'utf8'),before);
 metadata.dependencies.a='1';fs.writeFileSync(path.join(consumer,'node_modules',name,'package.json'),JSON.stringify(metadata));initial.packages['node_modules/'+name].resolved='file:../different.tgz';reset();assert.notEqual(run().status,0);
 initial.packages['node_modules/'+name].resolved='https://example.invalid/pkg.tgz';reset();assert.notEqual(run().status,0);
 console.log('PASS: shared local tarball lock refresh matches installed artifacts, preserves unrelated metadata and refuses wrong paths, remote locks and dependency drift.');
}finally{fs.rmSync(directory,{recursive:true,force:true})}
