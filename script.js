// ===== SUPABASE CLIENT =====
const _sbClient = (() => {
  const { createClient } = supabase;
  return createClient(
    'https://kwgdjagjpqrkcyrehcyh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Z2RqYWdqcHFya2N5cmVoY3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzk1NDUsImV4cCI6MjA5Mzk1NTU0NX0.DxmxvyMjlivZbnCmECZZxEP8lYAso33lRXFXdtcklH8'
  );
})();

// ===== PARTICLE CANVAS BACKGROUND =====
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['rgba(0,229,255,', 'rgba(124,58,237,', 'rgba(236,72,153,'];

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function createParticle() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: rand(0, W), y: rand(0, H),
      r: rand(0.8, 2.2),
      vx: rand(-0.18, 0.18), vy: rand(-0.22, 0.08),
      alpha: rand(0.25, 0.75),
      color
    };
  }

  for (let i = 0; i < 90; i++) particles.push(createParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        Object.assign(p, createParticle(), { x: rand(0, W), y: H + 5 });
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===== NAVBAR SCROLL SHADOW =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== MOBILE HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ===== BOOKING FORM (Formspree) =====
const bookingForm = document.getElementById('bookingForm');
const bookingNote = document.getElementById('bookingNote');

// Set minimum date to today
const dateInput = document.getElementById('b-date');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = bookingForm.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Sending…';
  btn.disabled = true;

  // Capture form data before reset
  const formData = new FormData(bookingForm);
  const bookingEntry = {
    name:      formData.get('name')           || '',
    phone:     formData.get('phone')          || '',
    device:    formData.get('device')         || '',
    service:   formData.get('service')        || '',
    date:      formData.get('preferred_date') || '',
    time:      formData.get('preferred_time') || '',
    notes:     formData.get('notes')          || '',
    source:    'Website Form',
    status:    'pending'
  };

  try {
    const response = await fetch('https://formspree.io/f/maqvljoq', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      bookingNote.textContent = '✓ Appointment request sent! We\'ll confirm via call or message soon.';
      bookingNote.style.color = '#16a34a';
      bookingForm.reset();

      // Save to Supabase
      _sbClient.from('bookings').insert({
        name:    bookingEntry.name,
        phone:   bookingEntry.phone,
        device:  bookingEntry.device,
        service: bookingEntry.service,
        date:    bookingEntry.date    || null,
        time:    bookingEntry.time    || null,
        notes:   bookingEntry.notes,
        source:  bookingEntry.source,
        status:  bookingEntry.status
      }).then(({ error }) => { if (error) console.warn('Booking save error:', error.message); });

    } else {
      bookingNote.textContent = 'Something went wrong. Please message us on Facebook or WhatsApp.';
      bookingNote.style.color = '#dc2626';
    }
  } catch {
    bookingNote.textContent = 'Connection error. Please message us on Facebook or WhatsApp.';
    bookingNote.style.color = '#dc2626';
  }

  btn.textContent = originalText;
  btn.disabled = false;
});

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    // Close all open items
    document.querySelectorAll('.faq-q').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.classList.remove('open');
    });
    // Open the clicked item if it was previously closed
    if (!isOpen) {
      btn.setAttribute('aria-expanded', 'true');
      btn.nextElementSibling.classList.add('open');
    }
  });
});

// ===== SCROLL REVEAL (simple fade-in on scroll) =====
const revealEls = document.querySelectorAll(
  '.service-card, .why-card, .about-badge, .contact-item, .testimonial-card, .faq-item, .booking-form, .pricing-card, .contact-form'
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// ===== SCROLL TO TOP =====
const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== CONTACT QUICK INQUIRY FORM =====
const contactForm = document.getElementById('contactForm');
const contactNote = document.getElementById('contactNote');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const formData = new FormData(contactForm);
    const inquiryEntry = {
      name:    formData.get('name')    || '',
      phone:   formData.get('contact') || '',
      device:  '—',
      service: 'Quick Inquiry',
      notes:   formData.get('message') || '',
      source:  'Website Form',
      status:  'pending'
    };

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        contactNote.textContent = '✓ Message sent! We\'ll get back to you soon.';
        contactNote.style.color = '#16a34a';
        contactForm.reset();

        // Save to Supabase
        _sbClient.from('bookings').insert({
          name:    inquiryEntry.name,
          phone:   inquiryEntry.phone,
          device:  inquiryEntry.device,
          service: inquiryEntry.service,
          date:    null,
          time:    null,
          notes:   inquiryEntry.notes,
          source:  inquiryEntry.source,
          status:  inquiryEntry.status
        }).then(({ error }) => { if (error) console.warn('Inquiry save error:', error.message); });

      } else {
        contactNote.textContent = 'Something went wrong. Please message us on Facebook.';
        contactNote.style.color = '#dc2626';
      }
    } catch {
      contactNote.textContent = 'Connection error. Please message us on Facebook.';
      contactNote.style.color = '#dc2626';
    }

    btn.textContent = originalText;
    btn.disabled = false;
  });
}

