#!/usr/bin/env node
// Same-version local archives need matching lock integrity; never resolve/upgrade dependencies here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [consumer,name,archive]=process.argv.slice(2);
if(!consumer||!name||!archive)throw Error('Usage: update-local-tarball-lock.cjs consumer package archive');
const file=path.join(consumer,'package-lock.json');
if(!fs.existsSync(file))throw Error('Run npm install first: '+consumer);
const lock=JSON.parse(fs.readFileSync(file,'utf8')),entry=lock.packages?.['node_modules/'+name];
if(!entry||entry.link||!entry.resolved?.startsWith('file:'))throw Error('Expected locked local tarball: '+name);
if(path.resolve(consumer,entry.resolved.slice(5))!==path.resolve(archive))throw Error('Local artifact path mismatch: '+name);
const installed=JSON.parse(fs.readFileSync(path.join(consumer,'node_modules',name,'package.json'),'utf8'));
const canonical=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
if(installed.name!==name||entry.version!==installed.version)throw Error('Package metadata changed; run npm install: '+name);
for(const field of ['dependencies','optionalDependencies','peerDependencies','peerDependenciesMeta'])
 if(JSON.stringify(canonical(entry[field]??{}))!==JSON.stringify(canonical(installed[field]??{})))
  throw Error('Dependency metadata changed; run npm install: '+name+' '+field);
entry.integrity='sha512-'+crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64');
fs.writeFileSync(file,JSON.stringify(lock,null,2)+'\n');
