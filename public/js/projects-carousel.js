document.addEventListener('DOMContentLoaded', function () {
  var track = document.getElementById('carousel-track')
  var frame = document.getElementById('project-frame')
  var prevBtn = document.getElementById('arrow-prev')
  var nextBtn = document.getElementById('arrow-next')
  var titleEl = document.getElementById('carousel-title')

  if (!track || !frame || !prevBtn || !nextBtn) return

  var cards = track.querySelectorAll('.carousel-card')
  if (cards.length === 0) return

  var currentIndex = 0

  function goTo(index) {
    if (index < 0) index = cards.length - 1
    if (index >= cards.length) index = 0
    currentIndex = index

    cards.forEach(function (c) { c.classList.remove('selected') })
    var card = cards[currentIndex]
    card.classList.add('selected')

    var embedHref = card.getAttribute('data-embed')
    if (embedHref) frame.src = embedHref

    var title = card.querySelector('.carousel-card-title')
    if (title && titleEl) titleEl.textContent = title.textContent

    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  cards.forEach(function (card, i) {
    card.addEventListener('click', function () { goTo(i) })
  })

  prevBtn.addEventListener('click', function () { goTo(currentIndex - 1) })
  nextBtn.addEventListener('click', function () { goTo(currentIndex + 1) })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1)
    if (e.key === 'ArrowRight') goTo(currentIndex + 1)
  })

  goTo(0)
})
