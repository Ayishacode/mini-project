import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Grievance, GrievanceAction, PARENT_CATEGORIES } from '../types'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

// Generate full HTML report for one or more grievances with their actions
function generateHTMLReport(grievances: Grievance[], actionsMap: Record<string, GrievanceAction[]>, title: string): string {
  const rows = grievances.map(g => {
    const actions = actionsMap[g.id] || []
    const actionRows = actions.length > 0
      ? actions.map(a => `
          <tr>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;">${new Date(a.created_at).toLocaleString()}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;">${a.admin_name}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;">${a.new_status}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;">${a.remarks || '-'}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="padding:6px 10px;border:1px solid #e5e7eb;color:#9ca3af;">No actions recorded</td></tr>`

    const mediaSection = (g.image_url || g.video_url) ? `
      <div style="margin-top:8px;">
        <strong>Media:</strong>
        ${g.image_url ? `<div><a href="${g.image_url}" target="_blank" style="color:#2563eb;">📷 View Image</a></div>` : ''}
        ${g.video_url ? `<div><a href="${g.video_url}" target="_blank" style="color:#2563eb;">🎥 View Video</a></div>` : ''}
      </div>` : ''

    return `
      <div style="border:1px solid #d1d5db;border-radius:8px;padding:20px;margin-bottom:24px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2 style="margin:0;font-size:18px;color:#111827;">${g.grievance_id}</h2>
          <span style="background:#dbeafe;color:#1d4ed8;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${g.status}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
          <tr>
            <td style="padding:4px 0;width:160px;color:#6b7280;font-size:13px;">Category</td>
            <td style="padding:4px 0;font-size:13px;">${getParentCategory(g)}</td>
            <td style="padding:4px 0;width:160px;color:#6b7280;font-size:13px;">Subcategory</td>
            <td style="padding:4px 0;font-size:13px;">${g.user_department || g.category}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Submitted</td>
            <td style="padding:4px 0;font-size:13px;">${new Date(g.created_at).toLocaleString()}</td>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Identity</td>
            <td style="padding:4px 0;font-size:13px;">${g.is_anonymous ? 'Anonymous' : (g.user_id || 'Identified')}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Last Updated</td>
            <td style="padding:4px 0;font-size:13px;" colspan="3">${new Date(g.updated_at).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:#f9fafb;border-radius:6px;padding:12px;margin-bottom:12px;">
          <strong style="font-size:13px;color:#374151;">Description:</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#111827;">${g.description}</p>
        </div>
        ${mediaSection}
        <div style="margin-top:12px;">
          <strong style="font-size:13px;color:#374151;">Progress History:</strong>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Date</th>
                <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Admin</th>
                <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Status</th>
                <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Remarks</th>
              </tr>
            </thead>
            <tbody>${actionRows}</tbody>
          </table>
        </div>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p style="color:#6b7280;font-size:13px;margin-bottom:24px;">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${grievances.length} grievance(s)</p>
  ${rows}
</body>
</html>`
}

async function downloadPDF(htmlContent: string, filename: string) {
  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.left = '-9999px'
  iframe.style.width = '900px'
  iframe.style.height = '1200px'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }

  doc.open()
  doc.write(htmlContent)
  doc.close()

  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 800))

  const body = doc.body
  const canvas = await html2canvas(body, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 900,
    windowWidth: 900,
  })

  document.body.removeChild(iframe)

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * pageWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(filename)
}

export default function Reports() {
  const [grievanceIdInput, setGrievanceIdInput] = useState('')
  const [idError, setIdError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [loadingId, setLoadingId] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)

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

  const categories = PARENT_CATEGORIES

  const categoryData = categories.map(category => ({
    name: category,
    count: grievances.filter(g => getParentCategory(g) === category).length
  })).filter(item => item.count > 0)

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

  // Fetch actions for a list of grievance UUIDs
  async function fetchActions(ids: string[]): Promise<Record<string, GrievanceAction[]>> {
    if (ids.length === 0) return {}
    const { data, error } = await supabase
      .from('grievance_actions')
      .select('*')
      .in('grievance_id', ids)
      .order('created_at', { ascending: true })
    if (error) return {}
    const map: Record<string, GrievanceAction[]> = {}
    for (const a of (data as GrievanceAction[])) {
      if (!map[a.grievance_id]) map[a.grievance_id] = []
      map[a.grievance_id].push(a)
    }
    return map
  }

  // Download individual grievance by ID
  const handleDownloadById = async () => {
    setIdError('')
    const id = grievanceIdInput.trim().toUpperCase()
    if (!id) { setIdError('Please enter a Grievance ID'); return }
    const found = grievances.find(g => g.grievance_id === id)
    if (!found) { setIdError(`No grievance found with ID: ${id}`); return }
    setLoadingId(true)
    const actionsMap = await fetchActions([found.id])
    const html = generateHTMLReport([found], actionsMap, `Grievance Report — ${id}`)
    await downloadPDF(html, `${id}.pdf`)
    setLoadingId(false)
  }

  // Download report by date range
  const handleDownloadByDate = async () => {
    setDateError('')
    if (!fromDate || !toDate) { setDateError('Please select both From and To dates'); return }
    const from = new Date(fromDate)
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    if (from > to) { setDateError('From date must be before To date'); return }
    const filtered = grievances.filter(g => {
      const d = new Date(g.created_at)
      return d >= from && d <= to
    })
    if (filtered.length === 0) { setDateError('No grievances found in this date range'); return }
    setLoadingDate(true)
    const actionsMap = await fetchActions(filtered.map(g => g.id))
    const html = generateHTMLReport(filtered, actionsMap, `Grievance Report — ${fromDate} to ${toDate}`)
    await downloadPDF(html, `grievances_${fromDate}_to_${toDate}.pdf`)
    setLoadingDate(false)
  }

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Download Section */}
      <div className="grid grid-cols-2 gap-6 mb-8">

        {/* Download by Grievance ID */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Download by Grievance ID</h2>
          <p className="text-sm text-gray-500 mb-4">
            Downloads full report including description, images, and progress history
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. GRV-000001"
              value={grievanceIdInput}
              onChange={e => { setGrievanceIdInput(e.target.value); setIdError('') }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleDownloadById}
              disabled={loadingId}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loadingId ? 'Loading...' : '⬇ Download'}
            </button>
          </div>
          {idError && <p className="text-red-500 text-sm mt-2">{idError}</p>}
        </div>

        {/* Download by Date Range */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Download by Date Range</h2>
          <p className="text-sm text-gray-500 mb-4">
            Downloads all grievances in the date range with full details and progress
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setDateError('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setDateError('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleDownloadByDate}
              disabled={loadingDate}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loadingDate ? 'Loading...' : '⬇ Download'}
            </button>
          </div>
          {dateError && <p className="text-red-500 text-sm mt-2">{dateError}</p>}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} interval={0} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Grievances</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{grievances.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Active Cases</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {grievances.filter(g => g.status !== 'Resolved' && g.status !== 'Closed' && g.status !== 'Rejected').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {grievances.filter(g => g.status === 'Resolved' || g.status === 'Closed').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Resolution Rate</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {grievances.length > 0
              ? Math.round((grievances.filter(g => g.status === 'Resolved' || g.status === 'Closed').length / grievances.length) * 100)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  )
}
