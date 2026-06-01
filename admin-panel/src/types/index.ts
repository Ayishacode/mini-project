export type GrievanceStatus = 
  | 'Submitted'
  | 'Acknowledged'
  | 'Under Review'
  | 'In Progress'
  | 'Awaiting Confirmation'
  | 'Resolved'
  | 'Closed'
  | 'Rejected'

export type GrievanceCategory =
  | 'Academic'
  | 'Infrastructure'
  | 'Administration'
  | 'Discipline / Harassment'
  | 'Financial'
  | 'Other'

export const PARENT_CATEGORIES = [
  'Academics',
  'Office and Administration',
  'Behavioral',
  'Facilities',
  'Campus'
]

export const ALL_SUBCATEGORIES: Record<string, string[]> = {
  'Academics': ['Teaching', 'Examination', 'Internal Assessment'],
  'Office and Administration': ['Fee', 'Scholarships', 'Certificates'],
  'Behavioral': ['Bullying / Ragging', 'Threat / Intimidation', 'Defamation', 'Substance Abuse', 'Sexual / Verbal Harassment'],
  'Facilities': ['Library', 'Canteen', 'Laboratory', 'Computer Lab', 'Counselling Centre', 'Hostel', 'Washroom', 'Sports Amenities'],
  'Campus': ['Cleanliness', 'Building', 'Electrical / Plumbing']
}

export interface Grievance {
  id: string
  grievance_id: string
  category: GrievanceCategory
  description: string
  is_anonymous: boolean
  user_id: string | null
  user_name: string | null
  user_role: string | null
  user_department: string | null
  image_url: string | null
  video_url: string | null
  status: GrievanceStatus
  created_at: string
  updated_at: string
}

export interface GrievanceAction {
  id: string
  grievance_id: string
  action_by: string
  admin_name: string
  remarks: string | null
  new_status: GrievanceStatus
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  created_at: string
}

export interface DashboardStats {
  total: number
  pending: number
  inProgress: number
  resolved: number
}
