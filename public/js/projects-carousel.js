document.addEventListener('DOMContentLoaded', function () {
  var track = document.getElementById('carousel-track')
  var frame = document.getElementById('project-frame')
  if (!track || !frame) return

  var cards = track.querySelectorAll('.carousel-card')
  if (cards.length === 0) return

  function selectCard(card) {
    cards.forEach(function (c) { c.classList.remove('selected') })
    card.classList.add('selected')

    var href = card.getAttribute('data-href')
    if (href) {
      frame.src = href
    }

    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () { selectCard(card) })
  })

  selectCard(cards[0])
})
