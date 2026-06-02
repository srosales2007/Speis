// Carousel controls
document.querySelectorAll('[data-carousel]').forEach(c => {
  const track = c.querySelector('[data-track]');
  const prev  = c.querySelector('.prev');
  const next  = c.querySelector('.next');
  if (!track) return;

  const step = () => {
    const first = track.querySelector('.card');
    if (!first) return 320;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || 24) || 24;
    return first.getBoundingClientRect().width + gap;
  };

  prev && prev.addEventListener('click', () => track.scrollBy({left: -step(), behavior:'smooth'}));
  next && next.addEventListener('click', () => track.scrollBy({left:  step(), behavior:'smooth'}));
});

// Testimonial dots (purely visual)
document.querySelectorAll('.dots').forEach(group => {
  group.querySelectorAll('.dot').forEach(d => {
    d.addEventListener('click', () => {
      group.querySelectorAll('.dot').forEach(x => x.classList.remove('active'));
      d.classList.add('active');
    });
  });
});
