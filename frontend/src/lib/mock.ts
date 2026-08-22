import type {
  Package, Service, StudioSettings,
} from './types'

export function buildSeed() {
  const services: Service[] = [
    { id: 'svc-portrait', name: 'Portrait package', durationMin: 60 },
    { id: 'svc-maternity', name: 'Maternity package', durationMin: 60 },
    { id: 'svc-family', name: 'Family package', durationMin: 60 },
    { id: 'svc-headshots', name: 'Headshot package', durationMin: 60 },
    { id: 'svc-birthday', name: 'Birthday package', durationMin: 60, isBirthday: true },
  ]

  const packages: Package[] = []

  const settings: StudioSettings = {
    studioName: 'AG Studio',
    phone: '+31 20 123 4567',
    address: 'Westerstraat 12, Amsterdam',
    hours: [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], open: '09:00', close: '18:00' }],
    backupAt: 'Today 03:00',
    allowDoubleBooking: true,
    cameraCount: 2,
  }

  const currentUser = {
    name: 'Biruk',
    role: 'cameraman',
    initials: 'BR',
  }

  return { services, packages, settings, currentUser }
}
