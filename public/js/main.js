document.addEventListener('DOMContentLoaded', function () {
  var footer = document.querySelector('.site-footer .container')
  if (!footer) return
  var p = footer.querySelector('p')
  if (!p) return

  var dot = document.createElement('span')
  dot.style.display = 'inline-block'
  dot.style.width = '7px'; dot.style.height = '7px'; dot.style.borderRadius = '50%'
  dot.style.marginLeft = '10px'; dot.style.verticalAlign = 'middle'
  dot.style.backgroundColor = '#5a5a6a'

  var label = document.createElement('span')
  label.style.marginLeft = '4px'; label.style.fontSize = '0.75rem'; label.style.color = '#5a5a6a'
  label.textContent = 'checking...'

  p.appendChild(dot); p.appendChild(label)

  fetch('/api/health').then(function (r) { return r.json() }).then(function () {
    dot.style.backgroundColor = '#10b981'; label.textContent = 'live'
  }).catch(function () {
    dot.style.backgroundColor = '#ef4444'; label.textContent = 'offline'
  })
})
