-- Warm meet-the-farm lines taken from each farm's own site.
-- Only listings we could verify. No phone numbers. No new facts.
-- Matched by profile photo or farm name so a draft keeps its line.

UPDATE listing_drafts SET meet_line = 'anderson family farms is a family-run dairy and livestock farm in huntington, utah, since 2011. they raise dairy cows and livestock with traditional farming practices and sell raw milk, beef, chicken, and eggs directly to local families.'
WHERE profile_photo = 'profile-87-farms' OR lower(farm_name) LIKE '%87 farm%' OR lower(farm_name) LIKE '%anderson family%';

UPDATE listing_drafts SET meet_line = 'gilgen farm in american fork sells pasture-raised chicken, raw honey, flower plants, and vegetable plants, and you pick them up.'
WHERE profile_photo = 'profile-gilgen-farm' OR lower(farm_name) LIKE '%gilgen%';

UPDATE listing_drafts SET meet_line = 'bar-w beef raises cattle on ranches in utah and finishes them at their feedlot in nephi, on feed grown on their own farms. the beef is processed, cut, and packaged in their own facility.'
WHERE profile_photo = 'profile-bar-w-beef' OR lower(farm_name) LIKE '%bar-w%' OR lower(farm_name) LIKE '%bar w%';

UPDATE listing_drafts SET meet_line = 'cedar valley honey is a family-owned business in eagle mountain, utah. they sell raw, local, unfiltered honey, with no additives or preservatives, across the wasatch front.'
WHERE profile_photo = 'profile-cedar-valley-honey' OR lower(farm_name) LIKE '%cedar valley%';

UPDATE listing_drafts SET meet_line = 'poor boy farms offers seasonal pickup in sandy, utah. they share orchard fruit, local honey, farm-fresh eggs, and living microgreens.'
WHERE profile_photo = 'profile-poor-boy-farms' OR lower(farm_name) LIKE '%poor boy%';

UPDATE listing_drafts SET meet_line = 'knight family honey in orem sells raw honey, queens, and package bees.'
WHERE profile_photo = 'profile-knight-family-honey' OR lower(farm_name) LIKE '%knight family%';

UPDATE listing_drafts SET meet_line = 'mosida market began as a small dairy that earl preston bateman started in west jordan in 1930. the family now raises angus and wagyu-cross cattle in utah county.'
WHERE profile_photo = 'profile-mosida-market' OR lower(farm_name) LIKE '%mosida%';

UPDATE listing_drafts SET meet_line = 'hidden hillside honey is raw utah county wildflower honey from eagle mountain. it is unfiltered and cold extracted, from more than 1,500 hives kept from spanish fork to alpine.'
WHERE profile_photo = 'profile-hidden-hillside-honey' OR lower(farm_name) LIKE '%hidden hillside%';

UPDATE listing_drafts SET meet_line = 'richard and seth homer, a father and son, keep bees across utah. they harvest raw, unfiltered honey from their own hives and sell honey and beekeeping supplies.'
WHERE profile_photo = 'profile-homers-honeybee' OR lower(farm_name) LIKE '%homer%';

UPDATE listing_drafts SET meet_line = 'the lavender hive is a family-owned lavender farm in utah. leanne bedell and her husband ivan care for the family home and garden, and the farm makes essential oils, soaps, and lotions by hand.'
WHERE profile_photo = 'profile-the-lavender-hive' OR lower(farm_name) LIKE '%lavender hive%';

UPDATE listing_drafts SET meet_line = 'hollow tree honey sells the same raw honey the bees eat. it is never heated, and it is coarse filtered so the honey keeps its flavor.'
WHERE profile_photo = 'profile-hollow-tree-honey' OR lower(farm_name) LIKE '%hollow tree%';

UPDATE listing_drafts SET meet_line = 'keeper of the b specializes in raw, unfiltered, unpasteurized local utah honey. they also sell beeswax candles, beeswax wraps, bee pollen, and chapstick.'
WHERE profile_photo = 'profile-keeper-of-the-b' OR lower(farm_name) LIKE '%keeper of the b%';

UPDATE listing_drafts SET meet_line = 'utah natural meat is a family farm in west jordan. they raise grass-only beef and lamb, pastured chicken, turkey, and eggs, and grass-fed raw milk from their small dairy.'
WHERE profile_photo = 'profile-utah-natural-meat' OR lower(farm_name) LIKE '%utah natural%';
