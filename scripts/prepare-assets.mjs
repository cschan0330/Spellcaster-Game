import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('public/mnist',{recursive:true});
for(const file of ['style.css','app.js','network.js','weights.bin','model.json']) {
  copyFileSync(`mnist/${file}`,`public/mnist/${file}`);
}
mkdirSync('public/wiki',{recursive:true});
copyFileSync('src/style.css','public/wiki/style.css');
writeFileSync('public/wiki/main.js',readFileSync('src/main.js','utf8').replace("import './style.css';",''));
