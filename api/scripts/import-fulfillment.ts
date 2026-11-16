// Check a farm fulfillment JSON file and print the SQL to store it.
// Usage: node --experimental-strip-types scripts/import-fulfillment.ts samples/87-farms-fulfillment.json --token lk_...
import { readFileSync } from 'node:fs';
import { parseFulfillment, renderPickupOption } from '../src/fulfillment.ts';

const file = process.argv[2];
const tokenFlag = process.argv.indexOf('--token');
const token = tokenFlag > 0 ? process.argv[tokenFlag + 1] : '';
if (!file) {
  console.error('pass a json file. optional: --token lk_...');
  process.exit(1);
}
const parsed = parseFulfillment(readFileSync(file, 'utf8'));
if (!parsed.options.length) {
  console.error('no pickup options in that file.');
  process.exit(1);
}
const shown = parsed.options.flatMap(renderPickupOption).join('\n');
if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(shown)) {
  console.error('a phone number is still in the public text.');
  process.exit(1);
}
const json = JSON.stringify(parsed).replace(/'/g, "''");
console.log(`-- ${parsed.options.length} pickup options. delivery from this farm: ${parsed.offersDelivery ? 'yes' : 'no'}`);
if (token) {
  console.log(`UPDATE listing_drafts SET fulfillment_json = '${json}' WHERE token = '${token.replace(/'/g, '')}';`);
} else {
  console.log(JSON.stringify(parsed, null, 2));
}
