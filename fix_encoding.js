const fs = require('fs');
const path = require('path');

function fixMojibake(text) {
    let result = text;
    const replacements = {
        'Ã¡': 'á',
        'Ã©': 'é',
        'Ã­': 'í',
        'Ã³': 'ó',
        'Ãº': 'ú',
        'Ã±': 'ñ',
        'Ã ': 'Á',
        'Ã‰': 'É',
        'Ã\x8D': 'Í',
        'Ã“': 'Ó',
        'Ãš': 'Ú',
        'Ã‘': 'Ñ',
        'Â¿': '¿',
        'Â¡': '¡'
    };
    for (const [bad, good] of Object.entries(replacements)) {
        result = result.split(bad).join(good);
    }
    return result;
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fixed = fixMojibake(content);
            if (content !== fixed) {
                console.log('Fixed:', fullPath);
                fs.writeFileSync(fullPath, fixed, 'utf8');
            }
        }
    }
}

['./api.ts', './frontend/src/lib/api.ts'].forEach(apiPath => {
    if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        const fixed = fixMojibake(content);
        if (content !== fixed) {
            console.log('Fixed:', apiPath);
            fs.writeFileSync(apiPath, fixed, 'utf8');
        }
    }
});

processDir('./frontend/src');
