import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('public/mnist',{recursive:true});
for(const file of ['style.css','app.js','network.js','weights.bin','model.json']) {
  copyFileSync(`mnist/${file}`,`public/mnist/${file}`);
}
