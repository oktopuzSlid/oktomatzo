document.addEventListener('DOMContentLoaded', function () {
  var track = document.getElementById('carousel-track')
  var previewArea = document.getElementById('preview-area')
  var previewContent = document.getElementById('preview-content')

  if (!track || !previewArea || !previewContent) return

  var cards = track.querySelectorAll('.carousel-card')
  if (cards.length === 0) return

  function selectCard(card) {
    cards.forEach(function (c) { c.classList.remove('selected') })
    card.classList.add('selected')

    var slug = card.getAttribute('data-slug')
    var title = card.querySelector('.carousel-card-title')
    var description = card.getAttribute('data-description') || ''
    var iconEl = card.querySelector('.carousel-card-icon')

    // Scroll card into view
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })

    // Update preview
    previewArea.classList.add('has-preview')
    previewContent.innerHTML =
      '<div class="preview-icon">' + (iconEl ? iconEl.innerHTML : '') + '</div>' +
      '<h2 class="preview-title">' + (title ? title.textContent : '') + '</h2>' +
      '<p class="preview-description">' + description + '</p>' +
      '<a href="' + slug + '" class="btn btn-primary">Launch Project</a>'
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () { selectCard(card) })
  })

  selectCard(cards[0])
})
