-- ============================================================================
-- Restohub POS — seed data
--
-- Run AFTER schema.sql. Mirrors src/lib/data/catalog.ts so phase 2 opens with
-- the same catalog the dummy build uses.
--
-- Cashier rows are NOT created here: each one must reference an auth.users id.
-- Create the users first (Supabase dashboard → Authentication → Add user), then
-- run the block at the bottom with the real UUIDs.
-- ============================================================================

insert into lanes (code, name, terminal) values
  ('L04', 'Lane 04', 'Main Terminal')
on conflict (code) do nothing;

insert into products
  (plu, upc, sku, name, subtitle, department, department_code, pricing_mode,
   unit_price_cents, unit_label, tax_flag, ebt_eligible, deposit_cents, organic,
   art, icon, icon_class, promo_label, categories)
values
  -- Produce
  ('4011',  null, null, 'Bananas',                    'Conventional Yellow',    'Produce', '04', 'scale',   69, 'lb',   'F', true,  0, false, 'banana',           'nutrition',      'text-tertiary-fixed-dim', null,      '{all,roots}'),
  ('94131', null, null, 'Gala Apples',                'Organic Certified',      'Produce', '04', 'scale',  249, 'lb',   'F', true,  0, true,  'apple-gala',       'nutrition',      'text-error',              null,      '{all,organic,apples}'),
  ('4225',  null, null, 'Hass Avocado',               'Large Size 48s',         'Produce', '04', 'count',  125, 'each', 'F', true,  0, false, 'avocado',          'eco',            'text-primary-container',  null,      '{all,tropical}'),
  ('4087',  null, null, 'Roma Tomatoes',              'Plum Field Grown',       'Produce', '04', 'scale',  149, 'lb',   'F', true,  0, false, 'tomato',           'grocery',        'text-error',              null,      '{all,greens}'),
  ('3283',  null, null, 'Honeycrisp Apples',          'Extra Fancy Washington', 'Produce', '04', 'scale',  299, 'lb',   'F', true,  0, false, 'apple-honeycrisp', 'nutrition',      'text-error',              null,      '{all,apples}'),
  ('4593',  null, null, 'English Cucumber',           'Seedless Hot House',     'Produce', '04', 'count',  169, 'each', 'F', true,  0, false, 'cucumber',         'eco',            'text-primary',            null,      '{all,greens}'),
  ('4088',  null, null, 'Red Bell Peppers',           'Sweet Greenhouse',       'Produce', '04', 'scale',  199, 'lb',   'F', true,  0, false, 'pepper',           'local_florist',  'text-error',              null,      '{all,greens}'),
  ('4053',  null, null, 'Lemons Choice',              'Fresh Seeded California','Produce', '04', 'count',   79, 'each', 'F', true,  0, false, 'lemon',            'nature',         'text-tertiary-fixed-dim', '3/$2.00', '{all,citrus}'),
  ('4093',  null, null, 'Yellow Onions',              'Bulk Medium Dry',        'Produce', '04', 'scale',   99, 'lb',   'F', true,  0, false, 'onion',            'nutrition',      'text-tertiary',           null,      '{all,roots}'),
  ('4060',  null, null, 'Broccoli Crowns',            'Short Cut Iced',         'Produce', '04', 'scale',  189, 'lb',   'F', true,  0, false, 'broccoli',         'eco',            'text-primary',            null,      '{all,greens}'),
  ('4048',  null, null, 'Limes Persian',              'Seedless Mexico',        'Produce', '04', 'count',   50, 'each', 'F', true,  0, false, 'lime',             'nature',         'text-primary',            null,      '{all,citrus}'),
  ('4816',  null, null, 'Sweet Potatoes',             'Garnet / Red Yams',      'Produce', '04', 'scale',  139, 'lb',   'F', true,  0, false, 'sweet-potato',     'nutrition',      'text-tertiary',           null,      '{all,roots}'),
  ('94011', null, null, 'Organic Cavendish Bananas',  'Organic Certified',      'Produce', '04', 'scale',   69, 'lb',   'F', true,  0, true,  'banana',           'nutrition',      'text-primary',            null,      '{all,organic}'),
  ('4889',  null, null, 'Fresh Cilantro Bunch',       'Produce',                'Produce', '04', 'count',   99, 'each', 'F', true,  0, false, 'cilantro',         'local_florist',  'text-primary',            null,      '{all,greens}'),
  ('4032',  null, null, 'Seedless Watermelon',        'Whole',                  'Produce', '04', 'count',  599, 'each', 'F', true,  0, false, 'watermelon',       'nutrition',      'text-error',              null,      '{all,tropical}'),

  -- Packaged / department goods
  (null, '04122081109', '109',  'Grade A Brown Eggs',              'Dozen',        'Dairy',    '02', 'count',  349, 'each', 'F', true,  0, false, null, 'egg',              'text-tertiary',            null, '{}'),
  ('4120', null, null,          'French Baguette',                 'Daily Fresh',  'Bakery',   '06', 'count',  299, 'each', 'F', true,  0, false, null, 'bakery_dining',    'text-tertiary-container',  null, '{}'),
  ('8810', null, null,          'Rotisserie Chicken',              'Hot Deli',     'Deli',     '07', 'count',  799, 'each', 'T', false, 0, false, null, 'dinner_dining',    'text-tertiary',            null, '{}'),
  (null, null, '881',           'Party Ice 7lb Bag',               'Freezer',      'Frozen',   '09', 'count',  250, 'each', 'F', true,  0, false, null, 'ac_unit',          'text-secondary',           null, '{}'),
  (null, null, '302',           'Deli Soup 16oz Cup',              'Deli Kitchen', 'Deli',     '07', 'count',  499, 'each', 'T', false, 0, false, null, 'soup_kitchen',     'text-tertiary',            null, '{}'),
  (null, null, '9901',          'Paper Grocery Bag',               'Fee',          'Non-Food', '11', 'count',   10, 'each', 'T', false, 0, false, null, 'shopping_bag',     'text-outline',             null, '{}'),
  (null, '04122081921', null,   'Whole Milk 1 Gallon',             'Dairy',        'Dairy',    '02', 'count',  379, 'each', 'F', true,  0, false, null, 'water_drop',       'text-secondary',           null, '{}'),
  (null, null, '5501',          'Fresh Atlantic Salmon Fillet',    'Seafood Dept', 'Seafood',  '05', 'scale', 1299, 'lb',   'F', true,  0, false, null, 'set_meal',         'text-error',               null, '{}'),
  (null, '07677070001', null,   'Kerrygold Pure Irish Butter 8oz', 'Dairy',        'Dairy',    '02', 'count',  549, 'each', 'F', true,  0, false, null, 'breakfast_dining', 'text-tertiary-fixed-dim',  null, '{}'),
  ('4132', null, null,          'Sourdough Artisan Boule',         'Bakery Scratch','Bakery',  '06', 'count',  429, 'each', 'F', true,  0, false, null, 'bakery_dining',    'text-tertiary',            null, '{}'),
  (null, '08990120012', null,   'Sparkling Spring Water 12-pk',    'Beverage',     'Beverage', '08', 'count',  599, 'each', 'T', false, 60, false, null, 'local_drink',     'text-secondary',           null, '{}')
on conflict do nothing;

insert into members (account_number, full_name, tier, points, reward_cents, email, phone) values
  ('84920', 'Marcus Vance', 'Gold', 340, 500, 'm.vance@example.com', '(555) 382-9912')
on conflict (account_number) do nothing;

-- ---------------------------------------------------------------------------
-- Cashiers — fill in real auth.users UUIDs, then uncomment and run.
--
--   insert into cashiers (id, badge, full_name, email, role) values
--     ('<uuid-from-auth-users>', '0482', 'Sarah Jenkins', 'sarah.jenkins@restohub.test', 'manager'),
--     ('<uuid-from-auth-users>', '0517', 'Mike Torres',   'mike.torres@restohub.test',   'supervisor'),
--     ('<uuid-from-auth-users>', '0630', 'Ana Reyes',     'ana.reyes@restohub.test',     'cashier');
--
--   select set_cashier_pin('<uuid>', '4821');
--   select set_cashier_pin('<uuid>', '8021');
--   select set_cashier_pin('<uuid>', '1357');
-- ---------------------------------------------------------------------------
