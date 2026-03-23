const fs = require('fs');
const s = JSON.parse(fs.readFileSync('render_services.txt'));
const ns = s.map(x => x.service.name + ' (' + x.service.type + ')');
fs.writeFileSync('service_names.txt', ns.join('\n'));
console.log('✅ Service names saved.');
