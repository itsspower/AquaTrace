export type Page = 'dashboard' | 'reports' | 'water-points' | 'details'

export interface IncidentUpdate {
  time: string
  title: string
  description: string
}

export interface Incident {
  id: string
  title: string
  area: string
  reported: string
  severity: 'High' | 'Medium' | 'Low'
  status: 'Investigating' | 'Monitoring' | 'Resolved'
  description: string
  statusDescription: string
  updates: IncidentUpdate[]
}

export interface WaterPoint {
  id: string
  name: string
  area: string
  sourceType: 'Community tap' | 'Borehole' | 'Water tanker'
  availability: 'Listed' | 'Limited' | 'Unavailable'
  lastVerified: string
}

export const incidents: Incident[] = [
  {
    id: 'sample-001',
    title: 'Intermittent water supply',
    area: 'Mamelodi East, Tshwane',
    reported: 'Today, 09:20',
    severity: 'High',
    status: 'Investigating',
    description: 'Residents in this sample report area have described intermittent water supply since early morning. The source and extent of the issue have not been confirmed.',
    statusDescription: 'A sample report has been logged. No investigation or municipal response is represented by this demonstration status.',
    updates: [
      { time: 'Today · 09:20', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Today · 09:35', title: 'Status set to investigating', description: 'Illustrative status only. No real-world verification has taken place.' },
    ],
  },
  {
    id: 'sample-002',
    title: 'Low water pressure reported',
    area: 'Soweto, Johannesburg',
    reported: 'Today, 08:05',
    severity: 'Medium',
    status: 'Monitoring',
    description: 'A sample report describes lower-than-usual water pressure in the area. This example is not an independently verified community report.',
    statusDescription: 'This sample is shown as being monitored to demonstrate the interface. It does not indicate a live monitoring process.',
    updates: [
      { time: 'Today · 08:05', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Today · 08:40', title: 'Status set to monitoring', description: 'Illustrative status only. No real-world verification has taken place.' },
    ],
  },
  {
    id: 'sample-003',
    title: 'Unplanned supply interruption',
    area: 'Paarl, Drakenstein',
    reported: 'Yesterday, 16:45',
    severity: 'High',
    status: 'Investigating',
    description: 'This fictional report represents an unplanned supply interruption. No current outage or affected residents are confirmed.',
    statusDescription: 'A sample report has been logged. No investigation or municipal response is represented by this demonstration status.',
    updates: [
      { time: 'Yesterday · 16:45', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Yesterday · 17:10', title: 'Status set to investigating', description: 'Illustrative status only. No real-world verification has taken place.' },
    ],
  },
  {
    id: 'sample-004',
    title: 'Supply interruption (sample resolved)',
    area: 'KwaMashu, eThekwini',
    reported: '22 Oct, 11:30',
    severity: 'Low',
    status: 'Resolved',
    description: 'A fictional, resolved example included to show how completed reports appear. This does not confirm that a real interruption occurred.',
    statusDescription: 'Resolved is an illustrative sample state, not a real-world service restoration confirmation.',
    updates: [
      { time: '22 Oct · 11:30', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: '22 Oct · 14:00', title: 'Marked resolved (sample)', description: 'Illustrative status only. No real-world verification has taken place.' },
    ],
  },
]

export const waterPoints: WaterPoint[] = [
  { id: 'point-001', name: 'Mamelodi Community Tap', area: 'Mamelodi East, Tshwane', sourceType: 'Community tap', availability: 'Listed', lastVerified: 'Sample only' },
  { id: 'point-002', name: 'Jabulani Community Borehole', area: 'Soweto, Johannesburg', sourceType: 'Borehole', availability: 'Limited', lastVerified: 'Sample only' },
  { id: 'point-003', name: 'Paarl Central Water Tanker', area: 'Paarl, Drakenstein', sourceType: 'Water tanker', availability: 'Listed', lastVerified: 'Sample only' },
  { id: 'point-004', name: 'KwaMashu Public Tap', area: 'KwaMashu, eThekwini', sourceType: 'Community tap', availability: 'Unavailable', lastVerified: 'Sample only' },
]
