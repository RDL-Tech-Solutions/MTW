
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('categories_dump.json', 'utf8'));

const targetId = 'b478b692-84df-4281-b20f-2722d8f1d356';
const found = data.find(c => c.id === targetId);

if (found) {
    console.log(`Found ID ${targetId}: ${JSON.stringify(found)}`);
} else {
    console.log(`ID ${targetId} not found.`);
}
