import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Grievance, PARENT_CATEGORIES } from '../types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Map DB category values to parent category names
const CATEGORY_MAP: Record<string, string> = {
  'Academic': 'Academics',
  'Financial': 'Office and Administration',
  'Administration': 'Office and Administration',
  'Discipline / Harassment': 'Behavioral',
  'Infrastructure': 'Facilities',
  'Other': 'Campus',
}

function getParentCategory(g: Grievance): string {
  // user_department stores full "Parent - Sub" value
  if (g.user_department) {
    const parts = g.user_department.split(' - ')
    if (parts.length >= 1) return parts[0]
  }
  return CATEGORY_MAP[g.category] || g.category
}

export default function Dashboard() {
  const navigate = useNavigate()
  
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

  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => g.status === 'Submitted' || g.status === 'Acknowledged').length,
    inProgress: grievances.filter(g => g.status === 'In Progress' || g.status === 'Under Review').length,
    resolved: grievances.filter(g => g.status === 'Resolved' || g.status === 'Closed').length,
  }

  const categories = PARENT_CATEGORIES

  const getCategoryCount = (category: string) => {
    return grievances.filter(g => 
      getParentCategory(g) === category && 
      (g.status === 'Submitted' || g.status === 'Acknowledged')
    ).length
  }

  // Category Distribution Data
  const categoryData = categories.map(category => ({
    name: category,
    count: grievances.filter(g => getParentCategory(g) === category).length
  })).filter(item => item.count > 0)

  // Status Breakdown Data
  const statusData = [
    { name: 'Submitted', value: grievances.filter(g => g.status === 'Submitted').length, color: '#3B82F6' },
    { name: 'Acknowledged', value: grievances.filter(g => g.status === 'Acknowledged').length, color: '#60A5FA' },
    { name: 'Under Review', value: grievances.filter(g => g.status === 'Under Review').length, color: '#F59E0B' },
    { name: 'In Progress', value: grievances.filter(g => g.status === 'In Progress').length, color: '#FB923C' },
    { name: 'Awaiting Confirmation', value: grievances.filter(g => g.status === 'Awaiting Confirmation').length, color: '#8B5CF6' },
    { name: 'Resolved', value: grievances.filter(g => g.status === 'Resolved').length, color: '#10B981' },
    { name: 'Closed', value: grievances.filter(g => g.status === 'Closed').length, color: '#6B7280' },
    { name: 'Rejected', value: grievances.filter(g => g.status === 'Rejected').length, color: '#EF4444' },
  ].filter(item => item.value > 0)

  const handleGrievanceClick = (grievanceId: string) => {
    navigate(`/grievances/${grievanceId}`)
  }

  const handleCategoryClick = (category: string) => {
    navigate(`/grievances?category=${encodeURIComponent(category)}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'Acknowledged':
        return 'bg-blue-100 text-blue-800'
      case 'Under Review':
        return 'bg-purple-100 text-purple-800'
      case 'In Progress':
        return 'bg-orange-100 text-orange-800'
      case 'Awaiting Confirmation':
        return 'bg-indigo-100 text-indigo-800'
      case 'Resolved':
        return 'bg-green-100 text-green-800'
      case 'Closed':
        return 'bg-gray-100 text-gray-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div 
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/grievances')}
        >
          <div className="text-sm text-gray-600">Total Grievances</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Click to view all</div>
        </div>
        <div 
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/grievances?status=pending')}
        >
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</div>
          <div className="text-xs text-gray-500 mt-1">Click to view pending</div>
        </div>
        <div 
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/grievances?status=progress')}
        >
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</div>
          <div className="text-xs text-gray-500 mt-1">Click to view in progress</div>
        </div>
        <div 
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/grievances?status=resolved')}
        >
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</div>
          <div className="text-xs text-gray-500 mt-1">Click to view resolved</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Status Breakdown Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Category Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
        <div className="grid grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="text-sm font-medium text-gray-900">{category}</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {getCategoryCount(category)}
              </div>
              <div className="text-xs text-gray-500 mt-1">pending • click to view</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Grievances */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Grievances</h2>
          <button
            onClick={() => navigate('/grievances')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grievances.slice(0, 8).map((grievance) => (
                <tr 
                  key={grievance.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleGrievanceClick(grievance.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                    {grievance.grievance_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getParentCategory(grievance)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {grievance.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(grievance.status)}`}>
                      {grievance.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(grievance.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {grievances.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No grievances found. They will appear here once submitted.
            </div>
          )}
          
          {grievances.length > 8 && (
            <div className="bg-gray-50 px-6 py-3 text-center">
              <button
                onClick={() => navigate('/grievances')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View {grievances.length - 8} more grievances →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
