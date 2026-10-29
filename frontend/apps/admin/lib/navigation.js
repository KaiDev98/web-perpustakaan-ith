const navigation = [
  { label: 'Ringkasan Permohonan', icon: '◫', permission: 'requests.summary.read' },
  { label: 'Form Pustakawan', icon: '◇', permission: 'requests.literacy.read' },
  { label: 'Daftar Pemohon', icon: '□', permission: 'requests.clearance.read' },
  { label: 'Konten dan Profil', icon: '▤', permission: 'content.read' },
  { label: 'Berita', icon: '▧', permission: 'content.manage' },
  { label: 'Menu', icon: '☷', permission: 'navigation.read' },
  { label: 'Sumber Digital', icon: '◈', permission: 'resources.read' },
  { label: 'Media dan Panduan', icon: '▥', permission: 'media.read' },
  { label: 'Pengaturan', icon: '⚙', permission: 'settings.read' },
  { label: 'Akun Administrator', icon: '♙', permission: 'users.read' },
  { label: 'Audit Log', icon: '◎', permission: 'audit.read' },
];

export function navigationForPermissions(permissions) {
  const allowed = new Set(permissions);
  return navigation.filter((item) => allowed.has(item.permission));
}
