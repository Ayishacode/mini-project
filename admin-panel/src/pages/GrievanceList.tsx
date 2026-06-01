import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Grievance } from '../types'
import { getStatusColor, formatDate } from '../lib/utils'
import { useEffect, useState } from 'react'

const CATEGORY_MAP: Record<string, string> = {
  'Academic': 'Academics',
  'Financial': 'Office and Administration',
  'Administration': 'Office and Administration',
  'Discipline / Harassment': 'Behavioral',
  'Infrastructure': 'Facilities',
  'Other': 'Campus',
}

function getParentCategory(g: Grievance): string {
  if (g.user_department) {
    const parts = g.user_department.split(' - ')
    if (parts.length >= 1) return parts[0]
  }
  return CATEGORY_MAP[g.category] || g.category
}

export default function GrievanceList() {
  const [searchParams] = useSearchParams()
  const [filteredGrievances, setFilteredGrievances] = useState<Grievance[]>([])
  
  const { data: grievances = [], isLoading } = useQuery({
    queryKey: ['grievances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Grievance[]
    },
  })

  useEffect(() => {
    let filtered = [...grievances]
    
    // Filter by category (match parent category)
    const category = searchParams.get('category')
    if (category) {
      filtered = filtered.filter(g => getParentCategory(g) === category)
    }
    
    // Filter by status
    const status = searchParams.get('status')
    if (status) {
      switch (status) {
        case 'pending':
          filtered = filtered.filter(g => g.status === 'Submitted' || g.status === 'Acknowledged')
          break
        case 'progress':
          filtered = filtered.filter(g => g.status === 'In Progress' || g.status === 'Under Review')
          break
        case 'resolved':
          filtered = filtered.filter(g => g.status === 'Resolved' || g.status === 'Closed')
          break
        default:
          filtered = filtered.filter(g => g.status === status)
      }
    }
    
    setFilteredGrievances(filtered)
  }, [grievances, searchParams])

  const getFilterTitle = () => {
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    
    if (category && status) {
      return `${category} - ${status.charAt(0).toUpperCase() + status.slice(1)} Grievances`
    } else if (category) {
      return `${category} Grievances`
    } else if (status) {
      const statusMap: { [key: string]: string } = {
        pending: 'Pending',
        progress: 'In Progress',
        resolved: 'Resolved'
      }
      return `${statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)} Grievances`
    }
    return 'All Grievances'
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getFilterTitle()}</h1>
          {(searchParams.get('category') || searchParams.get('status')) && (
            <Link 
              to="/grievances" 
              className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
            >
              ← Back to all grievances
            </Link>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Showing: {filteredGrievances.length} of {grievances.length} grievances
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Grievance ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Identity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGrievances.map((grievance) => (
              <tr key={grievance.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/grievances/${grievance.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {grievance.grievance_id}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                  {grievance.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getParentCategory(grievance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(grievance.status)}`}>
                    {grievance.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {grievance.is_anonymous ? (
                    <span className="text-gray-500 italic">Anonymous</span>
                  ) : (
                    grievance.user_name || 'Identified'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(grievance.created_at)}
                </td>
              </tr>
            ))}
            {filteredGrievances.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No grievances found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
