# Farm pickup options

Each farm, and each listing draft, can store its own pickup options in `fulfillment_json`. Mainz delivery is separate. It is offered only when a route covers the shopper's zip. The delivery fee stays the existing placeholder.

Do not put phone numbers in this file or in the JSON. The parser drops them.

## JSON

```json
{
  "offersDelivery": false,
  "options": [
    {
      "name": "the farm",
      "address": "987 Utah 31, Huntington, UT 84528",
      "zip": "84528",
      "schedule": "any day by appointment",
      "windows": [],
      "cutoff": "order by noon 2 days ahead",
      "feeCents": 0,
      "minimumCents": null
    }
  ]
}
```

- `name` is required.
- `address` can be empty. It is not shown as a shopper's delivery address.
- `zip` is the stop's ZIP, used to find the nearest spots. A lat and lng pair can be set instead. Checkout uses the bundled Utah ZIP centroids. No outside map service. The card is the nearest stop. "See other spots" shows only the next two (three stops at most). A farm with no stops says "pickup details coming soon" and can continue only when a Mainz route covers the zip.
- The farm page does not list the stops. It shows one line, such as "pickup in huntington and the salt lake valley". Salt Lake Valley towns are grouped. Set `pickup_line` on the farm or the draft to replace that line. Leave it empty to generate it. No stops means no line.
- `schedule` is the day or a short line such as "any day by appointment".
- `windows` can be empty. When present, each entry is a time range.
- `cutoff` is the farm's own order-by rule, as text.
- `feeCents` defaults to 0.
- `minimumCents` defaults to none. Use `null`, not 0.

## Reuse it for the next farm

1. Save the farm's options as JSON in `api/samples/`.
2. Check it:

```bash
node --experimental-strip-types scripts/import-fulfillment.ts samples/your-farm.json --token lk_...
```

3. The script prints an `UPDATE` for `listing_drafts`. Put that in a new additive migration, or run it only after you have reviewed the SQL. It does not write to the database by itself.

The 87 Farms draft is `samples/87-farms-fulfillment.json`. Pickup seeds for Bar-W Beef, McArthur Farms, Knight Family Honey, Poor Boy Farms, and Mosida Market live beside it. Cedar Valley Honey has no published farm pickup times, so it has no seed file.
