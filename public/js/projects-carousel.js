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
    if (cards.length === 0) return
    if (i < 0) i = cards.length - 1
    if (i >= cards.length) i = 0
    current = i

    for (var c = 0; c < cards.length; c++) cards[c].classList.remove('active')
    cards[current].classList.add('active')

    var href = cards[current].getAttribute('data-href')
    if (href) frame.src = href

    cards[current].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener('click', function (idx) { return function () { select(idx) } }(i))
  }

  prev.addEventListener('click', function () { select(current - 1) })
  next.addEventListener('click', function () { select(current + 1) })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') select(current - 1)
    if (e.key === 'ArrowRight') select(current + 1)
  })

  select(0)
})
