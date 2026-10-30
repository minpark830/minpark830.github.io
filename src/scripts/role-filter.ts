/**
 * The project filter. Choosing a role hides projects that don't involve it,
 * notes where else on the page that kind of work appears, and keeps the
 * choice in the address (?for=controls) so a link can open the page filtered.
 */
export function mountRoleFilter(): void {
  const filter = document.getElementById('role-filter');
  const noteEl = document.getElementById('role-note');
  if (!(filter instanceof HTMLFieldSetElement) || !noteEl) return;
  const note: HTMLElement = noteEl;

  const notes = JSON.parse(filter.dataset['notes'] ?? '{}') as Record<string, string>;
  const radios = [...filter.querySelectorAll<HTMLInputElement>('input[name="for"]')];
  const items = [...document.querySelectorAll<HTMLElement>('#projects [data-roles]')];
  const more = document.getElementById('more-projects');
  const labelOf = (role: string) =>
    radios.find((r) => r.value === role)?.parentElement?.querySelector('span')?.textContent ?? role;

  function apply(role: string, announce: boolean): void {
    let shown = 0;
    for (const item of items) {
      const match = !role || (item.dataset['roles'] ?? '').split(' ').includes(role);
      item.hidden = !match;
      if (match && item.tagName === 'ARTICLE') shown++;
    }
    if (more) more.hidden = !items.some((i) => i.tagName === 'LI' && !i.hidden);

    const rows = items.filter((i) => i.tagName === 'LI' && !i.hidden).length;
    const total = shown + rows;
    note.textContent = role
      ? `Showing ${total} ${total === 1 ? 'project' : 'projects'} for ${labelOf(role).toLowerCase()} roles. ${notes[role] ?? ''}`
      : announce
        ? 'Showing all projects.'
        : '';
  }

  function choose(role: string, announce: boolean): void {
    const run = () => apply(role, announce);
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Animate cards into their new places where the browser supports it.
    if (announce && motion && 'startViewTransition' in document) document.startViewTransition(run);
    else run();
  }

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const url = new URL(window.location.href);
      if (radio.value) url.searchParams.set('for', radio.value);
      else url.searchParams.delete('for');
      history.replaceState(history.state, '', url);
      choose(radio.value, true);
    });
  }

  const requested = new URLSearchParams(window.location.search).get('for') ?? '';
  const initial = radios.find((r) => r.value === requested && requested !== '');
  if (initial) {
    initial.checked = true;
    choose(initial.value, false);
  }
  filter.hidden = false;
}
