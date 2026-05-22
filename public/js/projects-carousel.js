document.addEventListener('DOMContentLoaded', function () {
  var frame = document.getElementById('project-frame')
  var track = document.getElementById('strip-track')
  var prev = document.getElementById('arrow-prev')
  var next = document.getElementById('arrow-next')
  if (!frame || !track || !prev || !next) return

  var cards = track.querySelectorAll('.strip-card')
  if (!cards.length) return

  var current = 0

  function select(i) {
    if (i < 0) i = cards.length - 1
    if (i >= cards.length) i = 0
    current = i

    cards.forEach(function (c) { c.classList.remove('active') })
    var card = cards[current]
    card.classList.add('active')

    var href = card.getAttribute('data-href')
    if (href) frame.src = href

    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  cards.forEach(function (c, i) {
    c.addEventListener('click', function () { select(i) })
  })

  prev.addEventListener('click', function () { select(current - 1) })
  next.addEventListener('click', function () { select(current + 1) })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') select(current - 1)
    if (e.key === 'ArrowRight') select(current + 1)
  })

  select(0)
})
