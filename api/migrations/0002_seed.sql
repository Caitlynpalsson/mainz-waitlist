-- Demo seed. Farms, farmers, and prices are made up for this preview.
-- Foods with photo_key = placeholder still need a licensed stock photo.
-- Demo dashboard tokens below are fixtures. Rotate them before a public deploy.
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (1, 'apples', 'apples', 'produce', 'lb', 'apple', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (1, 'honeycrisp', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (1, 'gala', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (1, 'fuji', 2);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (1, 'pink lady', 3);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (1, 'jonagold', 4);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (2, 'peaches', 'peaches', 'produce', 'lb', 'peach', 'peach', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (2, 'redhaven', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (2, 'elberta', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (2, 'white lady', 2);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (2, 'glohaven', 3);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (3, 'nectarines', 'nectarines', 'produce', 'lb', 'nectarine', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (3, 'fantasia', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (3, 'honey blaze', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (4, 'apricots', 'apricots', 'produce', 'lb', 'apricot', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (4, 'tilton', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (4, 'moorpark', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (5, 'cherries', 'cherries', 'produce', 'lb', 'cherry, sweet cherries, tart cherries', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (5, 'bing', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (5, 'rainier', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (5, 'lapins', 2);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (5, 'montmorency', 3);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (6, 'plums', 'plums', 'produce', 'lb', 'plum', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (6, 'santa rosa', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (6, 'italian', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (7, 'pluots', 'pluots', 'produce', 'lb', 'pluot', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (7, 'dino', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (7, 'flavor king', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (8, 'pears', 'pears', 'produce', 'lb', 'pear', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (8, 'bartlett', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (8, 'bosc', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (8, 'anjou', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (9, 'asian-pears', 'asian pears', 'produce', 'lb', 'apple pear', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (9, 'hosui', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (9, 'shinko', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (10, 'strawberries', 'strawberries', 'produce', 'pint', 'strawberry, berries', 'strawberry', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (10, 'seascape', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (10, 'albion', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (10, 'chandler', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (11, 'raspberries', 'raspberries', 'produce', 'pint', 'raspberry', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (11, 'heritage', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (11, 'caroline', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (12, 'blackberries', 'blackberries', 'produce', 'pint', 'blackberry', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (12, 'chester', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (12, 'triple crown', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (13, 'blueberries', 'blueberries', 'produce', 'pint', 'blueberry', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (13, 'duke', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (13, 'bluecrop', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (14, 'grapes', 'grapes', 'produce', 'lb', 'grape', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (14, 'concord', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (14, 'thompson', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (15, 'watermelon', 'watermelon', 'produce', 'each', 'melon', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (15, 'crimson sweet', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (15, 'sugar baby', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (16, 'cantaloupe', 'cantaloupe', 'produce', 'each', 'muskmelon', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (16, 'hale''s best', 0);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (17, 'honeydew', 'honeydew', 'produce', 'each', 'melon', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (18, 'tomatoes', 'tomatoes', 'produce', 'lb', 'tomato', 'tomato', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (18, 'early girl', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (18, 'brandywine', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (18, 'roma', 2);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (18, 'cherokee purple', 3);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (19, 'cherry-tomatoes', 'cherry tomatoes', 'produce', 'pint', 'cherry tomato', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (19, 'sungold', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (19, 'sweet 100', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (20, 'tomatillos', 'tomatillos', 'produce', 'lb', 'tomatillo', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (21, 'carrots', 'carrots', 'produce', 'bunch', 'carrot', 'carrot', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (21, 'nelson', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (21, 'bolero', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (21, 'rainbow', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (22, 'beets', 'beets', 'produce', 'bunch', 'beet', 'beets', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (22, 'detroit dark red', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (22, 'chioggia', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (22, 'golden', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (23, 'sweet-corn', 'sweet corn', 'produce', 'dozen', 'corn', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (23, 'peaches and cream', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (23, 'bodacious', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (24, 'potatoes', 'potatoes', 'produce', 'lb', 'potato', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (24, 'russet', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (24, 'yukon gold', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (24, 'red', 2);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (24, 'fingerling', 3);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (25, 'sweet-potatoes', 'sweet potatoes', 'produce', 'lb', 'sweet potato, yam', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (25, 'garnet', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (25, 'hannah', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (26, 'onions', 'onions', 'produce', 'lb', 'onion', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (26, 'yellow', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (26, 'red', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (26, 'walla walla', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (27, 'green-onions', 'green onions', 'produce', 'bunch', 'scallions, green onion', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (28, 'garlic', 'garlic', 'produce', 'head', 'garlic bulb', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (28, 'softneck', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (28, 'hardneck', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (29, 'shallots', 'shallots', 'produce', 'lb', 'shallot', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (30, 'leeks', 'leeks', 'produce', 'bunch', 'leek', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (31, 'lettuce', 'lettuce', 'produce', 'head', 'salad', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (31, 'butterhead', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (31, 'romaine', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (31, 'red leaf', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (32, 'spinach', 'spinach', 'produce', 'bunch', 'spinach', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (33, 'kale', 'kale', 'produce', 'bunch', 'kale', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (33, 'lacinato', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (33, 'curly', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (34, 'swiss-chard', 'swiss chard', 'produce', 'bunch', 'chard', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (34, 'bright lights', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (34, 'fordhook', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (35, 'arugula', 'arugula', 'produce', 'bunch', 'rocket', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (36, 'cabbage', 'cabbage', 'produce', 'head', 'cabbage', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (36, 'green', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (36, 'red', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (36, 'napa', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (37, 'broccoli', 'broccoli', 'produce', 'head', 'broccoli', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (38, 'cauliflower', 'cauliflower', 'produce', 'head', 'cauliflower', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (39, 'brussels-sprouts', 'brussels sprouts', 'produce', 'lb', 'brussels sprout', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (40, 'green-beans', 'green beans', 'produce', 'lb', 'snap beans, green bean', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (40, 'provider', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (40, 'blue lake', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (41, 'snap-peas', 'snap peas', 'produce', 'lb', 'sugar snap peas, snap pea', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (42, 'snow-peas', 'snow peas', 'produce', 'lb', 'snow pea', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (43, 'cucumbers', 'cucumbers', 'produce', 'each', 'cucumber', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (43, 'marketmore', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (43, 'lemon', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (44, 'pickling-cucumbers', 'pickling cucumbers', 'produce', 'lb', 'pickles, pickling cucumber', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (45, 'zucchini', 'zucchini', 'produce', 'lb', 'courgette', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (46, 'yellow-squash', 'yellow squash', 'produce', 'lb', 'summer squash', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (47, 'pattypan-squash', 'pattypan squash', 'produce', 'each', 'pattypan', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (48, 'butternut-squash', 'butternut squash', 'produce', 'each', 'butternut', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (49, 'acorn-squash', 'acorn squash', 'produce', 'each', 'acorn', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (50, 'delicata-squash', 'delicata squash', 'produce', 'each', 'delicata', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (51, 'spaghetti-squash', 'spaghetti squash', 'produce', 'each', 'spaghetti squash', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (52, 'pumpkin', 'pumpkin', 'produce', 'each', 'pumpkins', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (52, 'sugar pie', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (52, 'howden', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (53, 'radishes', 'radishes', 'produce', 'bunch', 'radish', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (53, 'french breakfast', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (53, 'easter egg', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (54, 'turnips', 'turnips', 'produce', 'bunch', 'turnip', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (55, 'rutabaga', 'rutabaga', 'produce', 'each', 'swede', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (56, 'parsnips', 'parsnips', 'produce', 'lb', 'parsnip', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (57, 'kohlrabi', 'kohlrabi', 'produce', 'each', 'kohlrabi', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (58, 'asparagus', 'asparagus', 'produce', 'bunch', 'asparagus', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (59, 'rhubarb', 'rhubarb', 'produce', 'lb', 'rhubarb', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (60, 'celery', 'celery', 'produce', 'bunch', 'celery', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (61, 'celeriac', 'celeriac', 'produce', 'each', 'celery root', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (62, 'fennel', 'fennel', 'produce', 'each', 'fennel bulb', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (63, 'bell-peppers', 'bell peppers', 'produce', 'each', 'bell pepper, peppers', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (63, 'red', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (63, 'yellow', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (63, 'green', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (64, 'jalapenos', 'jalapeños', 'produce', 'lb', 'jalapeno, jalapeño', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (65, 'poblanos', 'poblanos', 'produce', 'lb', 'poblano', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (66, 'hot-peppers', 'hot peppers', 'produce', 'lb', 'chili, chile, hot pepper', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (67, 'eggplant', 'eggplant', 'produce', 'each', 'aubergine', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (68, 'okra', 'okra', 'produce', 'lb', 'okra', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (69, 'artichokes', 'artichokes', 'produce', 'each', 'artichoke', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (70, 'basil', 'basil', 'produce', 'bunch', 'sweet basil', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (70, 'genovese', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (70, 'thai', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (71, 'cilantro', 'cilantro', 'produce', 'bunch', 'coriander', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (72, 'parsley', 'parsley', 'produce', 'bunch', 'parsley', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (72, 'flat leaf', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (72, 'curly', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (73, 'dill', 'dill', 'produce', 'bunch', 'dill', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (74, 'mint', 'mint', 'produce', 'bunch', 'mint', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (75, 'rosemary', 'rosemary', 'produce', 'bunch', 'rosemary', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (76, 'thyme', 'thyme', 'produce', 'bunch', 'thyme', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (77, 'chives', 'chives', 'produce', 'bunch', 'chive', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (78, 'oregano', 'oregano', 'produce', 'bunch', 'oregano', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (79, 'sage', 'sage', 'produce', 'bunch', 'sage', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (80, 'microgreens', 'microgreens', 'produce', 'box', 'micro greens', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (81, 'salad-mix', 'salad mix', 'produce', 'bag', 'mixed greens, salad', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (82, 'mushrooms', 'mushrooms', 'produce', 'lb', 'mushroom', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (82, 'oyster', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (82, 'lion''s mane', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (82, 'shiitake', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (83, 'bok-choy', 'bok choy', 'produce', 'bunch', 'pak choi, bok choi', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (84, 'collard-greens', 'collard greens', 'produce', 'bunch', 'collards', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (85, 'mustard-greens', 'mustard greens', 'produce', 'bunch', 'mustard', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (86, 'ground-cherries', 'ground cherries', 'produce', 'pint', 'husk cherries, ground cherry', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (87, 'sprouts', 'sprouts', 'produce', 'box', 'sprout', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (88, 'watercress', 'watercress', 'produce', 'bunch', 'watercress', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (89, 'endive', 'endive', 'produce', 'head', 'endive', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (90, 'radicchio', 'radicchio', 'produce', 'head', 'radicchio', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (91, 'sunchokes', 'sunchokes', 'produce', 'lb', 'jerusalem artichoke', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (92, 'garlic-scapes', 'garlic scapes', 'produce', 'bunch', 'scapes', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (93, 'figs', 'figs', 'produce', 'pint', 'fig', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (94, 'quince', 'quince', 'produce', 'lb', 'quince', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (95, 'currants', 'currants', 'produce', 'pint', 'currant', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (95, 'red', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (95, 'black', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (96, 'gooseberries', 'gooseberries', 'produce', 'pint', 'gooseberry', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (97, 'elderberries', 'elderberries', 'produce', 'lb', 'elderberry', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (98, 'mulberries', 'mulberries', 'produce', 'pint', 'mulberry', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (99, 'horseradish', 'horseradish', 'produce', 'root', 'horseradish', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (100, 'winter-squash', 'winter squash', 'produce', 'each', 'squash', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (101, 'pie-pumpkin', 'pie pumpkin', 'produce', 'each', 'sugar pumpkin', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (102, 'fresh-herbs', 'fresh herbs', 'produce', 'bunch', 'herbs, herb bundle', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (103, 'eggs', 'eggs', 'eggs', 'dozen', 'egg, chicken eggs, farm eggs', 'eggs', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (103, 'chicken', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (103, 'duck', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (104, 'raw-honey', 'raw honey', 'honey', 'jar', 'honey', 'honey', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (104, 'wildflower', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (104, 'clover', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (104, 'alfalfa', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (105, 'comb-honey', 'comb honey', 'honey', 'square', 'honeycomb, honey comb, cut comb', 'comb', 0);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (106, 'creamed-honey', 'creamed honey', 'honey', 'jar', 'whipped honey', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (107, 'beeswax', 'beeswax', 'honey', 'bar', 'wax', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (108, 'milk', 'milk', 'dairy', 'half gallon', 'raw milk, cow milk, dairy milk', 'cow', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (108, 'whole', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (108, 'two percent', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (109, 'goat-milk', 'goat milk', 'dairy', 'quart', 'goat milk', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (110, 'cheese', 'cheese', 'dairy', 'lb', 'farm cheese', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (110, 'cheddar', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (110, 'mozzarella', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (111, 'goat-cheese', 'goat cheese', 'dairy', 'log', 'chevre', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (112, 'cottage-cheese', 'cottage cheese', 'dairy', 'tub', 'cottage cheese', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (113, 'yogurt', 'yogurt', 'dairy', 'quart', 'yoghurt', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (113, 'plain', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (113, 'greek', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (114, 'butter', 'butter', 'dairy', 'lb', 'butter', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (115, 'cream', 'cream', 'dairy', 'pint', 'heavy cream', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (116, 'kefir', 'kefir', 'dairy', 'quart', 'kefir', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (117, 'ice-cream', 'ice cream', 'dairy', 'pint', 'ice cream', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (117, 'vanilla', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (117, 'honey', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (117, 'strawberry', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (118, 'sour-cream', 'sour cream', 'dairy', 'pint', 'sour cream', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (119, 'ground-beef', 'ground beef', 'meat', 'lb', 'beef, hamburger', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (120, 'steak', 'steak', 'meat', 'lb', 'beef steak', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (120, 'ribeye', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (120, 'new york', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (120, 'sirloin', 2);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (121, 'beef-roast', 'beef roast', 'meat', 'lb', 'roast, chuck roast', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (121, 'chuck', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (121, 'brisket', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (122, 'stew-meat', 'stew meat', 'meat', 'lb', 'beef stew', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (123, 'whole-chicken', 'whole chicken', 'meat', 'each', 'chicken, stewing hen', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (124, 'chicken-breast', 'chicken breast', 'meat', 'lb', 'chicken breasts', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (125, 'chicken-thighs', 'chicken thighs', 'meat', 'lb', 'chicken thigh', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (126, 'pork-chops', 'pork chops', 'meat', 'lb', 'pork chop', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (127, 'bacon', 'bacon', 'meat', 'lb', 'bacon', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (128, 'ground-pork', 'ground pork', 'meat', 'lb', 'pork', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (129, 'sausage', 'sausage', 'meat', 'lb', 'sausage', 'placeholder', 1);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (129, 'breakfast', 0);
INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (129, 'italian', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (130, 'ham', 'ham', 'meat', 'lb', 'ham', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (131, 'pork-roast', 'pork roast', 'meat', 'lb', 'pork shoulder', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (132, 'lamb-chops', 'lamb chops', 'meat', 'lb', 'lamb', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (133, 'ground-lamb', 'ground lamb', 'meat', 'lb', 'lamb', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (134, 'turkey', 'turkey', 'meat', 'lb', 'turkey breast', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (135, 'whole-turkey', 'whole turkey', 'meat', 'each', 'turkey', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (136, 'beef-bones', 'beef bones', 'meat', 'lb', 'marrow bones, stock bones', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (137, 'lard', 'lard', 'meat', 'lb', 'lard', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (138, 'bison', 'bison', 'meat', 'lb', 'buffalo', 'placeholder', 1);
INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (139, 'pork-belly', 'pork belly', 'meat', 'lb', 'pork belly', 'placeholder', 1);
INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    1, 'willow-creek-farm', 'Willow Creek Farm', 'sam and jo hale', 'sam@willowcreek.example', '',
    'Spanish Fork', 'UT', '84660', 1994,
    '38', 'acres', 'sam and jo hale. beets, carrots, eggs.
no sprays. no warehouse. no story about it.', 'sam and jo hale farm 38 acres in spanish fork. beets, carrots, eggs, strawberries, tomatoes. no sprays. no warehouse. no story about it. prices are theirs.', 4.2,
    'beets', 'beets, eggs',
    1, 1, 'sat', 'wed',
    'sat', 'wed,thu',
    '4100 s 1700 w, spanish fork', 'saturday at the stand, end of the lane. 4100 s 1700 w, spanish fork. 9 am to noon. honk if the dog is out. it''s free.', '{"pickup":[{"day":"sat","label":"sat · 9 am–12 pm"}],"delivery":[{"day":"wed","label":"wed · 9–11 am"},{"day":"wed","label":"wed · 4–6 pm"},{"day":"thu","label":"thu · 9–11 am"}]}',
    'approved', 1, 1, 'demo-willow-creek',
    'beets, carrots, eggs, strawberries, tomatoes', 'farm stand, farmers market', 'both', ''
  );
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    1, 1, 21, 'carrots, dug tuesday', 'dug tuesday', 'dug tuesday. still dusty.',
    400, 'bunch', 'sam',
    'no sprays. just dirt.', 'tue, 7:40 am', 22,
    1, 4, 1, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (1, 0, 'hero', 'carrot', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (1, 1, 'hands', 'carrot', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (1, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (1, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    2, 1, 103, 'eggs', 'the hens did this', 'the hens did this.',
    700, 'dozen', 'jo',
    'hens on pasture.', 'this morning', 16,
    0, 20, 2, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (2, 0, 'hero', 'eggs', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (2, 1, 'hands', 'eggs', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (2, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (2, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    3, 1, 10, 'strawberries, picked this morning', 'picked this morning', 'picked this morning. not in march.',
    600, 'pint', 'sam',
    'no sprays. just dirt.', 'thu, 6:10 am', 14,
    1, 2, 3, 1
  );
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (3, 'pack', 'pint', 600, 'pint', 0);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (3, 'pack', 'half flat', 2200, 'half flat', 1);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (3, 'pack', 'flat', 4000, 'flat', 2);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (3, 0, 'hero', 'strawberry', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (3, 1, 'hands', 'strawberry', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (3, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (3, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    4, 1, 18, 'tomatoes', 'ugly. very good.', 'ugly. very good.',
    500, 'lb', 'sam',
    'no sprays. just dirt.', 'wed, 8:00 am', 18,
    0, 30, 4, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (4, 0, 'hero', 'tomato', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (4, 1, 'hands', 'tomato', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (4, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (4, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    5, 1, 22, 'beets', 'dirt included', 'dirt included.',
    400, 'bunch', 'jo',
    'no sprays. just dirt.', 'tue, 7:40 am', 15,
    0, 40, 5, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (5, 0, 'hero', 'beets', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (5, 1, 'hands', 'beets', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (5, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (5, 3, 'packaging', 'placeholder', 1);
INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    2, 'east-bench-orchard', 'East Bench Orchard', 'may lewis', 'may@eastbench.example', '',
    'Santaquin', 'UT', '84655', 1978,
    '12', 'acres', 'may lewis. peaches, mostly.
the last good ones are the point.', 'east bench is a small orchard above santaquin. may lewis picks peaches, cherries, and apples when they are actually ready. no warehouse.', 9.1,
    'peach', 'peaches, cherries',
    1, 0, 'sat', '',
    'sat,sun', '',
    '120 e bench rd, santaquin', 'saturday and sunday, 9 am to 1 pm, at the shed. 120 e bench rd, santaquin. bring a box or use ours.', '{"pickup":[{"day":"sat","label":"sat · 9 am–1 pm"},{"day":"sun","label":"sun · 9 am–1 pm"}],"delivery":[]}',
    'approved', 1, 1, 'demo-east-bench',
    'peaches, cherries, apples', 'farm stand', 'pickup', ''
  );
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    6, 2, 2, 'peaches. the last good ones.', 'the last good ones.', 'the last good ones.',
    300, 'lb', 'may',
    'the bench. no sprays this block.', 'fri, 6:30 am', 40,
    1, 1, 1, 1
  );
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (6, 'variety', 'redhaven', 300, 'lb', 0);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (6, 'variety', 'elberta', 300, 'lb', 1);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (6, 'variety', 'white lady', 300, 'lb', 2);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (6, 0, 'hero', 'peach', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (6, 1, 'hands', 'peach', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (6, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (6, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    7, 2, 5, 'cherries', 'bing, this week', 'dark and almost gone.',
    600, 'lb', 'may',
    'the bench.', 'thu, 7:00 am', 12,
    0, 50, 50, 1
  );
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (7, 'variety', 'bing', 600, 'lb', 0);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (7, 'variety', 'rainier', 800, 'lb', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (7, 0, 'hero', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (7, 1, 'hands', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (7, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (7, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    8, 2, 1, 'apples', 'first of the season', 'first of the season.',
    250, 'lb', 'may',
    'the bench.', 'this week', 30,
    0, 60, 60, 1
  );
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (8, 'variety', 'honeycrisp', 300, 'lb', 0);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (8, 'variety', 'gala', 250, 'lb', 1);
INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (8, 'variety', 'fuji', 250, 'lb', 2);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (8, 0, 'hero', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (8, 1, 'hands', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (8, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (8, 3, 'packaging', 'placeholder', 1);
INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    3, 'red-butte-eggs', 'Red Butte Eggs', 'ruth kimball', 'ruth@redbutte.example', '',
    'Mapleton', 'UT', '84664', 2011,
    '200', 'hens', 'ruth kimball. eggs and a few hens.
mapleton. pickup only.', 'ruth keeps about 200 hens in mapleton. eggs most days, and a stewing hen when she has one. pickup at the gate. she does not deliver.', 6.8,
    'eggs', 'eggs, chicken',
    1, 0, 'thu', '',
    'wed,thu,fri,sat', '',
    '880 n 1600 w, mapleton', 'the gate on 1600 west. wed through sat. eggs are in the cooler with your name on the lid.', '{"pickup":[{"day":"wed","label":"wed · 4–6 pm"},{"day":"thu","label":"thu · 4–6 pm"},{"day":"fri","label":"fri · 4–6 pm"},{"day":"sat","label":"sat · 9 am–12 pm"}],"delivery":[]}',
    'approved', 1, 1, 'demo-red-butte',
    'eggs, chicken', 'farm stand', 'pickup', ''
  );
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    9, 3, 103, 'eggs', 'the hens did this', 'brown, blue, and ordinary. all of them real.',
    700, 'dozen', 'ruth',
    'pasture, when the mud allows.', 'this morning', 24,
    0, 21, 21, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (9, 0, 'hero', 'eggs', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (9, 1, 'hands', 'eggs', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (9, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (9, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    10, 3, 123, 'whole chicken', 'a stewing hen', 'a stewing hen. not a tiny grocery bird.',
    2200, 'each', 'ruth',
    'the same hens, when they retire.', 'this week', 4,
    0, 70, 70, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (10, 0, 'hero', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (10, 1, 'hands', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (10, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (10, 3, 'packaging', 'placeholder', 1);
INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    4, 'bee-loud-honey-co', 'Bee Loud Honey Co.', 'ada moss', 'ada@beeloud.example', '',
    'Payson', 'UT', '84651', 2004,
    '80', 'hives', 'ada moss. honey and comb.
not from a bear bottle.', 'ada moss keeps about 80 hives around payson. the honey is from those yards. she will not put it in a plastic bear. pickup friday, delivery wednesday.', 11,
    'comb', 'honey, comb',
    1, 1, 'fri', 'wed',
    'fri', 'wed',
    '40 w utah ave, payson', 'friday, 10 am to 4 pm, side door on utah ave. 40 w utah ave, payson.', '{"pickup":[{"day":"fri","label":"fri · 10 am–4 pm"}],"delivery":[{"day":"wed","label":"wed · 12–4 pm"}]}',
    'approved', 1, 1, 'demo-bee-loud',
    'honey, comb', 'farmers market, online', 'both', ''
  );
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    11, 4, 104, 'raw honey', 'not from a bear bottle', 'not from a bear bottle.',
    1400, '16 oz', 'ada',
    'payson yards. clover and whatever the ditch grows.', 'extracted this week', 20,
    1, 3, 3, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (11, 0, 'hero', 'honey', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (11, 1, 'hands', 'honey', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (11, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (11, 3, 'packaging', 'placeholder', 1);
INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    12, 4, 105, 'comb honey', 'a square of the hive', 'a square of the hive. chew it.',
    1200, 'square', 'ada',
    'the same yards.', 'this week', 10,
    0, 35, 35, 1
  );
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (12, 0, 'hero', 'comb', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (12, 1, 'hands', 'comb', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (12, 2, 'farm', 'placeholder', 1);
INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (12, 3, 'packaging', 'placeholder', 1);
INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    5, 'wasatch-dairy', 'Wasatch Dairy', 'elena frost', 'elena@wasatchdairy.example', '801-555-0148',
    'Spanish Fork', 'UT', '84660', 2016,
    '40', 'cows', 'elena frost. a small dairy. not approved yet.', 'this application is still pending. it should not appear in browse.', 5.4,
    'cow', 'milk, cheese',
    1, 1, 'sat', 'wed',
    'sat', '',
    '', '', '{"pickup":[{"day":"sat","label":"sat · 10 am–1 pm"}],"delivery":[]}',
    'pending', 0, 1, NULL,
    'milk, cheese', 'farmers market, just starting', 'both', ''
  );
