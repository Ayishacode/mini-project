-- Drop the old category check constraint
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_category__check;
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_category_check;

-- Add new constraint with all subcategories
ALTER TABLE grievances ADD CONSTRAINT grievances_category_check CHECK (category IN (
  'Academics - Teaching',
  'Academics - Examination',
  'Academics - Internal Assessment',
  'Office and Administration - Fee',
  'Office and Administration - Scholarships',
  'Office and Administration - Certificates',
  'Behavioral - Bullying / Ragging',
  'Behavioral - Threat / Intimidation',
  'Behavioral - Defamation',
  'Behavioral - Substance Abuse',
  'Behavioral - Sexual / Verbal Harassment',
  'Facilities - Library',
  'Facilities - Canteen',
  'Facilities - Laboratory',
  'Facilities - Computer Lab',
  'Facilities - Counselling Centre',
  'Facilities - Hostel',
  'Facilities - Washroom',
  'Facilities - Sports Amenities',
  'Campus - Cleanliness',
  'Campus - Building',
  'Campus - Electrical / Plumbing'
));
