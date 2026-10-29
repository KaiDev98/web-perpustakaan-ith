const navigation = [
  { label: 'Ringkasan Permohonan', icon: '◫', permission: 'requests.summary.read', href: '#layanan' },
  { label: 'Form Pustakawan', icon: '◇', permission: 'requests.literacy.read', href: '#requests-literacy' },
  { label: 'Daftar Pemohon', icon: '□', permission: 'requests.clearance.read', href: '#requests-clearance' },
  { label: 'Konten dan Profil', icon: '▤', permission: 'content.read', href: '#cms-contents' },
  { label: 'Menu', icon: '☷', permission: 'navigation.read', href: '#cms-menu' },
  { label: 'Sumber Digital', icon: '◈', permission: 'resources.read', href: '#cms-resources' },
  { label: 'Slider', icon: '▧', permission: 'slides.read', href: '#cms-slides' },
  { label: 'Media', icon: '▥', permission: 'media.read', href: '#cms-media' },
  { label: 'Pengaturan', icon: '⚙', permission: 'settings.read', href: '#cms-settings' },
];

export function navigationForPermissions(permissions) {
  const allowed = new Set(permissions);
  return navigation.filter((item) => allowed.has(item.permission));
}
