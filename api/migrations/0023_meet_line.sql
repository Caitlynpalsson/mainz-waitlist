-- Optional sentence for the "meet the farm" section.
-- Empty means the page uses the farm's own story, never a one-word fragment.
-- The seed copies a story that is already a full sentence. It does not add new facts.

ALTER TABLE farms ADD COLUMN meet_line TEXT NOT NULL DEFAULT '';
ALTER TABLE listing_drafts ADD COLUMN meet_line TEXT NOT NULL DEFAULT '';

UPDATE listing_drafts
SET meet_line = lower(trim(story))
WHERE trim(meet_line) = ''
  AND length(trim(story)) - length(replace(trim(story), ' ', '')) >= 5;

UPDATE farms
SET meet_line = lower(trim(bio))
WHERE trim(meet_line) = ''
  AND length(trim(bio)) - length(replace(trim(bio), ' ', '')) >= 5;
