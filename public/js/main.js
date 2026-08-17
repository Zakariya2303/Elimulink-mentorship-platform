// Navbar shadow on scroll
window.addEventListener('scroll', function () {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile sidebar toggle (dashboard pages)
const sidebarOpen    = document.getElementById('sidebarOpen');
const sidebarClose   = document.getElementById('sidebarClose');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  if (sidebar)        sidebar.classList.add('open');
  if (sidebarOverlay) sidebarOverlay.classList.add('show');
}

function closeSidebar() {
  if (sidebar)        sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('show');
}

if (sidebarOpen)    sidebarOpen.addEventListener('click', openSidebar);
if (sidebarClose)   sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  });
});