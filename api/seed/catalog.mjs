// Mainz-owned food catalog. Simple names shoppers actually search.
// photo "placeholder" means we do not have a licensed stock photo yet.
// The nine real photos are the ones attached to the design: peach, strawberry,
// carrot, beets, tomato, eggs, honey, comb, and cow (used for milk).

/** @typedef {{ name: string, category: string, unit: string, photo: string, synonyms: string, varieties: string[] }} Food */

/** @type {Food[]} */
export const foods = [];

/**
 * @param {string} name
 * @param {string} category
 * @param {string} unit
 * @param {string} photo
 * @param {string} synonyms
 * @param {string[]} [varieties]
 */
function add(name, category, unit, photo, synonyms, varieties = []) {
  foods.push({ name, category, unit, photo, synonyms, varieties });
}

// Produce
add('apples', 'produce', 'lb', 'placeholder', 'apple', ['honeycrisp', 'gala', 'fuji', 'pink lady', 'jonagold']);
add('peaches', 'produce', 'lb', 'peach', 'peach', ['redhaven', 'elberta', 'white lady', 'glohaven']);
add('nectarines', 'produce', 'lb', 'placeholder', 'nectarine', ['fantasia', 'honey blaze']);
add('apricots', 'produce', 'lb', 'placeholder', 'apricot', ['tilton', 'moorpark']);
add('cherries', 'produce', 'lb', 'placeholder', 'cherry, sweet cherries, tart cherries', ['bing', 'rainier', 'lapins', 'montmorency']);
add('plums', 'produce', 'lb', 'placeholder', 'plum', ['santa rosa', 'italian']);
add('pluots', 'produce', 'lb', 'placeholder', 'pluot', ['dino', 'flavor king']);
add('pears', 'produce', 'lb', 'placeholder', 'pear', ['bartlett', 'bosc', 'anjou']);
add('asian pears', 'produce', 'lb', 'placeholder', 'apple pear', ['hosui', 'shinko']);
add('strawberries', 'produce', 'pint', 'strawberry', 'strawberry, berries', ['seascape', 'albion', 'chandler']);
add('raspberries', 'produce', 'pint', 'placeholder', 'raspberry', ['heritage', 'caroline']);
add('blackberries', 'produce', 'pint', 'placeholder', 'blackberry', ['chester', 'triple crown']);
add('blueberries', 'produce', 'pint', 'placeholder', 'blueberry', ['duke', 'bluecrop']);
add('grapes', 'produce', 'lb', 'placeholder', 'grape', ['concord', 'thompson']);
add('watermelon', 'produce', 'each', 'placeholder', 'melon', ['crimson sweet', 'sugar baby']);
add('cantaloupe', 'produce', 'each', 'placeholder', 'muskmelon', ['hale\'s best']);
add('honeydew', 'produce', 'each', 'placeholder', 'melon', []);
add('tomatoes', 'produce', 'lb', 'tomato', 'tomato', ['early girl', 'brandywine', 'roma', 'cherokee purple']);
add('cherry tomatoes', 'produce', 'pint', 'placeholder', 'cherry tomato', ['sungold', 'sweet 100']);
add('tomatillos', 'produce', 'lb', 'placeholder', 'tomatillo', []);
add('carrots', 'produce', 'bunch', 'carrot', 'carrot', ['nelson', 'bolero', 'rainbow']);
add('beets', 'produce', 'bunch', 'beets', 'beet', ['detroit dark red', 'chioggia', 'golden']);
add('sweet corn', 'produce', 'dozen', 'placeholder', 'corn', ['peaches and cream', 'bodacious']);
add('potatoes', 'produce', 'lb', 'placeholder', 'potato', ['russet', 'yukon gold', 'red', 'fingerling']);
add('sweet potatoes', 'produce', 'lb', 'placeholder', 'sweet potato, yam', ['garnet', 'hannah']);
add('onions', 'produce', 'lb', 'placeholder', 'onion', ['yellow', 'red', 'walla walla']);
add('green onions', 'produce', 'bunch', 'placeholder', 'scallions, green onion', []);
add('garlic', 'produce', 'head', 'placeholder', 'garlic bulb', ['softneck', 'hardneck']);
add('shallots', 'produce', 'lb', 'placeholder', 'shallot', []);
add('leeks', 'produce', 'bunch', 'placeholder', 'leek', []);
add('lettuce', 'produce', 'head', 'placeholder', 'salad', ['butterhead', 'romaine', 'red leaf']);
add('spinach', 'produce', 'bunch', 'placeholder', 'spinach', []);
add('kale', 'produce', 'bunch', 'placeholder', 'kale', ['lacinato', 'curly']);
add('swiss chard', 'produce', 'bunch', 'placeholder', 'chard', ['bright lights', 'fordhook']);
add('arugula', 'produce', 'bunch', 'placeholder', 'rocket', []);
add('cabbage', 'produce', 'head', 'placeholder', 'cabbage', ['green', 'red', 'napa']);
add('broccoli', 'produce', 'head', 'placeholder', 'broccoli', []);
add('cauliflower', 'produce', 'head', 'placeholder', 'cauliflower', []);
add('brussels sprouts', 'produce', 'lb', 'placeholder', 'brussels sprout', []);
add('green beans', 'produce', 'lb', 'placeholder', 'snap beans, green bean', ['provider', 'blue lake']);
add('snap peas', 'produce', 'lb', 'placeholder', 'sugar snap peas, snap pea', []);
add('snow peas', 'produce', 'lb', 'placeholder', 'snow pea', []);
add('cucumbers', 'produce', 'each', 'placeholder', 'cucumber', ['marketmore', 'lemon']);
add('pickling cucumbers', 'produce', 'lb', 'placeholder', 'pickles, pickling cucumber', []);
add('zucchini', 'produce', 'lb', 'placeholder', 'courgette', []);
add('yellow squash', 'produce', 'lb', 'placeholder', 'summer squash', []);
add('pattypan squash', 'produce', 'each', 'placeholder', 'pattypan', []);
add('butternut squash', 'produce', 'each', 'placeholder', 'butternut', []);
add('acorn squash', 'produce', 'each', 'placeholder', 'acorn', []);
add('delicata squash', 'produce', 'each', 'placeholder', 'delicata', []);
add('spaghetti squash', 'produce', 'each', 'placeholder', 'spaghetti squash', []);
add('pumpkin', 'produce', 'each', 'placeholder', 'pumpkins', ['sugar pie', 'howden']);
add('radishes', 'produce', 'bunch', 'placeholder', 'radish', ['french breakfast', 'easter egg']);
add('turnips', 'produce', 'bunch', 'placeholder', 'turnip', []);
add('rutabaga', 'produce', 'each', 'placeholder', 'swede', []);
add('parsnips', 'produce', 'lb', 'placeholder', 'parsnip', []);
add('kohlrabi', 'produce', 'each', 'placeholder', 'kohlrabi', []);
add('asparagus', 'produce', 'bunch', 'placeholder', 'asparagus', []);
add('rhubarb', 'produce', 'lb', 'placeholder', 'rhubarb', []);
add('celery', 'produce', 'bunch', 'placeholder', 'celery', []);
add('celeriac', 'produce', 'each', 'placeholder', 'celery root', []);
add('fennel', 'produce', 'each', 'placeholder', 'fennel bulb', []);
add('bell peppers', 'produce', 'each', 'placeholder', 'bell pepper, peppers', ['red', 'yellow', 'green']);
add('jalapeños', 'produce', 'lb', 'placeholder', 'jalapeno, jalapeño', []);
add('poblanos', 'produce', 'lb', 'placeholder', 'poblano', []);
add('hot peppers', 'produce', 'lb', 'placeholder', 'chili, chile, hot pepper', []);
add('eggplant', 'produce', 'each', 'placeholder', 'aubergine', []);
add('okra', 'produce', 'lb', 'placeholder', 'okra', []);
add('artichokes', 'produce', 'each', 'placeholder', 'artichoke', []);
add('basil', 'produce', 'bunch', 'placeholder', 'sweet basil', ['genovese', 'thai']);
add('cilantro', 'produce', 'bunch', 'placeholder', 'coriander', []);
add('parsley', 'produce', 'bunch', 'placeholder', 'parsley', ['flat leaf', 'curly']);
add('dill', 'produce', 'bunch', 'placeholder', 'dill', []);
add('mint', 'produce', 'bunch', 'placeholder', 'mint', []);
add('rosemary', 'produce', 'bunch', 'placeholder', 'rosemary', []);
add('thyme', 'produce', 'bunch', 'placeholder', 'thyme', []);
add('chives', 'produce', 'bunch', 'placeholder', 'chive', []);
add('oregano', 'produce', 'bunch', 'placeholder', 'oregano', []);
add('sage', 'produce', 'bunch', 'placeholder', 'sage', []);
add('microgreens', 'produce', 'box', 'placeholder', 'micro greens', []);
add('salad mix', 'produce', 'bag', 'placeholder', 'mixed greens, salad', []);
add('mushrooms', 'produce', 'lb', 'placeholder', 'mushroom', ['oyster', 'lion\'s mane', 'shiitake']);
add('bok choy', 'produce', 'bunch', 'placeholder', 'pak choi, bok choi', []);
add('collard greens', 'produce', 'bunch', 'placeholder', 'collards', []);
add('mustard greens', 'produce', 'bunch', 'placeholder', 'mustard', []);
add('ground cherries', 'produce', 'pint', 'placeholder', 'husk cherries, ground cherry', []);
add('sprouts', 'produce', 'box', 'placeholder', 'sprout', []);
add('watercress', 'produce', 'bunch', 'placeholder', 'watercress', []);
add('endive', 'produce', 'head', 'placeholder', 'endive', []);
add('radicchio', 'produce', 'head', 'placeholder', 'radicchio', []);
add('sunchokes', 'produce', 'lb', 'placeholder', 'jerusalem artichoke', []);
add('garlic scapes', 'produce', 'bunch', 'placeholder', 'scapes', []);
add('figs', 'produce', 'pint', 'placeholder', 'fig', []);
add('quince', 'produce', 'lb', 'placeholder', 'quince', []);
add('currants', 'produce', 'pint', 'placeholder', 'currant', ['red', 'black']);
add('gooseberries', 'produce', 'pint', 'placeholder', 'gooseberry', []);
add('elderberries', 'produce', 'lb', 'placeholder', 'elderberry', []);
add('mulberries', 'produce', 'pint', 'placeholder', 'mulberry', []);
add('horseradish', 'produce', 'root', 'placeholder', 'horseradish', []);
add('winter squash', 'produce', 'each', 'placeholder', 'squash', []);
add('pie pumpkin', 'produce', 'each', 'placeholder', 'sugar pumpkin', []);
add('fresh herbs', 'produce', 'bunch', 'placeholder', 'herbs, herb bundle', []);

// Eggs, honey, dairy, meat
add('eggs', 'eggs', 'dozen', 'eggs', 'egg, chicken eggs, farm eggs', ['chicken', 'duck']);
add('raw honey', 'honey', 'jar', 'honey', 'honey', ['wildflower', 'clover', 'alfalfa']);
add('comb honey', 'honey', 'square', 'comb', 'honeycomb, honey comb, cut comb', []);
add('creamed honey', 'honey', 'jar', 'placeholder', 'whipped honey', []);
add('beeswax', 'honey', 'bar', 'placeholder', 'wax', []);
add('milk', 'dairy', 'half gallon', 'cow', 'raw milk, cow milk, dairy milk', ['whole', 'two percent']);
add('goat milk', 'dairy', 'quart', 'placeholder', 'goat milk', []);
add('cheese', 'dairy', 'lb', 'placeholder', 'farm cheese', ['cheddar', 'mozzarella']);
add('goat cheese', 'dairy', 'log', 'placeholder', 'chevre', []);
add('cottage cheese', 'dairy', 'tub', 'placeholder', 'cottage cheese', []);
add('yogurt', 'dairy', 'quart', 'placeholder', 'yoghurt', ['plain', 'greek']);
add('butter', 'dairy', 'lb', 'placeholder', 'butter', []);
add('cream', 'dairy', 'pint', 'placeholder', 'heavy cream', []);
add('kefir', 'dairy', 'quart', 'placeholder', 'kefir', []);
add('ice cream', 'dairy', 'pint', 'placeholder', 'ice cream', ['vanilla', 'honey', 'strawberry']);
add('sour cream', 'dairy', 'pint', 'placeholder', 'sour cream', []);
add('ground beef', 'meat', 'lb', 'placeholder', 'beef, hamburger', []);
add('steak', 'meat', 'lb', 'placeholder', 'beef steak', ['ribeye', 'new york', 'sirloin']);
add('beef roast', 'meat', 'lb', 'placeholder', 'roast, chuck roast', ['chuck', 'brisket']);
add('stew meat', 'meat', 'lb', 'placeholder', 'beef stew', []);
add('whole chicken', 'meat', 'each', 'placeholder', 'chicken, stewing hen', []);
add('chicken breast', 'meat', 'lb', 'placeholder', 'chicken breasts', []);
add('chicken thighs', 'meat', 'lb', 'placeholder', 'chicken thigh', []);
add('pork chops', 'meat', 'lb', 'placeholder', 'pork chop', []);
add('bacon', 'meat', 'lb', 'placeholder', 'bacon', []);
add('ground pork', 'meat', 'lb', 'placeholder', 'pork', []);
add('sausage', 'meat', 'lb', 'placeholder', 'sausage', ['breakfast', 'italian']);
add('ham', 'meat', 'lb', 'placeholder', 'ham', []);
add('pork roast', 'meat', 'lb', 'placeholder', 'pork shoulder', []);
add('lamb chops', 'meat', 'lb', 'placeholder', 'lamb', []);
add('ground lamb', 'meat', 'lb', 'placeholder', 'lamb', []);
add('turkey', 'meat', 'lb', 'placeholder', 'turkey breast', []);
add('whole turkey', 'meat', 'each', 'placeholder', 'turkey', []);
add('beef bones', 'meat', 'lb', 'placeholder', 'marrow bones, stock bones', []);
add('lard', 'meat', 'lb', 'placeholder', 'lard', []);
add('bison', 'meat', 'lb', 'placeholder', 'buffalo', []);
add('pork belly', 'meat', 'lb', 'placeholder', 'pork belly', []);

if (foods.length < 100 || foods.length > 150) {
  throw new Error(`catalog should be 100 to 150 foods, got ${foods.length}`);
}
