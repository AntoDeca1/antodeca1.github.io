'use strict';

const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themePreference = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme || (themePreference.matches ? 'dark' : 'light');
function updateThemeControl() {
  const dark = currentTheme() === 'dark';
  themeToggle.textContent = dark ? 'Light' : 'Dark';
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
}
themeToggle.hidden = false;
updateThemeControl();
themeToggle.addEventListener('click', () => {
  root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('portfolio-theme', root.dataset.theme); } catch (_) {}
  updateThemeControl();
});
themePreference.addEventListener('change', updateThemeControl);

const navigationLinks = [...document.querySelectorAll('.nav-links a')];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    navigationLinks.forEach(link => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
}, { rootMargin: '-15% 0px -65% 0px' });
document.querySelectorAll('main > section').forEach(section => observer.observe(section));

const dateLabel = value => new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const dayLabel = day => `${day.count === 0 ? 'No' : day.count.toLocaleString('en')} ${day.count === 1 ? 'contribution' : 'contributions'} on ${dateLabel(day.date)}`;
const loading = document.querySelector('#calendar-loading');

function renderCalendar(data) {
  if (!Array.isArray(data.days) || data.days.length < 365 || !Number.isInteger(data.total) || data.total < 0) throw new Error('Incomplete calendar');
  const dates = new Set();
  data.days.forEach(day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || dates.has(day.date) || !Number.isInteger(day.count) || day.count < 0 || !Number.isInteger(day.level) || day.level < 0 || day.level > 4) throw new Error('Invalid calendar day');
    dates.add(day.date);
  });
  const calendar = document.querySelector('#calendar');
  const firstWeekday = new Date(`${data.days[0].date}T12:00:00Z`).getUTCDay();
  const weeks = Math.ceil((firstWeekday + data.days.length) / 7);
  calendar.style.setProperty('--weeks', weeks);
  const months = document.createElement('div');
  months.className = 'calendar-months';
  months.setAttribute('aria-hidden', 'true');
  let previousMonth = -1;
  for (let week = 0; week < weeks; week++) {
    const day = data.days[Math.max(0, week * 7 - firstWeekday)];
    if (!day) continue;
    const date = new Date(`${day.date}T12:00:00Z`);
    if (date.getUTCMonth() !== previousMonth) {
      const label = document.createElement('span');
      label.textContent = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date);
      label.style.gridColumn = `${week + 1} / span ${Math.min(3, weeks - week)}`;
      months.append(label);
      previousMonth = date.getUTCMonth();
    }
  }
  const weekdays = document.createElement('div');
  weekdays.className = 'calendar-weekdays';
  weekdays.setAttribute('aria-hidden', 'true');
  ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(text => {
    const label = document.createElement('span'); label.textContent = text; weekdays.append(label);
  });
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'GitHub contributions. Arrow keys move between days; Home and End jump to the first and last day.');
  grid.setAttribute('aria-rowcount', weeks);
  grid.setAttribute('aria-colcount', 7);
  const buttons = [];
  for (let week = 0; week < weeks; week++) {
    const column = document.createElement('div');
    column.className = 'calendar-week';
    column.setAttribute('role', 'row');
    column.setAttribute('aria-rowindex', week + 1);
    for (let weekday = 0; weekday < 7; weekday++) {
      const index = week * 7 + weekday - firstWeekday;
      const day = data.days[index];
      if (!day) {
        const empty = document.createElement('span'); empty.className = 'calendar-empty'; empty.setAttribute('aria-hidden', 'true'); column.append(empty); continue;
      }
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'calendar-day'; button.dataset.level = day.level; button.dataset.date = day.date;
      button.setAttribute('role', 'gridcell'); button.setAttribute('aria-colindex', weekday + 1); button.setAttribute('aria-label', dayLabel(day)); button.title = dayLabel(day);
      button.tabIndex = index === data.days.length - 1 ? 0 : -1;
      const describe = () => { document.querySelector('#day-detail').textContent = dayLabel(day); };
      button.addEventListener('pointerenter', describe);
      button.addEventListener('focus', describe);
      button.addEventListener('click', () => { buttons.forEach(item => { item.tabIndex = -1; }); button.tabIndex = 0; describe(); });
      button.addEventListener('keydown', event => {
        const offsets = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
        let target;
        if (event.key in offsets) target = Math.max(0, Math.min(data.days.length - 1, index + offsets[event.key]));
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = data.days.length - 1;
        else return;
        event.preventDefault();
        buttons.forEach(item => { item.tabIndex = -1; }); buttons[target].tabIndex = 0; buttons[target].focus();
      });
      column.append(button); buttons.push(button);
    }
    grid.append(column);
  }
  calendar.replaceChildren(months, weekdays, grid);
  document.querySelector('#contribution-total').textContent = `${data.total.toLocaleString('en')} contributions in the last year`;
  document.querySelector('#activity-period').textContent = `${dateLabel(data.startDate)} – ${dateLabel(data.endDate)}`;
  const updated = new Date(data.updatedAt);
  if (Number.isNaN(updated.getTime())) throw new Error('Invalid update date');
  const updateLabel = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(updated);
  const stale = Date.now() - updated.getTime() > 3 * 24 * 60 * 60 * 1000;
  document.querySelector('#activity-update').textContent = `${stale ? 'Last available snapshot' : 'Updated'} ${updateLabel}. ${stale ? 'See GitHub for the latest activity.' : 'Refreshed daily from GitHub’s public calendar.'}`;
  loading.hidden = true; calendar.hidden = false;
  // On narrow screens, show the most recent weeks first while preserving native scrolling.
  const scroll = document.querySelector('#calendar-scroll');
  scroll.scrollLeft = scroll.scrollWidth;
}

fetch('data/contributions.json', { cache: 'no-cache' })
  .then(response => { if (!response.ok) throw new Error('Calendar unavailable'); return response.json(); })
  .then(renderCalendar)
  .catch(() => {
    loading.textContent = 'The calendar is unavailable. View the latest activity on GitHub.';
    document.querySelector('#day-detail').textContent = '';
    document.querySelector('#activity-update').textContent = 'Use the GitHub link above to see current contributions.';
  });
